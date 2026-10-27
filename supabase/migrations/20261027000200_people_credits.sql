-- =============================================================================
-- Joby MVP · 0200 · People, verification and credits
-- Notification outbox, poster & provider profiles (PRD 5.2–5.7), Form 3010 and
-- spouse verification (PRD 5.3, 5.6), credits ledger (PRD 5.13).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Notification outbox (PRD §8). Rows are written here by the database; a worker
-- (Edge Function, later step) sends them by WhatsApp / email and marks them sent.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.profiles (id) on delete cascade,
  to_phone      text,                                 -- for people without an account yet (spouse invite)
  event         text not null,                        -- e.g. 'verification_approved'
  payload       jsonb not null default '{}'::jsonb,
  in_app        boolean not null default true,
  read_at       timestamptz,
  status        text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  send_after    timestamptz not null default now(),   -- quiet hours handled by the worker
  sent_at       timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  check (user_id is not null or to_phone is not null)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_queue_idx on public.notifications (status, send_after) where status = 'queued';

create or replace function private.notify(p_user uuid, p_event text, p_payload jsonb default '{}'::jsonb,
                                          p_to_phone text default null, p_in_app boolean default true)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, event, payload, to_phone, in_app)
  values (p_user, p_event, coalesce(p_payload, '{}'::jsonb), p_to_phone, p_in_app and p_user is not null);
$$;

-- ---------------------------------------------------------------------------
-- Poster profile (PRD 5.7). Trust signals are maintained by the database.
-- ---------------------------------------------------------------------------
create table public.poster_profiles (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  poster_type  public.poster_type not null,
  company_name text check (char_length(company_name) <= 120),
  logo_path    text,
  website      text check (char_length(website) <= 300),
  city         text not null check (char_length(city) <= 80),
  jobs_posted  integer not null default 0,
  jobs_closed  integer not null default 0,   -- hired + closed without hire + expired
  hires        integer not null default 0,
  rating_avg   numeric(2,1),
  rating_count integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger poster_profiles_touch before update on public.poster_profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Provider profile (PRD 5.2, 5.5)
-- ---------------------------------------------------------------------------
create table public.provider_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  provider_type       public.provider_type not null,
  verification_status public.verification_status not null default 'draft',
  verified_at         timestamptz,
  display_name        text check (char_length(display_name) <= 60),   -- "First L."
  headline            text check (char_length(headline) <= 70),
  bio                 text check (char_length(bio) <= 1000),
  photo_path          text,
  city                text check (char_length(city) <= 80),
  radius_km           smallint check (radius_km in (10, 25, 50)),     -- null + works_onsite = nationwide
  works_onsite        boolean not null default false,
  works_remote        boolean not null default false,
  years_experience    smallint check (years_experience between 0 and 60),
  languages           text[] not null default '{}',
  portfolio_links     text[] not null default '{}' check (cardinality(portfolio_links) <= 5),
  cv_path             text,
  cv_visible          boolean not null default true,
  other_title         text check (char_length(other_title) <= 60),     -- "Other (describe)"
  license_number      text check (char_length(license_number) <= 40),  -- self-declared, licensed subcategories
  days_band           public.days_band,
  show_days_band      boolean not null default false,
  onboarding_step     smallint not null default 1 check (onboarding_step between 1 and 8),
  rating_avg          numeric(2,1),
  rating_count        integer not null default 0,
  jobs_done           integer not null default 0,
  avg_response_hours  numeric(6,1),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index provider_profiles_status_idx on public.provider_profiles (verification_status);
create trigger provider_profiles_touch before update on public.provider_profiles
  for each row execute function public.touch_updated_at();

-- Columns a provider may never change directly (only via functions/admin).
create or replace function private.guard_provider_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.user_id <> old.user_id
       or new.provider_type is distinct from old.provider_type
       or new.verification_status is distinct from old.verification_status
       or new.verified_at is distinct from old.verified_at
       or new.days_band is distinct from old.days_band
       or new.rating_avg is distinct from old.rating_avg
       or new.rating_count is distinct from old.rating_count
       or new.jobs_done is distinct from old.jobs_done
       or new.avg_response_hours is distinct from old.avg_response_hours then
      perform public.raise_app_error('protected_field');
    end if;
    -- PRD 5.2: name locked after verification
    if old.verification_status = 'approved' and new.display_name is distinct from old.display_name then
      perform public.raise_app_error('name_locked');
    end if;
  end if;
  return new;
end $$;
create trigger provider_profiles_guard before update on public.provider_profiles
  for each row execute function private.guard_provider_profile();

create table public.provider_subcategories (
  provider_id    uuid not null references public.provider_profiles (user_id) on delete cascade,
  subcategory_id smallint not null references public.subcategories (id),
  primary key (provider_id, subcategory_id)
);
create index provider_subcategories_sub_idx on public.provider_subcategories (subcategory_id);

create table public.provider_skills (
  provider_id uuid not null references public.provider_profiles (user_id) on delete cascade,
  skill       text not null check (char_length(skill) between 1 and 40),
  primary key (provider_id, skill)
);

create table public.service_cards (
  id             uuid primary key default gen_random_uuid(),
  provider_id    uuid not null references public.provider_profiles (user_id) on delete cascade,
  title          text not null check (char_length(title) between 2 and 60),
  subcategory_id smallint not null references public.subcategories (id),
  description    text check (char_length(description) <= 300),
  price_from     integer check (price_from > 0),          -- null = "Quote on request"
  unit           public.service_unit not null default 'job',
  mode           public.work_mode not null default 'onsite',
  created_at     timestamptz not null default now()
);
create index service_cards_provider_idx on public.service_cards (provider_id);

create table public.provider_experience (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.provider_profiles (user_id) on delete cascade,
  title        text not null check (char_length(title) <= 100),
  organization text check (char_length(organization) <= 100),
  start_date   date,
  end_date     date,
  sort_order   smallint not null default 0
);
create table public.provider_education (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.provider_profiles (user_id) on delete cascade,
  degree       text not null check (char_length(degree) <= 100),
  institution  text check (char_length(institution) <= 100),
  start_date   date,
  end_date     date,
  sort_order   smallint not null default 0
);
create index provider_experience_idx on public.provider_experience (provider_id);
create index provider_education_idx on public.provider_education (provider_id);

-- Limits: max subcategories / skills / service cards (PRD §7).
create or replace function private.enforce_provider_limits()
returns trigger language plpgsql set search_path = '' as $$
declare v_count integer; v_max integer; v_key text;
begin
  v_key := case tg_table_name
             when 'provider_subcategories' then 'max_subcategories'
             when 'provider_skills' then 'max_skills'
             when 'service_cards' then 'max_service_cards' end;
  v_max := public.setting_int(v_key);
  execute format('select count(*) from public.%I where provider_id = $1', tg_table_name)
    into v_count using new.provider_id;
  if v_count >= v_max then
    perform public.raise_app_error('limit_reached', v_key);
  end if;
  return new;
end $$;
create trigger provider_subcategories_limit before insert on public.provider_subcategories
  for each row execute function private.enforce_provider_limits();
create trigger provider_skills_limit before insert on public.provider_skills
  for each row execute function private.enforce_provider_limits();
create trigger service_cards_limit before insert on public.service_cards
  for each row execute function private.enforce_provider_limits();

-- A provider is "verified" when approved and the account is active.
create or replace function public.is_verified_provider(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.provider_profiles pp
    join public.profiles p on p.id = pp.user_id
    where pp.user_id = p_user and pp.verification_status = 'approved' and p.status = 'active'
  )
$$;

-- ---------------------------------------------------------------------------
-- Credits (PRD 5.13). The balance lives in its own table so it is never exposed
-- on the public profile. The ledger is append-only. All changes go through
-- private.apply_credit, which locks the wallet row, so concurrent requests can
-- never overspend (the balance check is atomic).
-- ---------------------------------------------------------------------------
create table public.provider_wallets (
  provider_id uuid primary key references public.provider_profiles (user_id) on delete cascade,
  balance     integer not null default 0 check (balance >= 0),
  updated_at  timestamptz not null default now()
);

create or replace function private.create_wallet()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.provider_wallets (provider_id) values (new.user_id) on conflict do nothing;
  return new;
end $$;
create trigger provider_profiles_wallet after insert on public.provider_profiles
  for each row execute function private.create_wallet();

create table public.credit_transactions (
  id             bigint generated always as identity primary key,
  provider_id    uuid not null references public.provider_profiles (user_id) on delete cascade,
  amount         integer not null check (amount <> 0),
  tx_type        public.credit_tx_type not null,
  reference_type text,
  reference_id   text,
  balance_after  integer not null check (balance_after >= 0),
  admin_id       uuid references public.profiles (id),
  reason         text,
  created_at     timestamptz not null default now()
);
create index credit_transactions_provider_idx on public.credit_transactions (provider_id, created_at desc);
-- One refund per application, one charge per application: protects against double processing.
create unique index credit_once_per_reference on public.credit_transactions (tx_type, reference_type, reference_id)
  where tx_type in ('apply', 'credit_back', 'request_approve', 'welcome');

create or replace function private.apply_credit(p_provider uuid, p_amount integer, p_type public.credit_tx_type,
                                                p_ref_type text default null, p_ref_id text default null,
                                                p_reason text default null, p_admin uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer; v_threshold integer;
begin
  select balance into v_balance from public.provider_wallets where provider_id = p_provider for update;
  if v_balance is null then perform public.raise_app_error('provider_missing'); end if;
  if v_balance + p_amount < 0 then perform public.raise_app_error('insufficient_credits'); end if;
  v_balance := v_balance + p_amount;
  update public.provider_wallets set balance = v_balance, updated_at = now() where provider_id = p_provider;
  insert into public.credit_transactions (provider_id, amount, tx_type, reference_type, reference_id,
                                          balance_after, admin_id, reason)
  values (p_provider, p_amount, p_type, p_ref_type, p_ref_id, v_balance, p_admin, p_reason);
  v_threshold := public.setting_int('low_balance_threshold');
  if p_amount < 0 and v_balance < v_threshold and v_balance - p_amount >= v_threshold then
    perform private.notify(p_provider, 'low_credit_balance', jsonb_build_object('balance', v_balance));
  end if;
  return v_balance;
end $$;

-- ---------------------------------------------------------------------------
-- Verification requests (PRD 5.3 Form 3010, PRD 5.6 spouse proof)
-- Documents live in the private "verification-docs" bucket and are deleted
-- within 24h of the decision; only the result and the salted ID hash remain.
-- ---------------------------------------------------------------------------
create table public.verification_requests (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  kind                 public.verification_kind not null,
  status               public.verification_status not null default 'pending'
                         check (status in ('pending', 'more_info', 'approved', 'rejected')),
  file_paths           text[] not null default '{}',
  extracted            jsonb,             -- AI output; wiped at decision
  days_total           integer,           -- wiped at decision
  days_band            public.days_band,
  id_hash              text,              -- salted hash of the ID number (kept, PRD decision #4)
  duplicate_suspected  boolean not null default false,
  provider_note        text check (char_length(provider_note) <= 500),
  reviewer_id          uuid references public.profiles (id),
  decision_reason      text,
  submitted_at         timestamptz not null default now(),
  decided_at           timestamptz,
  documents_deleted_at timestamptz
);
create index verification_requests_queue_idx on public.verification_requests (status, submitted_at)
  where status = 'pending';
create index verification_requests_user_idx on public.verification_requests (user_id, submitted_at desc);
create index verification_requests_hash_idx on public.verification_requests (id_hash) where id_hash is not null;
-- One open request per user and kind.
create unique index verification_one_open on public.verification_requests (user_id, kind)
  where status in ('pending', 'more_info');

-- ---------------------------------------------------------------------------
-- Spouse links (PRD 5.6)
-- ---------------------------------------------------------------------------
create table public.spouse_links (
  id             uuid primary key default gen_random_uuid(),
  reservist_id   uuid not null references public.provider_profiles (user_id) on delete cascade,
  spouse_user_id uuid references public.profiles (id) on delete set null,
  invite_name    text not null check (char_length(invite_name) <= 120),
  invite_phone   text not null,
  invite_token   text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  status         text not null default 'invited'
                   check (status in ('invited', 'accepted', 'approved', 'rejected', 'cancelled', 'expired', 'unlinked')),
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);
-- One active link per reservist; a spouse belongs to one reservist.
create unique index spouse_links_one_active on public.spouse_links (reservist_id)
  where status in ('invited', 'accepted', 'approved');
create unique index spouse_links_spouse_once on public.spouse_links (spouse_user_id)
  where status in ('accepted', 'approved');

-- =============================================================================
-- RPC: onboarding
-- =============================================================================

-- Accept terms and choose roles (PRD 5.1 AUTH-4). Requires a verified phone.
create or replace function public.complete_signup(p_full_name text, p_as_provider boolean, p_as_poster boolean,
                                                  p_marketing_opt_in boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  if not (select phone_verified from public.profiles where id = v_uid) then
    perform public.raise_app_error('phone_not_verified');
  end if;
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

-- Create the reservist provider profile (draft) — step 1 of the wizard.
create or replace function public.start_provider_onboarding()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_name text;
begin
  select full_name into v_name from public.profiles where id = v_uid;
  insert into public.provider_profiles (user_id, provider_type, display_name)
  values (v_uid, 'reservist', public.short_name(v_name))
  on conflict (user_id) do nothing;
  update public.profiles set is_provider = true where id = v_uid;
end $$;

-- "Yossi Mizrahi" -> "Yossi M."  (public name; full name stays private)
create or replace function public.short_name(p_full text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_full is null or trim(p_full) = '' then null
    when position(' ' in trim(p_full)) = 0 then trim(p_full)
    else split_part(trim(p_full), ' ', 1) || ' ' || left(split_part(trim(p_full), ' ', array_length(regexp_split_to_array(trim(p_full), '\s+'), 1)), 1) || '.'
  end
$$;

-- Poster onboarding (PRD 5.7). Phone verification is the only requirement.
create or replace function public.upsert_poster_profile(p_display_name text, p_poster_type public.poster_type,
                                                        p_city text, p_company_name text default null,
                                                        p_website text default null, p_logo_path text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  if not (select phone_verified from public.profiles where id = v_uid) then
    perform public.raise_app_error('phone_not_verified');
  end if;
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

-- =============================================================================
-- RPC: verification
-- =============================================================================

-- Called by the server (service role) after files are uploaded and the AI has
-- read them, because the ID hash uses a secret salt that never reaches the browser.
create or replace function public.submit_verification(p_user uuid, p_kind public.verification_kind,
                                                      p_file_paths text[], p_extracted jsonb,
                                                      p_days_total integer, p_id_hash text,
                                                      p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_dup boolean;
begin
  if not exists (select 1 from public.provider_profiles where user_id = p_user) then
    perform public.raise_app_error('provider_missing');
  end if;
  if exists (select 1 from public.provider_profiles where user_id = p_user and verification_status = 'approved') then
    perform public.raise_app_error('already_verified');
  end if;
  if cardinality(p_file_paths) < 1 or cardinality(p_file_paths) > 15 then
    perform public.raise_app_error('invalid_file_count');
  end if;
  -- Same ID on another account → still accepted into the queue, flagged for the admin (PRD §15).
  v_dup := p_id_hash is not null and exists (
    select 1 from public.verification_requests
    where id_hash = p_id_hash and user_id <> p_user and status in ('pending', 'more_info', 'approved'));

  -- A "more info" request is replaced by the new submission.
  update public.verification_requests set status = 'rejected', decision_reason = 'superseded', decided_at = now()
   where user_id = p_user and kind = p_kind and status in ('pending', 'more_info');

  insert into public.verification_requests (user_id, kind, file_paths, extracted, days_total, id_hash,
                                            duplicate_suspected, provider_note)
  values (p_user, p_kind, p_file_paths, p_extracted, p_days_total, p_id_hash, v_dup, p_note)
  returning id into v_id;

  update public.provider_profiles set verification_status = 'pending' where user_id = p_user;
  perform private.notify(p_user, 'verification_submitted', jsonb_build_object('request_id', v_id));
  return v_id;
end $$;

create or replace function public.days_to_band(p_days integer)
returns public.days_band language sql immutable set search_path = '' as $$
  select case when p_days >= 120 then '120+'::public.days_band
              when p_days >= 60  then '60-119'::public.days_band
              when p_days >= 30  then '30-59'::public.days_band end
$$;

-- Admin decision (PRD 5.3 step 6–7, PRD 5.6 step 6–7).
-- p_decision: 'approved' | 'rejected' | 'more_info'. Returns the file paths to delete.
create or replace function public.decide_verification(p_request uuid, p_decision public.verification_status,
                                                      p_reason text default null, p_days_total integer default null)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin('reviewer');
  r public.verification_requests;
  v_days integer; v_band public.days_band; v_link public.spouse_links;
begin
  select * into r from public.verification_requests where id = p_request for update;
  if r.id is null then perform public.raise_app_error('not_found'); end if;
  if r.status not in ('pending', 'more_info') then perform public.raise_app_error('already_decided'); end if;
  if p_decision not in ('approved', 'rejected', 'more_info') then perform public.raise_app_error('invalid_decision'); end if;
  if p_decision in ('rejected', 'more_info') and coalesce(trim(p_reason), '') = '' then
    perform public.raise_app_error('reason_required');
  end if;

  if p_decision = 'more_info' then
    update public.verification_requests set status = 'more_info', decision_reason = p_reason, reviewer_id = v_admin
     where id = r.id;
    update public.provider_profiles set verification_status = 'more_info' where user_id = r.user_id;
    perform private.notify(r.user_id, 'verification_more_info', jsonb_build_object('reason', p_reason));
    perform private.audit('verification_more_info', 'verification_request', r.id::text, null, null, p_reason);
    return '{}';
  end if;

  if p_decision = 'approved' then
    if r.kind = 'form_3010' then
      v_days := coalesce(p_days_total, r.days_total);
      if v_days is null or v_days < public.setting_int('eligibility_min_days') then
        perform public.raise_app_error('below_threshold');
      end if;
      v_band := public.days_to_band(v_days);
    else
      select * into v_link from public.spouse_links
       where spouse_user_id = r.user_id and status = 'accepted' for update;
      if v_link.id is null then perform public.raise_app_error('spouse_link_missing'); end if;
      if not public.is_verified_provider(v_link.reservist_id) then
        perform public.raise_app_error('reservist_not_verified');
      end if;
      update public.spouse_links set status = 'approved', decided_at = now() where id = v_link.id;
      perform private.notify(v_link.reservist_id, 'spouse_approved', jsonb_build_object('spouse_id', r.user_id));
    end if;

    update public.verification_requests
       set status = 'approved', days_band = v_band, reviewer_id = v_admin, decided_at = now(),
           decision_reason = p_reason, extracted = null, days_total = null
     where id = r.id;
    update public.provider_profiles
       set verification_status = 'approved', verified_at = now(), days_band = coalesce(v_band, days_band)
     where user_id = r.user_id;
    perform private.apply_credit(r.user_id, public.setting_int('welcome_credits'), 'welcome',
                                 'verification', r.user_id::text, 'Welcome credits');
    perform private.notify(r.user_id, case when r.kind = 'spouse' then 'spouse_approved_self'
                                          else 'verification_approved' end,
                           jsonb_build_object('credits', public.setting_int('welcome_credits')));
  else -- rejected
    update public.verification_requests
       set status = 'rejected', reviewer_id = v_admin, decided_at = now(), decision_reason = p_reason,
           extracted = null, days_total = null
     where id = r.id;
    update public.provider_profiles set verification_status = 'rejected' where user_id = r.user_id;
    if r.kind = 'spouse' then
      update public.spouse_links set status = 'rejected', decided_at = now()
       where spouse_user_id = r.user_id and status = 'accepted';
    end if;
    perform private.notify(r.user_id, 'verification_rejected', jsonb_build_object('reason', p_reason));
    -- PRD 5.3: second "suspected tampering" rejection suspends the account for review.
    if p_reason = 'suspected_tampering' and (
         select count(*) from public.verification_requests
         where user_id = r.user_id and decision_reason = 'suspected_tampering') >= 2 then
      update public.profiles set status = 'suspended' where id = r.user_id;
    end if;
  end if;

  perform private.audit('verification_' || p_decision::text, 'verification_request', r.id::text,
                        jsonb_build_object('status', r.status), jsonb_build_object('status', p_decision), p_reason);
  return r.file_paths;
end $$;

-- Called by the document-cleanup worker after it deletes the files from storage.
create or replace function public.mark_documents_deleted(p_request uuid)
returns void language sql security definer set search_path = '' as $$
  update public.verification_requests set documents_deleted_at = now(), file_paths = '{}'
   where id = p_request and status in ('approved', 'rejected');
$$;

-- =============================================================================
-- RPC: spouse linking (PRD 5.6)
-- =============================================================================
-- Israeli mobile numbers in any common format → E.164 (+9725XXXXXXXX), else null.
-- "050-123-4567", "0501234567", "+972 50 123 4567", "972501234567" all work.
create or replace function public.normalize_il_phone(p_raw text)
returns text language sql immutable set search_path = '' as $$
  select case when d ~ '^9725[0-9]{8}$' then '+' || d end
  from (select case when digits like '0%' then '972' || substr(digits, 2) else digits end as d
        from (select regexp_replace(coalesce(p_raw, ''), '[^0-9]', '', 'g') as digits) x) y
$$;

create or replace function public.invite_spouse(p_name text, p_phone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_id uuid; v_phone text;
begin
  if not exists (select 1 from public.provider_profiles where user_id = v_uid and provider_type = 'reservist'
                 and verification_status = 'approved') then
    perform public.raise_app_error('not_verified_reservist');
  end if;
  v_phone := public.normalize_il_phone(p_phone);
  if v_phone is null then perform public.raise_app_error('invalid_phone'); end if;
  if v_phone = (select phone from public.profiles where id = v_uid) then
    perform public.raise_app_error('invalid_phone');
  end if;
  update public.spouse_links set status = 'expired' where reservist_id = v_uid and status = 'invited' and expires_at < now();
  insert into public.spouse_links (reservist_id, invite_name, invite_phone, expires_at)
  values (v_uid, trim(p_name), v_phone, now() + make_interval(days => public.setting_int('spouse_invite_days')))
  returning id into v_id;
  perform private.notify(null, 'spouse_invite',
    jsonb_build_object('link_id', v_id, 'reservist_name', (select display_name from public.provider_profiles where user_id = v_uid),
                       'token', (select invite_token from public.spouse_links where id = v_id)),
    v_phone, false);
  return v_id;
exception when unique_violation then
  perform public.raise_app_error('spouse_link_exists');
  return null;
end $$;

create or replace function public.cancel_spouse_invite(p_link uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  update public.spouse_links set status = 'cancelled'
   where id = p_link and reservist_id = v_uid and status = 'invited';
  if not found then perform public.raise_app_error('not_found'); end if;
end $$;

-- The spouse opens the invite link after signing up.
create or replace function public.accept_spouse_invite(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); l public.spouse_links; v_name text;
begin
  select * into l from public.spouse_links where invite_token = p_token for update;
  if l.id is null or l.status <> 'invited' then perform public.raise_app_error('invite_invalid'); end if;
  if l.expires_at < now() then
    update public.spouse_links set status = 'expired' where id = l.id;
    perform public.raise_app_error('invite_expired');
  end if;
  if l.reservist_id = v_uid then perform public.raise_app_error('invite_invalid'); end if;
  if exists (select 1 from public.provider_profiles where user_id = v_uid) then
    perform public.raise_app_error('already_provider');
  end if;
  update public.spouse_links set spouse_user_id = v_uid, status = 'accepted' where id = l.id;
  select full_name into v_name from public.profiles where id = v_uid;
  insert into public.provider_profiles (user_id, provider_type, display_name)
  values (v_uid, 'spouse', public.short_name(coalesce(v_name, l.invite_name)));
  update public.profiles set is_provider = true where id = v_uid;
end $$;

-- Admin decides manually on a spouse whose reservist account changed (PRD decision, v1.1).
create or replace function public.admin_set_spouse_eligibility(p_spouse uuid, p_keep boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin');
begin
  if p_keep then
    perform private.audit('spouse_kept', 'provider', p_spouse::text, null, null, p_reason);
  else
    update public.provider_profiles set verification_status = 'rejected' where user_id = p_spouse;
    update public.spouse_links set status = 'unlinked', decided_at = now()
     where spouse_user_id = p_spouse and status = 'approved';
    perform private.audit('spouse_removed', 'provider', p_spouse::text, null, null, p_reason);
  end if;
  perform private.notify(p_spouse, 'spouse_eligibility_decided', jsonb_build_object('kept', p_keep));
end $$;

-- Admin credit grant / adjustment (PRD 5.13) — mandatory reason, audited.
create or replace function public.admin_adjust_credits(p_provider uuid, p_amount integer, p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_balance integer;
begin
  if coalesce(trim(p_reason), '') = '' then perform public.raise_app_error('reason_required'); end if;
  v_balance := private.apply_credit(p_provider, p_amount, 'admin_adjust', 'admin', null, p_reason, v_admin);
  perform private.audit('credits_adjusted', 'provider', p_provider::text, null,
                        jsonb_build_object('amount', p_amount, 'balance', v_balance), p_reason);
  return v_balance;
end $$;
