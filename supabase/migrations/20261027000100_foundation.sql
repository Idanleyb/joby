-- =============================================================================
-- Joby MVP · 0100 · Foundation
-- Enums, settings (PRD §7), users/profiles, admins, category taxonomy (PRD §6).
-- Business logic lives in Postgres functions so every client (web, admin, future
-- mobile) gets the same rules. See docs/ARCHITECTURE.md.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- Internal functions (credits ledger, notifications outbox, audit, timers) live in
-- the "private" schema. It is not exposed through the API, so clients can only
-- reach them through the public RPC functions that enforce the business rules.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.account_status      as enum ('active', 'suspended');
create type public.admin_role          as enum ('admin', 'reviewer');
create type public.provider_type       as enum ('reservist', 'spouse');
create type public.verification_status as enum ('draft', 'pending', 'more_info', 'approved', 'rejected');
create type public.verification_kind   as enum ('form_3010', 'spouse');
create type public.days_band           as enum ('30-59', '60-119', '120+');
create type public.poster_type         as enum ('private', 'business', 'hr', 'public_body');
create type public.work_mode           as enum ('onsite', 'remote', 'both');
create type public.budget_type         as enum ('fixed', 'hourly', 'open_to_quotes');
create type public.job_timeline        as enum ('asap', 'week', 'month', 'flexible');
create type public.service_unit        as enum ('job', 'hour', 'day', 'project');
create type public.job_status          as enum ('held', 'open', 'hired', 'closed_no_hire', 'expired', 'removed');
create type public.application_status as enum ('sent', 'viewed', 'shortlisted', 'contacted', 'hired',
                                                'not_selected', 'credited_back', 'withdrawn');
create type public.request_status      as enum ('pending', 'approved', 'declined', 'expired');
create type public.engagement_source   as enum ('application', 'request');
create type public.credit_tx_type      as enum ('welcome', 'apply', 'request_approve', 'credit_back',
                                                'admin_adjust', 'purchase');
create type public.feedback_direction  as enum ('poster_to_provider', 'provider_to_poster');
create type public.worked_together     as enum ('yes', 'not_yet', 'no');
create type public.review_state        as enum ('open', 'approved', 'declined');

-- ---------------------------------------------------------------------------
-- Settings: every number in PRD §7 is configurable without a code release.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

insert into public.app_settings (key, value, description) values
  ('eligibility_min_days',          '30',  'Minimum reserve days on or after 2023-10-07'),
  ('eligibility_start_date',        '"2023-10-07"', 'Days before this date never count'),
  ('welcome_credits',               '100', 'Credits granted on verification approval'),
  ('apply_cost',                    '10',  'Credits to apply to a job'),
  ('request_cost',                  '2',   'Credits charged to the provider when approving a direct request'),
  ('credit_back_unopened_days',     '30',  'Refund an application still unopened after N days while the job is open (never once the job ended with a hire)'),
  ('job_open_days',                 '30',  'Days a job stays open'),
  ('job_extension_days',            '30',  'Length of the single extension the poster can approve (60 days maximum in total)'),
  ('job_applicant_cap',             '30',  'Max applications per job'),
  ('max_open_jobs_per_poster',      '10',  'Max open jobs per poster'),
  ('request_expiry_days',           '7',   'Direct request expires after N days without a response'),
  ('max_requests_per_poster_day',   '20',  'Max direct requests per poster per day'),
  ('feedback_request_after_days',   '3',   'Feedback request sent N days after the engagement'),
  ('feedback_reminder_days',        '[7, 14]', 'Reminders N days after the feedback request (the last one warns of the block)'),
  ('feedback_block_days',           '30',  'Account blocked N days after the feedback request'),
  ('feedback_reveal_days',          '14',  'Reveal a review N days after the first submission'),
  ('score_min_reviews',             '3',   'Score shown only after N revealed reviews'),
  ('max_subcategories',             '3',   'Subcategories per provider'),
  ('max_skills',                    '15',  'Skills per provider'),
  ('max_service_cards',             '3',   'Service cards per provider'),
  ('low_balance_threshold',         '20',  'Low-balance nudge below N credits'),
  ('spouse_invite_days',            '14',  'Spouse invite validity'),
  ('budget_min_nis',                '50',  'Minimum budget value in NIS'),
  ('hire_reversal_hours',           '48',  'Window for support to reverse a mistaken hire'),
  ('prohibited_keywords',           '[]',  'Job posts containing these words are held for moderation');

create or replace function public.setting_int(p_key text)
returns integer language sql stable security definer set search_path = '' as $$
  select (value #>> '{}')::integer from public.app_settings where key = p_key
$$;

create or replace function public.setting_json(p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.app_settings where key = p_key
$$;

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Raise a user-facing error with a stable code the front end can translate.
create or replace function public.raise_app_error(p_code text, p_detail text default null)
returns void language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = coalesce(p_detail, '');
end $$;

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user. Holds private contact data; never public.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text check (char_length(full_name) <= 120),
  phone              text,                                  -- E.164, synced from auth.users
  phone_verified     boolean not null default false,        -- synced from auth.users.phone_confirmed_at
  email              extensions.citext,
  is_provider        boolean not null default false,
  is_poster          boolean not null default false,
  status             public.account_status not null default 'active',
  marketing_opt_in   boolean not null default false,        -- separate, unticked opt-in (PRD 5.1)
  terms_accepted_at  timestamptz,
  notification_prefs jsonb not null default
    '{"whatsapp": true, "job_alerts": "instant", "email_digest": true}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index profiles_phone_key on public.profiles (phone) where phone is not null;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create / sync the profile from auth.users (phone OTP and Google sign-ups).
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, phone_verified, email, full_name)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null else '+' || ltrim(new.phone, '+') end,
    new.phone_confirmed_at is not null,
    nullif(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update set
    phone          = excluded.phone,
    phone_verified = excluded.phone_verified,
    email          = coalesce(excluded.email, public.profiles.email),
    full_name      = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_auth_user();
create trigger on_auth_user_updated after update of phone, phone_confirmed_at, email on auth.users
  for each row execute function public.handle_auth_user();

-- ---------------------------------------------------------------------------
-- Admins (PRD 5.18). Roles: admin = everything, reviewer = queues only.
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  role       public.admin_role not null default 'reviewer',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(p_role public.admin_role default 'reviewer')
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = (select auth.uid())
      and (p_role = 'reviewer' or a.role = 'admin')
  )
$$;

create or replace function public.require_admin(p_role public.admin_role default 'reviewer')
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin(p_role) then
    perform public.raise_app_error('not_authorized');
  end if;
  return auth.uid();
end $$;

create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid references public.profiles (id),
  action      text not null,
  target_type text not null,
  target_id   text not null,
  before      jsonb,
  after       jsonb,
  reason      text,
  created_at  timestamptz not null default now()
);

create or replace function private.audit(p_action text, p_target_type text, p_target_id text,
                                        p_before jsonb default null, p_after jsonb default null,
                                        p_reason text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, before, after, reason)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_before, p_after, p_reason);
$$;

-- ---------------------------------------------------------------------------
-- Category taxonomy (PRD §6). Seeded in supabase/seed.sql; admin-managed.
-- ---------------------------------------------------------------------------
create table public.categories (
  id               smallint generated always as identity primary key,
  slug             text not null unique,
  name_he          text not null,
  name_en          text not null,
  budget_mandatory boolean not null default false,   -- PRD 5.8 budget rule
  sort_order       smallint not null default 0,
  active           boolean not null default true
);

create table public.subcategories (
  id          smallint generated always as identity primary key,
  category_id smallint not null references public.categories (id),
  slug        text not null unique,
  name_he     text not null,
  name_en     text not null,
  licensed    boolean not null default false,          -- self-declared license number (medical, legal)
  is_other    boolean not null default false,          -- "Other (describe)" free-text bucket
  sort_order  smallint not null default 0,
  active      boolean not null default true
);
create index subcategories_category_idx on public.subcategories (category_id);

-- Current-user guards used by marketplace functions.
create or replace function public.require_active_user()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_status public.account_status;
begin
  if v_uid is null then perform public.raise_app_error('not_signed_in'); end if;
  select status into v_status from public.profiles where id = v_uid;
  if v_status is null then perform public.raise_app_error('profile_missing'); end if;
  if v_status = 'suspended' then perform public.raise_app_error('account_suspended'); end if;
  return v_uid;
end $$;
