-- =============================================================================
-- 20261029000200 — Google sign-in needs no SMS code (founder, 2026-10-29)
--
-- An account is "identity verified" by a confirmed phone (SMS code) OR by Google.
-- Google users still give a mobile number once (required, not verified by code):
-- it is stored in profiles.contact_phone and used for contact sharing and WhatsApp.
-- =============================================================================

alter table public.profiles
  add column google_verified boolean not null default false,
  add column contact_phone text;
create unique index profiles_contact_phone_key on public.profiles (contact_phone) where contact_phone is not null;

-- Sync from auth.users: Google appears in raw_app_meta_data.providers.
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, phone_verified, email, full_name, google_verified)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null else '+' || ltrim(new.phone, '+') end,
    new.phone_confirmed_at is not null,
    nullif(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_app_meta_data -> 'providers' ? 'google', false)
  )
  on conflict (id) do update set
    phone           = excluded.phone,
    phone_verified  = excluded.phone_verified,
    email           = coalesce(excluded.email, public.profiles.email),
    full_name       = coalesce(public.profiles.full_name, excluded.full_name),
    google_verified = public.profiles.google_verified or excluded.google_verified;
  return new;
end $$;
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of phone, phone_confirmed_at, email, raw_app_meta_data on auth.users
  for each row execute function public.handle_auth_user();
update public.profiles p set google_verified = true
  from auth.users u where u.id = p.id and coalesce(u.raw_app_meta_data -> 'providers' ? 'google', false);

-- Phone confirmed by SMS, or signed in with Google.
create or replace function public.identity_verified(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select phone_verified or google_verified from public.profiles where id = p_user), false)
$$;

-- The number other people and WhatsApp use: the verified phone, else the one a Google user gave.
create or replace function public.reachable_phone(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(phone, contact_phone) from public.profiles where id = p_user
$$;

-- Google users give their mobile number once, without an SMS code.
create or replace function public.set_contact_phone(p_phone text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_phone text;
begin
  if not (select google_verified from public.profiles where id = v_uid) then
    perform public.raise_app_error('phone_not_verified');
  end if;
  v_phone := public.normalize_il_phone(p_phone);
  if v_phone is null then perform public.raise_app_error('invalid_phone'); end if;
  if exists (select 1 from public.profiles where id <> v_uid and (phone = v_phone or contact_phone = v_phone)) then
    perform public.raise_app_error('phone_taken');
  end if;
  update public.profiles set contact_phone = v_phone where id = v_uid;
  return v_phone;
end $$;

-- Same as before, with "identity verified" instead of "phone verified".
create or replace function public.complete_signup(p_full_name text, p_as_provider boolean, p_as_poster boolean,
                                                  p_marketing_opt_in boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  if not public.identity_verified(v_uid) then perform public.raise_app_error('phone_not_verified'); end if;
  if public.reachable_phone(v_uid) is null then perform public.raise_app_error('phone_required'); end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 then perform public.raise_app_error('name_required'); end if;
  update public.profiles
     set full_name = case when exists (select 1 from public.provider_profiles
                                        where user_id = v_uid and verification_status = 'approved')
                          then full_name else trim(p_full_name) end,
         terms_accepted_at = coalesce(terms_accepted_at, now()),
         marketing_opt_in = coalesce(p_marketing_opt_in, false)
   where id = v_uid;
  if p_as_provider then perform public.start_provider_onboarding(); end if;
  if p_as_poster then update public.profiles set is_poster = true where id = v_uid; end if;
end $$;

create or replace function public.upsert_poster_profile(p_display_name text, p_poster_type public.poster_type,
                                                        p_city text, p_company_name text default null,
                                                        p_website text default null, p_logo_path text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  if not public.identity_verified(v_uid) then perform public.raise_app_error('phone_not_verified'); end if;
  if p_poster_type in ('business', 'hr', 'public_body') and coalesce(trim(p_company_name), '') = '' then
    perform public.raise_app_error('company_required');
  end if;
  insert into public.poster_profiles (user_id, display_name, poster_type, city, company_name, website, logo_path)
  values (v_uid, trim(p_display_name), p_poster_type, trim(p_city), nullif(trim(p_company_name), ''),
          nullif(trim(p_website), ''), p_logo_path)
  on conflict (user_id) do update set
    display_name = excluded.display_name, poster_type = excluded.poster_type, city = excluded.city,
    company_name = excluded.company_name, website = excluded.website,
    logo_path = coalesce(excluded.logo_path, public.poster_profiles.logo_path);
  update public.profiles set is_poster = true where id = v_uid;
end $$;

-- Contact sharing uses the reachable phone.
create or replace function public.get_contact(p_other uuid)
returns table (full_name text, phone text, email text)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if exists (
       select 1 from public.applications a join public.jobs j on j.id = a.job_id
        where a.status in ('contacted', 'hired') and a.contacted_at is not null
          and ((a.provider_id = v_uid and j.poster_id = p_other) or (a.provider_id = p_other and j.poster_id = v_uid)))
     or exists (
       select 1 from public.engagements e where e.cancelled_at is null
          and ((e.provider_id = v_uid and e.poster_id = p_other) or (e.provider_id = p_other and e.poster_id = v_uid)))
  then
    return query select p.full_name, coalesce(p.phone, p.contact_phone), p.email::text from public.profiles p where p.id = p_other;
  end if;
end $$;

revoke all on function public.set_contact_phone(text), public.identity_verified(uuid), public.reachable_phone(uuid) from public, anon;
grant execute on function public.set_contact_phone(text), public.identity_verified(uuid), public.reachable_phone(uuid)
  to authenticated, service_role;
