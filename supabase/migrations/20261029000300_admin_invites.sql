-- =============================================================================
-- 20261029000300 — Invite admins by email (founder, 2026-10-29)
--
-- An admin enters a name, an email and a role. The app emails a Hebrew invitation with a
-- link to /invite/admin/<token> (SMTP settings in the app's environment). The invitee signs
-- in or signs up as usual (SMS code or Google) and accepts. Existing users with that email
-- also get an in-app notice. Invitations expire after 7 days.
-- =============================================================================

create table public.admin_invites (
  id          uuid primary key default gen_random_uuid(),
  email       extensions.citext not null check (position('@' in email) > 1),
  full_name   text not null check (char_length(full_name) between 2 and 120),
  role        public.admin_role not null default 'admin',
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by  uuid references public.profiles (id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null
);
create unique index admin_invites_one_pending on public.admin_invites (email) where status = 'pending';
alter table public.admin_invites enable row level security;
create policy "admins see invites" on public.admin_invites for select to authenticated using (public.is_admin('admin'));
grant select on public.admin_invites to authenticated;

-- Create (or renew) an invitation. Returns the token for the email link.
create or replace function public.admin_create_invite(p_email text, p_full_name text, p_role public.admin_role default 'admin')
returns table (token text, existing_user boolean)
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_email text := lower(trim(coalesce(p_email, ''))); v_token text;
        v_user uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.raise_app_error('invalid_email'); end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 then perform public.raise_app_error('name_required'); end if;
  select p.id into v_user from public.profiles p
    left join auth.users u on u.id = p.id
   where lower(p.email::text) = v_email or lower(u.email) = v_email
   limit 1;
  if v_user is not null and exists (select 1 from public.admins where user_id = v_user) then
    perform public.raise_app_error('already_admin');
  end if;
  update public.admin_invites set status = 'revoked' where email = v_email and status = 'pending';
  insert into public.admin_invites (email, full_name, role, invited_by)
  values (v_email, trim(p_full_name), coalesce(p_role, 'admin'), v_admin)
  returning admin_invites.token into v_token;
  if v_user is not null then
    perform private.notify(v_user, 'admin_invite', jsonb_build_object('token', v_token, 'role', coalesce(p_role, 'admin')));
  end if;
  perform private.audit('admin_invited', 'admin_invite', v_email, null, jsonb_build_object('role', p_role));
  return query select v_token, v_user is not null;
end $$;

create or replace function public.admin_revoke_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin');
begin
  update public.admin_invites set status = 'revoked' where id = p_invite and status = 'pending';
  if not found then perform public.raise_app_error('not_found'); end if;
  perform private.audit('admin_invite_revoked', 'admin_invite', p_invite::text);
end $$;

-- What the invitation page shows (the token is the secret). Email is partly masked.
create or replace function public.get_admin_invite(p_token text)
returns table (full_name text, role public.admin_role, status text, expired boolean, email_hint text, inviter text)
language sql stable security definer set search_path = '' as $$
  select i.full_name, i.role, i.status, i.expires_at < now(),
         left(i.email::text, 2) || '•••' || substr(i.email::text, position('@' in i.email::text)),
         (select full_name from public.profiles where id = i.invited_by)
    from public.admin_invites i where i.token = p_token
$$;

-- Accept: the link (sent only to the invited inbox) is the proof. The account must have
-- finished sign-up (phone by SMS, or Google). If the account has no email yet, it gets
-- the invited one.
create or replace function public.accept_admin_invite(p_token text)
returns public.admin_role language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); i public.admin_invites;
begin
  if not public.identity_verified(v_uid) then perform public.raise_app_error('phone_not_verified'); end if;
  select * into i from public.admin_invites where token = p_token for update;
  if i.id is null then perform public.raise_app_error('invite_invalid'); end if;
  if i.status <> 'pending' then perform public.raise_app_error('invite_used'); end if;
  if i.expires_at < now() then perform public.raise_app_error('invite_expired'); end if;
  if exists (select 1 from public.profiles where id = v_uid and is_demo) then perform public.raise_app_error('demo_mismatch'); end if;
  insert into public.admins (user_id, role) values (v_uid, i.role)
  on conflict (user_id) do update set role = excluded.role;
  update public.profiles set email = i.email where id = v_uid and email is null;
  update public.admin_invites set status = 'accepted', accepted_at = now(), accepted_by = v_uid where id = i.id;
  if i.invited_by is not null then
    perform private.notify(i.invited_by, 'admin_invite_accepted',
      jsonb_build_object('name', (select full_name from public.profiles where id = v_uid), 'email', i.email::text));
  end if;
  perform private.audit('admin_invite_accepted', 'admin_invite', i.email::text, null, jsonb_build_object('user', v_uid, 'role', i.role));
  return i.role;
end $$;

-- Remove another admin (never yourself, so there is always at least one).
create or replace function public.admin_remove_admin(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin');
begin
  if p_user = v_admin then perform public.raise_app_error('cannot_remove_self'); end if;
  delete from public.admins where user_id = p_user;
  if not found then perform public.raise_app_error('not_found'); end if;
  perform private.audit('admin_removed', 'admin', p_user::text);
end $$;

revoke all on function public.admin_create_invite(text, text, public.admin_role), public.admin_revoke_invite(uuid),
  public.accept_admin_invite(text), public.admin_remove_admin(uuid) from public, anon;
grant execute on function public.admin_create_invite(text, text, public.admin_role), public.admin_revoke_invite(uuid),
  public.accept_admin_invite(text), public.admin_remove_admin(uuid) to authenticated, service_role;
revoke all on function public.get_admin_invite(text) from public;
grant execute on function public.get_admin_invite(text) to anon, authenticated, service_role;

-- The admins screen: who is an admin now.
create or replace function public.admin_list_admins()
returns table (user_id uuid, full_name text, email text, role public.admin_role, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.user_id, p.full_name, coalesce(p.email::text, u.email), a.role, a.created_at
    from public.admins a join public.profiles p on p.id = a.user_id left join auth.users u on u.id = a.user_id
   where public.is_admin('admin')
   order by a.created_at
$$;
revoke all on function public.admin_list_admins() from public, anon;
grant execute on function public.admin_list_admins() to authenticated, service_role;
