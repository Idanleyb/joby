-- =============================================================================
-- 20261102000100 — Admin: user accounts and credit usage (founder, 2026-11-02)
--
-- 1. Users: search, view and fix an account (name, email, phone, city, roles, status, credits),
--    and "sign in as this user" for anything else — admins only, written reason, 30 minutes,
--    every entry logged (Privacy Protection Law, Amendment 13: limited and logged access).
-- 2. Credit usage per user for a period: spent (applications + direct requests), refunded,
--    net used, current balance.
-- =============================================================================

create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
-- Addresses ending in ".invalid" are sign-in placeholders (demo accounts, admin sign-in as a user):
-- never copied to the profile, so the user's own confirmed email stays.
declare v_email text := case when new.email ilike '%.invalid' then null else nullif(new.email, '') end;
        v_email_ok boolean := new.email_confirmed_at is not null and v_email is not null;
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

-- ---------------------------------------------------------------------------
-- 1. Users
-- ---------------------------------------------------------------------------
create or replace function public.admin_search_users(p_query text default null, p_limit integer default 50)
returns table (id uuid, full_name text, email text, phone text, status public.account_status, is_provider boolean, is_poster boolean,
               provider_type public.provider_type, verification_status public.verification_status, balance integer,
               is_admin boolean, is_demo boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.email::text, coalesce(p.phone, p.contact_phone), p.status, p.is_provider, p.is_poster,
         pp.provider_type, pp.verification_status, w.balance, exists (select 1 from public.admins a where a.user_id = p.id),
         p.is_demo, p.created_at
    from public.profiles p
    left join public.provider_profiles pp on pp.user_id = p.id
    left join public.provider_wallets w on w.provider_id = p.id
   where public.is_admin('admin')
     and (coalesce(trim(p_query), '') = ''
          or p.full_name ilike '%' || trim(p_query) || '%'
          or p.email::text ilike '%' || trim(p_query) || '%'
          or replace(coalesce(p.phone, p.contact_phone, ''), '+972', '0') like '%' || regexp_replace(trim(p_query), '[^0-9]', '', 'g') || '%'
             and regexp_replace(trim(p_query), '[^0-9]', '', 'g') <> ''
          or p.id::text = trim(p_query))
   order by p.is_demo, p.created_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;

-- Fix an account's details. Name, email and city can be changed even when locked for the user.
-- The phone is changed by the server through the auth service (it is the sign-in number).
create or replace function public.admin_update_user(p_user uuid, p_first_name text, p_last_name text, p_email text,
                                                   p_city text, p_is_poster boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_before jsonb; v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
        v_first text := trim(coalesce(p_first_name, '')); v_last text := trim(coalesce(p_last_name, ''));
begin
  if coalesce(trim(p_reason), '') = '' then perform public.raise_app_error('reason_required'); end if;
  if char_length(v_first) < 2 or char_length(v_last) < 2 then perform public.raise_app_error('name_required'); end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.raise_app_error('invalid_email'); end if;
  if v_email is not null and exists (select 1 from public.profiles where id <> p_user and email_verified and email = v_email) then
    perform public.raise_app_error('email_taken');
  end if;
  select jsonb_build_object('first_name', first_name, 'last_name', last_name, 'email', email, 'is_poster', is_poster)
    into v_before from public.profiles where id = p_user;
  if v_before is null then perform public.raise_app_error('not_found'); end if;
  update public.profiles
     set first_name = v_first, last_name = v_last, full_name = v_first || ' ' || v_last,
         email = coalesce(v_email, email), email_verified = case when v_email is null then email_verified else true end,
         is_poster = coalesce(p_is_poster, is_poster)
   where id = p_user;
  if nullif(trim(coalesce(p_city, '')), '') is not null then
    update public.provider_profiles set city = trim(p_city) where user_id = p_user;
    update public.poster_profiles set city = trim(p_city) where user_id = p_user;
  end if;
  update public.provider_profiles set display_name = v_first || ' ' || left(v_last, 1) || '.' where user_id = p_user;
  perform private.audit('user_updated', 'profile', p_user::text, v_before,
    jsonb_build_object('first_name', v_first, 'last_name', v_last, 'email', v_email, 'city', p_city, 'is_poster', p_is_poster), p_reason);
end $$;

-- Phone changes are made by the server (service key) after this check; recorded here.
create or replace function public.admin_check_phone_change(p_user uuid, p_phone text, p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_phone text := public.normalize_il_phone(p_phone);
begin
  if coalesce(trim(p_reason), '') = '' then perform public.raise_app_error('reason_required'); end if;
  if v_phone is null then perform public.raise_app_error('invalid_phone'); end if;
  if exists (select 1 from public.profiles where id <> p_user and (phone = v_phone or contact_phone = v_phone)) then
    perform public.raise_app_error('phone_taken');
  end if;
  perform private.audit('user_phone_changed', 'profile', p_user::text,
    (select to_jsonb(phone) from public.profiles where id = p_user), to_jsonb(v_phone), p_reason);
  return v_phone;
end $$;

-- "Sign in as this user": the log of every entry. The server signs the admin in only after this.
create table public.admin_impersonations (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references public.profiles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  reason     text not null check (char_length(reason) between 5 and 500),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  ended_at   timestamptz
);
create index admin_impersonations_user_idx on public.admin_impersonations (user_id, started_at desc);
alter table public.admin_impersonations enable row level security;
create policy "admins read impersonations" on public.admin_impersonations for select to authenticated using (public.is_admin('admin'));
grant select on public.admin_impersonations to authenticated;

create or replace function public.admin_start_impersonation(p_user uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_id uuid;
begin
  if char_length(trim(coalesce(p_reason, ''))) < 5 then perform public.raise_app_error('reason_required'); end if;
  if p_user = v_admin then perform public.raise_app_error('own_profile'); end if;
  if not exists (select 1 from public.profiles where id = p_user) then perform public.raise_app_error('not_found'); end if;
  -- Never another admin's account: that would hand over admin rights.
  if exists (select 1 from public.admins where user_id = p_user) then perform public.raise_app_error('not_authorized'); end if;
  insert into public.admin_impersonations (admin_id, user_id, reason) values (v_admin, p_user, trim(p_reason)) returning id into v_id;
  perform private.audit('impersonation_started', 'profile', p_user::text, null, jsonb_build_object('session', v_id), trim(p_reason));
  return v_id;
end $$;

-- Ending is done by the server (service key), because by then the browser is signed in as the user.
create or replace function public.end_impersonation(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.admin_impersonations set ended_at = coalesce(ended_at, now()) where id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- 2. Credit usage
-- ---------------------------------------------------------------------------
create or replace function public.admin_credit_usage(p_from timestamptz default null, p_include_demo boolean default false)
returns table (provider_id uuid, full_name text, is_demo boolean, spent integer, refunded integer, net_used integer,
               applications integer, requests integer, balance integer)
language sql stable security definer set search_path = '' as $$
  select t.provider_id, p.full_name, p.is_demo,
         coalesce(-sum(t.amount) filter (where t.tx_type in ('apply', 'request_approve')), 0)::int,
         coalesce(sum(t.amount) filter (where t.tx_type = 'credit_back'), 0)::int,
         (coalesce(-sum(t.amount) filter (where t.tx_type in ('apply', 'request_approve')), 0)
          - coalesce(sum(t.amount) filter (where t.tx_type = 'credit_back'), 0))::int,
         (count(*) filter (where t.tx_type = 'apply'))::int,
         (count(*) filter (where t.tx_type = 'request_approve'))::int,
         w.balance
    from public.credit_transactions t
    join public.profiles p on p.id = t.provider_id
    left join public.provider_wallets w on w.provider_id = t.provider_id
   where public.is_admin('admin')
     and (p_from is null or t.created_at >= p_from)
     and (p_include_demo or not p.is_demo)
     and t.tx_type in ('apply', 'request_approve', 'credit_back')
   group by t.provider_id, p.full_name, p.is_demo, w.balance
   order by 6 desc, 2
$$;

revoke all on function public.admin_search_users(text, integer), public.admin_update_user(uuid, text, text, text, text, boolean, text),
  public.admin_check_phone_change(uuid, text, text), public.admin_start_impersonation(uuid, text),
  public.admin_credit_usage(timestamptz, boolean) from public, anon;
grant execute on function public.admin_search_users(text, integer), public.admin_update_user(uuid, text, text, text, text, boolean, text),
  public.admin_check_phone_change(uuid, text, text), public.admin_start_impersonation(uuid, text),
  public.admin_credit_usage(timestamptz, boolean) to authenticated, service_role;
revoke all on function public.end_impersonation(uuid) from public, anon, authenticated;
grant execute on function public.end_impersonation(uuid) to service_role;
