-- =============================================================================
-- Joby MVP · 0300 · Marketplace
-- Jobs (PRD 5.8), applications / Flow A (5.10), direct requests / Flow B (5.11),
-- engagements, hiring and extra hires (5.12), blocking (5.17).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Blocks between users (PRD 5.17)
-- ---------------------------------------------------------------------------
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_blocks
                 where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a))
$$;

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
create table public.jobs (
  id                uuid primary key default gen_random_uuid(),
  poster_id         uuid references public.poster_profiles (user_id) on delete cascade,
  subcategory_id    smallint not null references public.subcategories (id),
  title             text not null check (char_length(title) between 5 and 80),
  description       text not null check (char_length(description) between 50 and 3000),
  skills            text[] not null default '{}' check (cardinality(skills) <= 5),
  mode              public.work_mode not null,
  city              text check (char_length(city) <= 80),
  budget_type       public.budget_type not null,
  budget_min        integer,
  budget_max        integer,
  timeline          public.job_timeline not null,
  start_date        date,
  attachment_paths  text[] not null default '{}' check (cardinality(attachment_paths) <= 3),
  status            public.job_status not null default 'open',
  hold_reason       text,
  published_at      timestamptz not null default now(),
  expires_at        timestamptz not null,
  extended          boolean not null default false,
  application_count integer not null default 0,
  -- Post on behalf (PRD 5.8): admin publishes for a poster who claims it later.
  -- The claim phone and token live in public.job_claims (private, admin-only).
  created_by_admin  uuid references public.profiles (id),
  on_behalf_name    text,
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (poster_id is not null or created_by_admin is not null),
  check (mode = 'remote' or city is not null),
  check ((budget_type = 'open_to_quotes' and budget_min is null and budget_max is null)
      or (budget_type <> 'open_to_quotes' and budget_min is not null and budget_max is not null
          and budget_min <= budget_max))
);
create index jobs_feed_idx on public.jobs (status, published_at desc);
create index jobs_sub_idx on public.jobs (subcategory_id, status);
create index jobs_poster_idx on public.jobs (poster_id, status);
create index jobs_expiry_idx on public.jobs (expires_at) where status = 'open';
create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

-- Budget rule (PRD 5.8, decision #9): mandatory for budget-mandatory categories
-- and for any remote / hybrid job; otherwise "Open to quotes" is allowed.
create or replace function private.validate_budget(p_sub smallint, p_mode public.work_mode,
                                                   p_type public.budget_type, p_min integer, p_max integer)
returns void language plpgsql stable security definer set search_path = '' as $$
declare v_mandatory boolean;
begin
  select c.budget_mandatory into v_mandatory
    from public.subcategories s join public.categories c on c.id = s.category_id
   where s.id = p_sub and s.active;
  if v_mandatory is null then perform public.raise_app_error('invalid_subcategory'); end if;
  if p_type = 'open_to_quotes' then
    if v_mandatory or p_mode in ('remote', 'both') then perform public.raise_app_error('budget_required'); end if;
    if p_min is not null or p_max is not null then perform public.raise_app_error('invalid_budget'); end if;
  else
    if p_min is null or p_max is null or p_min > p_max then perform public.raise_app_error('invalid_budget'); end if;
    if p_min < public.setting_int('budget_min_nis') then perform public.raise_app_error('budget_too_low'); end if;
  end if;
end $$;

create or replace function public.budget_required(p_sub smallint, p_mode public.work_mode)
returns boolean language sql stable security definer set search_path = '' as $$
  select c.budget_mandatory or p_mode in ('remote', 'both')
    from public.subcategories s join public.categories c on c.id = s.category_id where s.id = p_sub
$$;

create or replace function private.needs_moderation(p_text text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from jsonb_array_elements_text(public.setting_json('prohibited_keywords')) k(word)
    where position(lower(k.word) in lower(p_text)) > 0
  )
$$;

-- Guard direct updates: owners may edit text fields only; category and budget
-- lock after the first application (PRD 5.8). Status changes go through RPCs.
create or replace function private.guard_job_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.poster_id is distinct from old.poster_id or new.status is distinct from old.status
       or new.expires_at is distinct from old.expires_at or new.extended is distinct from old.extended
       or new.application_count is distinct from old.application_count
       or new.published_at is distinct from old.published_at or new.closed_at is distinct from old.closed_at
       or new.created_by_admin is distinct from old.created_by_admin
       or new.on_behalf_name is distinct from old.on_behalf_name
       or new.hold_reason is distinct from old.hold_reason then
      perform public.raise_app_error('protected_field');
    end if;
    if old.status not in ('open', 'held') then perform public.raise_app_error('job_not_editable'); end if;
    if old.application_count > 0 and (
         new.subcategory_id is distinct from old.subcategory_id or new.mode is distinct from old.mode
         or new.budget_type is distinct from old.budget_type or new.budget_min is distinct from old.budget_min
         or new.budget_max is distinct from old.budget_max) then
      perform public.raise_app_error('job_locked_after_applications');
    end if;
    perform private.validate_budget(new.subcategory_id, new.mode, new.budget_type, new.budget_min, new.budget_max);
  end if;
  return new;
end $$;
create trigger jobs_guard before update on public.jobs
  for each row execute function private.guard_job_update();

create or replace function public.create_job(
  p_subcategory smallint, p_title text, p_description text, p_mode public.work_mode, p_city text,
  p_budget_type public.budget_type, p_budget_min integer, p_budget_max integer,
  p_timeline public.job_timeline, p_start_date date default null,
  p_skills text[] default '{}', p_attachment_paths text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_id uuid; v_held boolean;
begin
  if not exists (select 1 from public.poster_profiles where user_id = v_uid) then
    perform public.raise_app_error('poster_profile_required');
  end if;
  if public.is_feedback_blocked(v_uid) then perform public.raise_app_error('feedback_blocked'); end if;
  if (select count(*) from public.jobs where poster_id = v_uid and status in ('open', 'held'))
       >= public.setting_int('max_open_jobs_per_poster') then
    perform public.raise_app_error('open_jobs_limit');
  end if;
  perform private.validate_budget(p_subcategory, p_mode, p_budget_type, p_budget_min, p_budget_max);
  v_held := private.needs_moderation(p_title || ' ' || p_description);

  insert into public.jobs (poster_id, subcategory_id, title, description, skills, mode, city, budget_type,
                           budget_min, budget_max, timeline, start_date, attachment_paths, status, hold_reason,
                           expires_at)
  values (v_uid, p_subcategory, trim(p_title), trim(p_description), coalesce(p_skills, '{}'), p_mode,
          nullif(trim(p_city), ''), p_budget_type, p_budget_min, p_budget_max, p_timeline, p_start_date,
          coalesce(p_attachment_paths, '{}'),
          case when v_held then 'held'::public.job_status else 'open'::public.job_status end,
          case when v_held then 'keyword' end,
          now() + make_interval(days => public.setting_int('job_open_days')))
  returning id into v_id;

  update public.poster_profiles set jobs_posted = jobs_posted + 1 where user_id = v_uid;
  return v_id;
end $$;

create table public.job_claims (
  job_id     uuid primary key references public.jobs (id) on delete cascade,
  phone      text not null,
  token      text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  claimed_at timestamptz
);

-- Admin posts on a poster's behalf (used to hand-seed the first jobs).
create or replace function public.admin_post_job(
  p_on_behalf_name text, p_claim_phone text, p_subcategory smallint, p_title text, p_description text,
  p_mode public.work_mode, p_city text, p_budget_type public.budget_type, p_budget_min integer,
  p_budget_max integer, p_timeline public.job_timeline)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_id uuid; v_poster uuid; v_phone text;
begin
  perform private.validate_budget(p_subcategory, p_mode, p_budget_type, p_budget_min, p_budget_max);
  v_phone := public.normalize_il_phone(p_claim_phone);
  if v_phone is null then perform public.raise_app_error('invalid_phone'); end if;
  select pp.user_id into v_poster from public.poster_profiles pp join public.profiles p on p.id = pp.user_id
   where p.phone = v_phone;
  insert into public.jobs (poster_id, subcategory_id, title, description, mode, city, budget_type, budget_min,
                           budget_max, timeline, expires_at, created_by_admin, on_behalf_name)
  values (v_poster, p_subcategory, trim(p_title), trim(p_description), p_mode, nullif(trim(p_city), ''),
          p_budget_type, p_budget_min, p_budget_max, p_timeline,
          now() + make_interval(days => public.setting_int('job_open_days')), v_admin, trim(p_on_behalf_name))
  returning id into v_id;
  if v_poster is not null then
    update public.poster_profiles set jobs_posted = jobs_posted + 1 where user_id = v_poster;
    perform private.notify(v_poster, 'job_posted_on_behalf', jsonb_build_object('job_id', v_id));
  else
    insert into public.job_claims (job_id, phone) values (v_id, v_phone);
    perform private.notify(null, 'job_claim_link', jsonb_build_object('job_id', v_id,
      'token', (select token from public.job_claims where job_id = v_id)), v_phone, false);
  end if;
  perform private.audit('job_posted_on_behalf', 'job', v_id::text, null, null, p_on_behalf_name);
  return v_id;
end $$;

-- Poster claims a job admin posted for them (link sent by WhatsApp).
create or replace function public.claim_job(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_job uuid;
begin
  if not exists (select 1 from public.poster_profiles where user_id = v_uid) then
    perform public.raise_app_error('poster_profile_required');
  end if;
  update public.job_claims set claimed_at = now()
   where token = p_token and claimed_at is null
  returning job_id into v_job;
  if v_job is null then perform public.raise_app_error('invalid_claim'); end if;
  update public.jobs set poster_id = v_uid where id = v_job and poster_id is null;
  update public.poster_profiles set jobs_posted = jobs_posted + 1 where user_id = v_uid;
  return v_job;
end $$;

create or replace function public.extend_job(p_job uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_exp timestamptz;
begin
  update public.jobs
     set expires_at = expires_at + make_interval(days => public.setting_int('job_extension_days')), extended = true
   where id = p_job and poster_id = v_uid and status = 'open' and not extended
  returning expires_at into v_exp;
  if v_exp is null then perform public.raise_app_error('cannot_extend'); end if;
  return v_exp;
end $$;

-- ---------------------------------------------------------------------------
-- Applications (Flow A)
-- ---------------------------------------------------------------------------
create table public.applications (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.jobs (id) on delete cascade,
  provider_id      uuid not null references public.provider_profiles (user_id) on delete cascade,
  pitch            text not null check (char_length(pitch) between 50 and 1000),
  proposed_price   integer check (proposed_price > 0),
  available_from   date,
  service_card_id  uuid references public.service_cards (id) on delete set null,
  status           public.application_status not null default 'sent',
  sent_at          timestamptz not null default now(),
  viewed_at        timestamptz,
  contacted_at     timestamptz,
  decided_at       timestamptz,
  credited_back_at timestamptz,
  unique (job_id, provider_id)
);
create index applications_provider_idx on public.applications (provider_id, sent_at desc);
create index applications_job_idx on public.applications (job_id, sent_at);
create index applications_unopened_idx on public.applications (sent_at)
  where viewed_at is null and credited_back_at is null;

-- Statuses still "in play" (eligible for a refund if the job ends without a hire).
create or replace function private.refundable_statuses()
returns public.application_status[] language sql immutable set search_path = '' as $$
  select array['sent', 'viewed', 'shortlisted', 'contacted', 'not_selected']::public.application_status[]
$$;

create or replace function private.credit_back(p_app uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.applications;
begin
  select * into a from public.applications where id = p_app for update;
  if a.id is null or a.credited_back_at is not null or a.status in ('hired', 'withdrawn', 'credited_back') then
    return;
  end if;
  perform private.apply_credit(a.provider_id, public.setting_int('apply_cost'), 'credit_back',
                               'application', a.id::text, p_reason);
  update public.applications set status = 'credited_back', credited_back_at = now() where id = a.id;
  perform private.notify(a.provider_id, 'credit_back_issued',
                         jsonb_build_object('application_id', a.id, 'job_id', a.job_id, 'reason', p_reason,
                                            'credits', public.setting_int('apply_cost')));
end $$;

create or replace function public.apply_to_job(p_job uuid, p_pitch text, p_proposed_price integer default null,
                                               p_available_from date default null,
                                               p_service_card uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); j public.jobs; v_id uuid; v_cost integer;
begin
  if not public.is_verified_provider(v_uid) then perform public.raise_app_error('not_verified'); end if;
  if public.is_feedback_blocked(v_uid) then perform public.raise_app_error('feedback_blocked'); end if;

  select * into j from public.jobs where id = p_job for update;   -- serializes the applicant cap
  if j.id is null then perform public.raise_app_error('not_found'); end if;
  if j.status <> 'open' or j.expires_at <= now() then perform public.raise_app_error('job_not_open'); end if;
  if j.poster_id = v_uid then perform public.raise_app_error('own_job'); end if;
  if j.poster_id is not null and public.is_blocked_between(v_uid, j.poster_id) then
    perform public.raise_app_error('blocked');
  end if;
  if j.application_count >= public.setting_int('job_applicant_cap') then
    perform public.raise_app_error('applicant_cap_reached');
  end if;
  if p_service_card is not null and not exists (select 1 from public.service_cards
                                                 where id = p_service_card and provider_id = v_uid) then
    perform public.raise_app_error('invalid_service_card');
  end if;

  v_cost := public.setting_int('apply_cost');
  begin
    insert into public.applications (job_id, provider_id, pitch, proposed_price, available_from, service_card_id)
    values (p_job, v_uid, trim(p_pitch), p_proposed_price, p_available_from, p_service_card)
    returning id into v_id;
  exception when unique_violation then
    perform public.raise_app_error('already_applied');
  end;
  perform private.apply_credit(v_uid, -v_cost, 'apply', 'application', v_id::text, j.title);
  update public.jobs set application_count = application_count + 1 where id = p_job;
  if j.poster_id is not null then
    perform private.notify(j.poster_id, 'new_application',
                           jsonb_build_object('job_id', j.id, 'application_id', v_id,
                                              'count', j.application_count + 1));
  end if;
  return v_id;
end $$;

create or replace function private.require_job_owner_for_app(p_app uuid)
returns public.applications language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); a public.applications;
begin
  select a2.* into a from public.applications a2 join public.jobs j on j.id = a2.job_id
   where a2.id = p_app and j.poster_id = v_uid
   for update of a2;
  if a.id is null then perform public.raise_app_error('not_found'); end if;
  return a;
end $$;

-- Opening the application detail (not the list) stops the 30-day credit-back timer.
create or replace function public.mark_application_viewed(p_app uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.applications := private.require_job_owner_for_app(p_app);
begin
  if a.viewed_at is null and a.credited_back_at is null then
    update public.applications
       set viewed_at = now(), status = case when status = 'sent' then 'viewed' else status end
     where id = a.id;
  end if;
end $$;

create or replace function public.shortlist_application(p_app uuid, p_on boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.applications := private.require_job_owner_for_app(p_app);
begin
  if a.status not in ('sent', 'viewed', 'shortlisted') then perform public.raise_app_error('invalid_state'); end if;
  update public.applications
     set status = case when p_on then 'shortlisted' else 'viewed' end,
         viewed_at = coalesce(viewed_at, now())
   where id = a.id;
end $$;

create or replace function public.decline_application(p_app uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.applications := private.require_job_owner_for_app(p_app);
begin
  if a.status not in ('sent', 'viewed', 'shortlisted', 'contacted') then perform public.raise_app_error('invalid_state'); end if;
  update public.applications set status = 'not_selected', decided_at = now(), viewed_at = coalesce(viewed_at, now())
   where id = a.id;
  perform private.notify(a.provider_id, 'not_selected', jsonb_build_object('job_id', a.job_id), null, true);
end $$;

-- "Contact" reveals both sides' phone and email (PRD 5.10).
create or replace function public.contact_applicant(p_app uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.applications := private.require_job_owner_for_app(p_app);
begin
  if a.status not in ('sent', 'viewed', 'shortlisted', 'contacted') then perform public.raise_app_error('invalid_state'); end if;
  update public.applications
     set status = 'contacted', contacted_at = coalesce(contacted_at, now()), viewed_at = coalesce(viewed_at, now())
   where id = a.id;
  if a.contacted_at is null then
    perform private.notify(a.provider_id, 'applicant_contacted',
                           jsonb_build_object('job_id', a.job_id, 'poster_id', auth.uid()));
  end if;
end $$;

create or replace function public.withdraw_application(p_app uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); a public.applications;
begin
  select * into a from public.applications where id = p_app and provider_id = v_uid for update;
  if a.id is null then perform public.raise_app_error('not_found'); end if;
  if a.status not in ('sent', 'viewed', 'shortlisted', 'contacted') then perform public.raise_app_error('invalid_state'); end if;
  update public.applications set status = 'withdrawn', decided_at = now() where id = a.id;   -- no refund (decision #8)
  update public.jobs set application_count = greatest(application_count - 1, 0) where id = a.job_id;
end $$;

-- ---------------------------------------------------------------------------
-- Engagements: the record that two sides agreed to work together (PRD 5.12)
-- ---------------------------------------------------------------------------
create table public.engagements (
  id             uuid primary key default gen_random_uuid(),
  source         public.engagement_source not null,
  application_id uuid unique references public.applications (id) on delete set null,
  request_id     uuid unique,
  job_id         uuid references public.jobs (id) on delete set null,
  poster_id      uuid not null references public.profiles (id) on delete cascade,
  provider_id    uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  extra_hire     boolean not null default false,
  created_at     timestamptz not null default now(),
  cancelled_at   timestamptz,
  cancel_reason  text
);
create index engagements_poster_idx on public.engagements (poster_id, created_at desc);
create index engagements_provider_idx on public.engagements (provider_id, created_at desc);

create or replace function private.create_engagement(p_source public.engagement_source, p_app uuid, p_req uuid,
                                                     p_job uuid, p_poster uuid, p_provider uuid, p_title text,
                                                     p_extra boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.engagements (source, application_id, request_id, job_id, poster_id, provider_id, title, extra_hire)
  values (p_source, p_app, p_req, p_job, p_poster, p_provider, p_title, p_extra)
  returning id into v_id;
  update public.provider_profiles set jobs_done = jobs_done + 1 where user_id = p_provider;
  return v_id;
end $$;

-- Hire one applicant (PRD 5.12). Further hires need admin approval.
create or replace function public.hire_application(p_app uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.applications := private.require_job_owner_for_app(p_app); j public.jobs; v_eng uuid; o record;
begin
  select * into j from public.jobs where id = a.job_id for update;
  if j.status = 'hired' then perform public.raise_app_error('job_already_hired'); end if;
  if j.status <> 'open' then perform public.raise_app_error('job_not_open'); end if;
  if a.status not in ('sent', 'viewed', 'shortlisted', 'contacted') then perform public.raise_app_error('invalid_state'); end if;

  update public.applications set status = 'hired', decided_at = now(), viewed_at = coalesce(viewed_at, now()),
         contacted_at = coalesce(contacted_at, now())
   where id = a.id;
  for o in update public.applications set status = 'not_selected', decided_at = now()
            where job_id = j.id and id <> a.id and status in ('sent', 'viewed', 'shortlisted', 'contacted')
            returning provider_id loop
    perform private.notify(o.provider_id, 'not_selected', jsonb_build_object('job_id', j.id));
  end loop;
  update public.jobs set status = 'hired', closed_at = now() where id = j.id;
  update public.poster_profiles set hires = hires + 1, jobs_closed = jobs_closed + 1 where user_id = j.poster_id;
  v_eng := private.create_engagement('application', a.id, null, j.id, j.poster_id, a.provider_id, j.title);
  perform private.notify(a.provider_id, 'you_were_hired', jsonb_build_object('job_id', j.id, 'engagement_id', v_eng));
  return v_eng;
end $$;

-- Extra hires (PRD 5.12, decision #9): poster asks, admin decides, both notified.
create table public.extra_hire_requests (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  poster_id      uuid not null references public.profiles (id) on delete cascade,
  status         public.review_state not null default 'open',
  decided_by     uuid references public.profiles (id),
  decided_at     timestamptz,
  reason         text,
  created_at     timestamptz not null default now()
);
create unique index extra_hire_one_open on public.extra_hire_requests (application_id) where status = 'open';

create or replace function public.request_extra_hire(p_app uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.applications := private.require_job_owner_for_app(p_app); v_id uuid;
begin
  if (select status from public.jobs where id = a.job_id) <> 'hired' then perform public.raise_app_error('invalid_state'); end if;
  if a.status in ('hired', 'withdrawn', 'credited_back') then perform public.raise_app_error('invalid_state'); end if;
  insert into public.extra_hire_requests (job_id, application_id, poster_id)
  values (a.job_id, a.id, auth.uid()) returning id into v_id;
  return v_id;
exception when unique_violation then
  perform public.raise_app_error('already_requested');
  return null;
end $$;

create or replace function public.decide_extra_hire(p_request uuid, p_approve boolean, p_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('reviewer'); r public.extra_hire_requests; a public.applications;
        j public.jobs; v_eng uuid;
begin
  select * into r from public.extra_hire_requests where id = p_request and status = 'open' for update;
  if r.id is null then perform public.raise_app_error('not_found'); end if;
  select * into a from public.applications where id = r.application_id for update;
  select * into j from public.jobs where id = r.job_id;
  update public.extra_hire_requests
     set status = case when p_approve then 'approved'::public.review_state else 'declined'::public.review_state end,
         decided_by = v_admin, decided_at = now(), reason = p_reason
   where id = r.id;
  if p_approve then
    if a.status in ('hired', 'withdrawn', 'credited_back') then perform public.raise_app_error('invalid_state'); end if;
    update public.applications set status = 'hired', decided_at = now(), contacted_at = coalesce(contacted_at, now())
     where id = a.id;
    update public.poster_profiles set hires = hires + 1 where user_id = j.poster_id;
    v_eng := private.create_engagement('application', a.id, null, j.id, j.poster_id, a.provider_id, j.title, true);
  end if;
  perform private.notify(r.poster_id, case when p_approve then 'extra_hire_approved' else 'extra_hire_declined' end,
                         jsonb_build_object('job_id', j.id, 'application_id', a.id));
  perform private.notify(a.provider_id, case when p_approve then 'you_were_hired' else 'extra_hire_declined' end,
                         jsonb_build_object('job_id', j.id, 'engagement_id', v_eng));
  perform private.audit(case when p_approve then 'extra_hire_approved' else 'extra_hire_declined' end,
                        'extra_hire_request', r.id::text, null, null, p_reason);
  return v_eng;
end $$;

-- End a job without a hire: every application still in play is refunded.
create or replace function private.end_job_without_hire(p_job uuid, p_status public.job_status, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare j public.jobs; a record;
begin
  select * into j from public.jobs where id = p_job for update;
  if j.status not in ('open', 'held') then return; end if;
  update public.jobs set status = p_status, closed_at = now() where id = j.id;
  if j.poster_id is not null and j.status = 'open' then
    update public.poster_profiles set jobs_closed = jobs_closed + 1 where user_id = j.poster_id;
  end if;
  for a in select id from public.applications
            where job_id = j.id and status = any (private.refundable_statuses()) loop
    perform private.credit_back(a.id, p_reason);
  end loop;
end $$;

create or replace function public.close_job(p_job uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  if not exists (select 1 from public.jobs where id = p_job and poster_id = v_uid and status in ('open', 'held')) then
    perform public.raise_app_error('not_found');
  end if;
  perform private.end_job_without_hire(p_job, 'closed_no_hire', 'job_closed_without_hire');
end $$;

create or replace function public.admin_remove_job(p_job uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('reviewer'); v_poster uuid;
begin
  if coalesce(trim(p_reason), '') = '' then perform public.raise_app_error('reason_required'); end if;
  select poster_id into v_poster from public.jobs where id = p_job;
  perform private.end_job_without_hire(p_job, 'removed', 'job_removed_by_admin');
  update public.jobs set hold_reason = p_reason where id = p_job;
  if v_poster is not null then
    perform private.notify(v_poster, 'job_removed', jsonb_build_object('job_id', p_job, 'reason', p_reason));
  end if;
  perform private.audit('job_removed', 'job', p_job::text, null, null, p_reason);
end $$;

create or replace function public.admin_release_job(p_job uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('reviewer');
begin
  update public.jobs set status = 'open', hold_reason = null,
         expires_at = now() + make_interval(days => public.setting_int('job_open_days'))
   where id = p_job and status = 'held';
  if not found then perform public.raise_app_error('not_found'); end if;
  perform private.audit('job_released', 'job', p_job::text);
end $$;

-- Mistaken hire reversed by support within 48h (PRD 5.12).
create or replace function public.admin_cancel_engagement(p_engagement uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); e public.engagements;
begin
  select * into e from public.engagements where id = p_engagement and cancelled_at is null for update;
  if e.id is null then perform public.raise_app_error('not_found'); end if;
  if e.created_at < now() - make_interval(hours => public.setting_int('hire_reversal_hours')) then
    perform public.raise_app_error('reversal_window_passed');
  end if;
  update public.engagements set cancelled_at = now(), cancel_reason = p_reason where id = e.id;
  update public.provider_profiles set jobs_done = greatest(jobs_done - 1, 0) where user_id = e.provider_id;
  if e.application_id is not null then
    update public.applications set status = 'not_selected' where id = e.application_id;
    update public.poster_profiles set hires = greatest(hires - 1, 0) where user_id = e.poster_id;
    if not e.extra_hire then
      update public.jobs set status = 'open', closed_at = null
       where id = e.job_id and status = 'hired' and expires_at > now();
      if found then
        update public.poster_profiles set jobs_closed = greatest(jobs_closed - 1, 0) where user_id = e.poster_id;
      end if;
    end if;
  end if;
  delete from public.feedback_requests where engagement_id = e.id;
  perform private.audit('engagement_cancelled', 'engagement', e.id::text, null, null, p_reason);
end $$;

-- ---------------------------------------------------------------------------
-- Direct requests (Flow B, PRD 5.11)
-- ---------------------------------------------------------------------------
create table public.direct_requests (
  id             uuid primary key default gen_random_uuid(),
  poster_id      uuid not null references public.poster_profiles (user_id) on delete cascade,
  provider_id    uuid not null references public.provider_profiles (user_id) on delete cascade,
  job_id         uuid references public.jobs (id) on delete set null,
  subcategory_id smallint not null references public.subcategories (id),
  title          text not null check (char_length(title) between 5 and 80),
  description    text not null check (char_length(description) between 20 and 1000),
  mode           public.work_mode not null,
  city           text,
  budget_type    public.budget_type not null,
  budget_min     integer,
  budget_max     integer,
  timeline       public.job_timeline not null,
  status         public.request_status not null default 'pending',
  decline_reason text check (char_length(decline_reason) <= 300),
  sent_at        timestamptz not null default now(),
  expires_at     timestamptz not null,
  responded_at   timestamptz
);
create unique index direct_requests_one_open on public.direct_requests (poster_id, provider_id) where status = 'pending';
create index direct_requests_provider_idx on public.direct_requests (provider_id, status, sent_at desc);
create index direct_requests_poster_idx on public.direct_requests (poster_id, sent_at desc);
alter table public.engagements add constraint engagements_request_fk
  foreign key (request_id) references public.direct_requests (id) on delete set null;

create or replace function public.send_direct_request(
  p_provider uuid, p_subcategory smallint, p_title text, p_description text, p_mode public.work_mode,
  p_city text, p_budget_type public.budget_type, p_budget_min integer, p_budget_max integer,
  p_timeline public.job_timeline, p_job uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_id uuid;
begin
  if not exists (select 1 from public.poster_profiles where user_id = v_uid) then
    perform public.raise_app_error('poster_profile_required');
  end if;
  if p_provider = v_uid then perform public.raise_app_error('own_profile'); end if;
  if public.is_feedback_blocked(v_uid) then perform public.raise_app_error('feedback_blocked'); end if;
  if not public.is_verified_provider(p_provider) then perform public.raise_app_error('provider_unavailable'); end if;
  if public.is_blocked_between(v_uid, p_provider) then perform public.raise_app_error('provider_unavailable'); end if;
  if (select count(*) from public.direct_requests where poster_id = v_uid and sent_at > now() - interval '1 day')
       >= public.setting_int('max_requests_per_poster_day') then
    perform public.raise_app_error('daily_request_limit');
  end if;
  if p_job is not null and not exists (select 1 from public.jobs where id = p_job and poster_id = v_uid) then
    perform public.raise_app_error('invalid_job');
  end if;
  if p_mode <> 'remote' and coalesce(trim(p_city), '') = '' then perform public.raise_app_error('city_required'); end if;
  perform private.validate_budget(p_subcategory, p_mode, p_budget_type, p_budget_min, p_budget_max);
  begin
    insert into public.direct_requests (poster_id, provider_id, job_id, subcategory_id, title, description, mode, city,
                                        budget_type, budget_min, budget_max, timeline, expires_at)
    values (v_uid, p_provider, p_job, p_subcategory, trim(p_title), trim(p_description), p_mode, nullif(trim(p_city), ''),
            p_budget_type, p_budget_min, p_budget_max, p_timeline,
            now() + make_interval(days => public.setting_int('request_expiry_days')))
    returning id into v_id;
  exception when unique_violation then
    perform public.raise_app_error('request_already_open');
  end;
  perform private.notify(p_provider, 'direct_request_received', jsonb_build_object('request_id', v_id));
  return v_id;
end $$;

-- Provider approves (2 credits, contacts revealed) or declines (free).
create or replace function public.respond_direct_request(p_request uuid, p_approve boolean, p_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); r public.direct_requests; v_eng uuid; v_hours numeric;
begin
  select * into r from public.direct_requests where id = p_request and provider_id = v_uid for update;
  if r.id is null then perform public.raise_app_error('not_found'); end if;
  if r.status <> 'pending' or r.expires_at <= now() then perform public.raise_app_error('request_not_pending'); end if;
  v_hours := round((extract(epoch from now() - r.sent_at) / 3600)::numeric, 1);

  if p_approve then
    if not public.is_verified_provider(v_uid) then perform public.raise_app_error('not_verified'); end if;
    if public.is_feedback_blocked(v_uid) then perform public.raise_app_error('feedback_blocked'); end if;
    perform private.apply_credit(v_uid, -public.setting_int('request_cost'), 'request_approve',
                                 'direct_request', r.id::text, r.title);
    update public.direct_requests set status = 'approved', responded_at = now() where id = r.id;
    v_eng := private.create_engagement('request', null, r.id, r.job_id, r.poster_id, v_uid, r.title);
    perform private.notify(r.poster_id, 'request_approved', jsonb_build_object('request_id', r.id, 'engagement_id', v_eng));
  else
    update public.direct_requests set status = 'declined', responded_at = now(), decline_reason = p_reason where id = r.id;
    perform private.notify(r.poster_id, 'request_declined', jsonb_build_object('request_id', r.id), null, true);
  end if;

  -- Typical response time shown on the profile (rolling average).
  update public.provider_profiles
     set avg_response_hours = case when avg_response_hours is null then v_hours
                                   else round((avg_response_hours * 0.8 + v_hours * 0.2)::numeric, 1) end
   where user_id = v_uid;
  return v_eng;
end $$;

-- ---------------------------------------------------------------------------
-- Contact reveal: phone and email of the other side, only once the flow allows it
-- (application contacted/hired, or approved direct request).
-- ---------------------------------------------------------------------------
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
    return query select p.full_name, p.phone, p.email::text from public.profiles p where p.id = p_other;
  end if;
end $$;
