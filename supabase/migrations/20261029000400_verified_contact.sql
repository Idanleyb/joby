-- =============================================================================
-- 20261029000400 — Every account: first name, last name, a phone confirmed by SMS code and an
-- email confirmed by code (founder, 2026-10-29). Replaces "Google needs no SMS code"
-- (20261029000200): Google confirms the email, the phone still needs the SMS code.
-- Existing accounts complete the missing details the next time they use the app.
-- =============================================================================

alter table public.profiles
  add column first_name     text check (char_length(first_name) <= 60),
  add column last_name      text check (char_length(last_name) <= 60),
  add column email_verified boolean not null default false;

-- Backfill names from full_name ("First Rest-of-name").
update public.profiles
   set first_name = split_part(trim(full_name), ' ', 1),
       last_name  = nullif(trim(substr(trim(full_name), char_length(split_part(trim(full_name), ' ', 1)) + 1)), '')
 where full_name is not null;

-- Emails confirmed by the auth service (Google sign-in) count as verified.
update public.profiles p set email_verified = true
  from auth.users u where u.id = p.id and u.email_confirmed_at is not null and coalesce(u.email, '') <> ''
   and lower(u.email) = lower(p.email::text);

-- One account per verified email.
create unique index profiles_verified_email_key on public.profiles (email) where email_verified;

-- Sync from auth.users. A verified phone replaces the unverified number a Google user typed.
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text := nullif(new.email, ''); v_email_ok boolean := new.email_confirmed_at is not null and nullif(new.email, '') is not null;
begin
  insert into public.profiles (id, phone, phone_verified, email, email_verified, full_name, first_name, last_name, google_verified)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null else '+' || ltrim(new.phone, '+') end,
    new.phone_confirmed_at is not null,
    v_email,
    v_email_ok,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'family_name',
    coalesce(new.raw_app_meta_data -> 'providers' ? 'google', false)
  )
  on conflict (id) do update set
    phone           = excluded.phone,
    phone_verified  = excluded.phone_verified,
    contact_phone   = case when excluded.phone_verified then null else public.profiles.contact_phone end,
    email           = coalesce(excluded.email, public.profiles.email),
    email_verified  = case when excluded.email is null then public.profiles.email_verified
                           else excluded.email_verified
                                or (public.profiles.email_verified and lower(public.profiles.email::text) = lower(excluded.email::text)) end,
    full_name       = coalesce(public.profiles.full_name, excluded.full_name),
    first_name      = coalesce(public.profiles.first_name, excluded.first_name),
    last_name       = coalesce(public.profiles.last_name, excluded.last_name),
    google_verified = public.profiles.google_verified or excluded.google_verified;
  return new;
end $$;
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of phone, phone_confirmed_at, email, email_confirmed_at, raw_app_meta_data on auth.users
  for each row execute function public.handle_auth_user();

-- Identity = phone confirmed by SMS code (Google alone is no longer enough).
create or replace function public.identity_verified(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select phone_verified from public.profiles where id = p_user), false)
$$;

-- The Google "number without a code" step is gone.
drop function if exists public.set_contact_phone(text);

-- ---------------------------------------------------------------------------
-- Email confirmation codes. The server (service key) asks for a code and emails it;
-- the user types it back. Only a hash is stored. 10 minutes, 5 attempts, resend after
-- 30 seconds, at most 5 codes an hour.
-- ---------------------------------------------------------------------------
create table private.email_codes (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  email        extensions.citext not null,
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     integer not null default 0,
  sent_count   integer not null default 1,
  window_start timestamptz not null default now(),
  last_sent_at timestamptz not null default now()
);
revoke all on private.email_codes from public, anon, authenticated;

create or replace function public.issue_email_code(p_user uuid, p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); v_code text; r private.email_codes;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.raise_app_error('invalid_email'); end if;
  if not exists (select 1 from public.profiles where id = p_user) then perform public.raise_app_error('profile_missing'); end if;
  if exists (select 1 from public.profiles where id <> p_user and email_verified and email = v_email) then
    perform public.raise_app_error('email_taken');
  end if;
  select * into r from private.email_codes where user_id = p_user for update;
  if r.user_id is not null and r.last_sent_at > now() - interval '30 seconds' then perform public.raise_app_error('code_too_soon'); end if;
  if r.user_id is not null and r.window_start > now() - interval '1 hour' and r.sent_count >= 5 then
    perform public.raise_app_error('too_many_codes');
  end if;
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into private.email_codes (user_id, email, code_hash, expires_at)
  values (p_user, v_email, encode(extensions.digest(v_code || ':' || p_user::text, 'sha256'), 'hex'), now() + interval '10 minutes')
  on conflict (user_id) do update set
    email = excluded.email, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
    last_sent_at = now(),
    sent_count = case when private.email_codes.window_start > now() - interval '1 hour' then private.email_codes.sent_count + 1 else 1 end,
    window_start = case when private.email_codes.window_start > now() - interval '1 hour' then private.email_codes.window_start else now() end;
  return v_code;
end $$;

create or replace function public.verify_email_code(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); r private.email_codes;
begin
  select * into r from private.email_codes where user_id = v_uid for update;
  if r.user_id is null then perform public.raise_app_error('code_invalid'); end if;
  if r.attempts >= 5 then perform public.raise_app_error('code_attempts'); end if;
  if r.expires_at < now() then perform public.raise_app_error('code_expired'); end if;
  if r.code_hash <> encode(extensions.digest(trim(coalesce(p_code, '')) || ':' || v_uid::text, 'sha256'), 'hex') then
    update private.email_codes set attempts = attempts + 1 where user_id = v_uid;
    return null;  -- the caller shows "wrong code" (an error would roll back the attempt count)
  end if;
  if exists (select 1 from public.profiles where id <> v_uid and email_verified and email = r.email) then
    perform public.raise_app_error('email_taken');
  end if;
  update public.profiles set email = r.email, email_verified = true where id = v_uid;
  delete from private.email_codes where user_id = v_uid;
  return r.email::text;
end $$;

revoke all on function public.issue_email_code(uuid, text) from public, anon, authenticated;
grant execute on function public.issue_email_code(uuid, text) to service_role;
revoke all on function public.verify_email_code(text) from public, anon;
grant execute on function public.verify_email_code(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sign-up: first and last name, SMS-confirmed phone, confirmed email.
-- ---------------------------------------------------------------------------
drop function if exists public.complete_signup(text, boolean, boolean, boolean);
create or replace function public.complete_signup(p_first_name text, p_last_name text, p_as_provider boolean, p_as_poster boolean,
                                                  p_marketing_opt_in boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_first text := trim(coalesce(p_first_name, '')); v_last text := trim(coalesce(p_last_name, ''));
        v_locked boolean;
begin
  if not public.identity_verified(v_uid) then perform public.raise_app_error('phone_not_verified'); end if;
  if not (select email_verified from public.profiles where id = v_uid) then perform public.raise_app_error('email_not_verified'); end if;
  if char_length(v_first) < 2 or char_length(v_last) < 2 or char_length(v_first) > 60 or char_length(v_last) > 60 then
    perform public.raise_app_error('name_required');
  end if;
  v_locked := exists (select 1 from public.provider_profiles where user_id = v_uid and verification_status = 'approved');
  update public.profiles
     set first_name = case when v_locked and first_name is not null then first_name else v_first end,
         last_name  = case when v_locked and last_name is not null then last_name else v_last end,
         full_name  = case when v_locked then full_name else v_first || ' ' || v_last end,
         terms_accepted_at = coalesce(terms_accepted_at, now()),
         marketing_opt_in = coalesce(p_marketing_opt_in, false)
   where id = v_uid;
  if p_as_provider then perform public.start_provider_onboarding(); end if;
  if p_as_poster then update public.profiles set is_poster = true where id = v_uid; end if;
end $$;
revoke all on function public.complete_signup(text, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.complete_signup(text, text, boolean, boolean, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin invitations: now that every account has a confirmed email, the invited email
-- must be the account's confirmed email.
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_invite(p_email text, p_full_name text, p_role public.admin_role default 'admin')
returns table (token text, existing_user boolean)
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_email text := lower(trim(coalesce(p_email, ''))); v_token text;
        v_user uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.raise_app_error('invalid_email'); end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 then perform public.raise_app_error('name_required'); end if;
  select id into v_user from public.profiles where email = v_email order by email_verified desc limit 1;
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
  if not exists (select 1 from public.profiles where id = v_uid and email_verified and email = i.email) then
    perform public.raise_app_error('invite_email_mismatch');
  end if;
  insert into public.admins (user_id, role) values (v_uid, i.role)
  on conflict (user_id) do update set role = excluded.role;
  update public.admin_invites set status = 'accepted', accepted_at = now(), accepted_by = v_uid where id = i.id;
  if i.invited_by is not null then
    perform private.notify(i.invited_by, 'admin_invite_accepted',
      jsonb_build_object('name', (select full_name from public.profiles where id = v_uid), 'email', i.email::text));
  end if;
  perform private.audit('admin_invite_accepted', 'admin_invite', i.email::text, null, jsonb_build_object('user', v_uid, 'role', i.role));
  return i.role;
end $$;

-- Existing accounts that signed up before first/last name were separate fields.
-- A verified provider's name is locked: only a missing part can be filled.
create or replace function public.set_my_names(p_first_name text, p_last_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_first text := trim(coalesce(p_first_name, '')); v_last text := trim(coalesce(p_last_name, ''));
        v_locked boolean;
begin
  if char_length(v_first) < 2 or char_length(v_last) < 2 or char_length(v_first) > 60 or char_length(v_last) > 60 then
    perform public.raise_app_error('name_required');
  end if;
  v_locked := exists (select 1 from public.provider_profiles where user_id = v_uid and verification_status = 'approved');
  update public.profiles
     set first_name = case when v_locked and first_name is not null then first_name else v_first end,
         last_name  = case when v_locked and last_name is not null then last_name else v_last end
   where id = v_uid;
  update public.profiles set full_name = first_name || ' ' || last_name
   where id = v_uid and (not v_locked or full_name is null or position(' ' in full_name) = 0);
end $$;
revoke all on function public.set_my_names(text, text) from public, anon;
grant execute on function public.set_my_names(text, text) to authenticated, service_role;
