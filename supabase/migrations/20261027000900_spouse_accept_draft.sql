-- =============================================================================
-- Joby MVP · 0900 · Spouse invite: accept even after choosing "offer services"
-- A spouse may tick "offer services" during sign-up (creating a draft reservist
-- profile) before opening the invite link. If that draft never submitted any
-- verification, accepting the invite converts it into a spouse profile.
-- =============================================================================
create or replace function public.accept_spouse_invite(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); l public.spouse_links; v_name text; pp public.provider_profiles;
begin
  select * into l from public.spouse_links where invite_token = p_token for update;
  if l.id is null or l.status <> 'invited' then perform public.raise_app_error('invite_invalid'); end if;
  if l.expires_at < now() then
    update public.spouse_links set status = 'expired' where id = l.id;
    perform public.raise_app_error('invite_expired');
  end if;
  if l.reservist_id = v_uid then perform public.raise_app_error('invite_invalid'); end if;

  select * into pp from public.provider_profiles where user_id = v_uid;
  if pp.user_id is not null then
    if pp.provider_type = 'reservist' and pp.verification_status = 'draft'
       and not exists (select 1 from public.verification_requests where user_id = v_uid) then
      update public.provider_profiles set provider_type = 'spouse' where user_id = v_uid;
    else
      perform public.raise_app_error('already_provider');
    end if;
  else
    select full_name into v_name from public.profiles where id = v_uid;
    insert into public.provider_profiles (user_id, provider_type, display_name)
    values (v_uid, 'spouse', public.short_name(coalesce(v_name, l.invite_name)));
  end if;

  update public.spouse_links set spouse_user_id = v_uid, status = 'accepted' where id = l.id;
  update public.profiles set is_provider = true where id = v_uid;
end $$;

-- Read an invite by token (landing page), without exposing other invites.
create or replace function public.get_spouse_invite(p_token text)
returns table (status text, expires_at timestamptz, invite_name text, reservist_name text)
language sql stable security definer set search_path = '' as $$
  select l.status, l.expires_at, l.invite_name, pp.display_name
    from public.spouse_links l join public.provider_profiles pp on pp.user_id = l.reservist_id
   where l.invite_token = p_token
$$;
grant execute on function public.get_spouse_invite(text) to anon, authenticated;

-- Privacy: a provider may delete their own verification uploads that were never
-- submitted (removed before sending). Submitted documents are deleted by the server
-- after the admin decision.
create policy "delete own unsubmitted verification docs" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and not exists (select 1 from public.verification_requests v
                          where v.user_id = (select auth.uid()) and name = any (v.file_paths)));
