-- =============================================================================
-- 20261028000200 — Demo data support (founder request 2026-10-28)
--
-- Demo accounts and everything they create are tagged is_demo and shown with a
-- "דמו" badge. Demo and real users never transact with each other (applications,
-- direct requests, job alerts, matches). The whole dataset is loaded with
-- private.load_demo(jsonb) (file supabase/demo/load_demo.sql) and removed with
-- public.admin_purge_demo() or private.purge_demo().
-- =============================================================================

alter table public.profiles          add column is_demo boolean not null default false;
alter table public.provider_profiles add column is_demo boolean not null default false;
alter table public.poster_profiles   add column is_demo boolean not null default false;
alter table public.jobs              add column is_demo boolean not null default false;
create index profiles_demo_idx on public.profiles (id) where is_demo;

-- ---------------------------------------------------------------------------
-- Demo and real users never mix
-- ---------------------------------------------------------------------------
create or replace function private.guard_demo_application()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('joby.loading_demo', true) = 'on' then return new; end if;
  if (select is_demo from public.jobs where id = new.job_id)
     is distinct from (select is_demo from public.provider_profiles where user_id = new.provider_id) then
    perform public.raise_app_error('demo_mismatch');
  end if;
  return new;
end $$;
create trigger applications_demo_guard before insert on public.applications
  for each row execute function private.guard_demo_application();

create or replace function private.guard_demo_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('joby.loading_demo', true) = 'on' then return new; end if;
  if (select is_demo from public.poster_profiles where user_id = new.poster_id)
     is distinct from (select is_demo from public.provider_profiles where user_id = new.provider_id) then
    perform public.raise_app_error('demo_mismatch');
  end if;
  return new;
end $$;
create trigger direct_requests_demo_guard before insert on public.direct_requests
  for each row execute function private.guard_demo_request();

-- Jobs created by demo posters are demo jobs.
create or replace function private.tag_demo_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.poster_id is not null and exists (select 1 from public.poster_profiles where user_id = new.poster_id and is_demo) then
    new.is_demo := true;
  end if;
  return new;
end $$;
create trigger jobs_tag_demo before insert on public.jobs
  for each row execute function private.tag_demo_job();

-- Job alerts: skipped while loading demo data; only to providers on the same side.
create or replace function private.job_alerts()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if current_setting('joby.loading_demo', true) = 'on' then return null; end if;
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open') then
    for r in select p.user_id from public.provider_profiles p join public.profiles u on u.id = p.user_id
              where p.verification_status = 'approved' and u.status = 'active'
                and p.is_demo = new.is_demo
                and p.user_id is distinct from new.poster_id
                and coalesce(u.notification_prefs ->> 'job_alerts', 'instant') <> 'off'
                and (new.poster_id is null or not public.is_blocked_between(p.user_id, new.poster_id))
                and private.job_matches_provider(new, p.user_id) loop
      perform private.notify(r.user_id, 'job_alert', jsonb_build_object('job_id', new.id, 'title', new.title));
    end loop;
  end if;
  return null;
end $$;

-- Matches: demo providers see demo jobs, real providers see real jobs.
create or replace function public.my_matching_jobs()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select j.id from public.jobs j
   where j.status = 'open' and j.expires_at > now()
     and j.poster_id is distinct from auth.uid()
     and j.is_demo = coalesce((select is_demo from public.provider_profiles where user_id = auth.uid()), false)
     and private.job_matches_provider(j, auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Loader
-- ---------------------------------------------------------------------------
-- Shift every timestamp (keys ending in _at) and date (_until, start_date, available_from)
-- so the dataset is "fresh" whenever it is loaded.
create or replace function private.demo_shift(p_rows jsonb, p_shift interval)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg((
    select jsonb_object_agg(e.key, case
      when jsonb_typeof(e.value) <> 'string' then e.value
      when e.key ~ '_at$' then to_jsonb((e.value #>> '{}')::timestamptz + p_shift)
      when e.key in ('busy_until', 'start_date', 'available_from')
        then to_jsonb(((e.value #>> '{}')::date + floor(extract(epoch from p_shift) / 86400)::int)::text)
      else e.value end)
    from jsonb_each(r) e) order by ord), '[]'::jsonb)
  from jsonb_array_elements(p_rows) with ordinality as x(r, ord)
$$;

-- Subcategories are referenced by slug in the data file (ids differ per database).
create or replace function private.demo_map_sub(p_rows jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(case when r ? 'subcategory_slug'
           then (r - 'subcategory_slug') || jsonb_build_object('subcategory_id',
                  (select s.id from public.subcategories s where s.slug = r ->> 'subcategory_slug'))
           else r end order by ord), '[]'::jsonb)
  from jsonb_array_elements(p_rows) with ordinality as x(r, ord)
$$;

-- Insert rows (all with the same keys) into public.<table>; omitted columns take their defaults.
create or replace function private.demo_insert(p_table text, p_rows jsonb, p_shift interval)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_cols text; v_rows jsonb; n integer;
begin
  if p_rows is null or jsonb_array_length(p_rows) = 0 then return 0; end if;
  v_rows := private.demo_map_sub(private.demo_shift(p_rows, p_shift));
  select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(v_rows -> 0) k;
  execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)',
                 p_table, v_cols, v_cols, p_table) using v_rows;
  get diagnostics n = row_count;
  return n;
end $$;

-- Accounts. Most demo users cannot sign in (no phone, no password). The "hero" accounts
-- have a phone number that must be registered as a test number in Supabase Auth.
create or replace function private.demo_insert_users(p_users jsonb, p_shift interval)
returns void language plpgsql security definer set search_path = '' as $$
declare v_rows jsonb := private.demo_shift(p_users, p_shift); c text; u record;
begin
  insert into auth.users (id, phone, email, phone_confirmed_at, raw_user_meta_data, created_at)
  select (x ->> 'id')::uuid, x ->> 'phone', x ->> 'email', (x ->> 'phone_confirmed_at')::timestamptz,
         coalesce(x -> 'meta', '{}'::jsonb), (x ->> 'created_at')::timestamptz
    from jsonb_array_elements(v_rows) x;

  -- Hosted Supabase Auth reads these columns; NULL text tokens break sign-in.
  for c in select column_name from information_schema.columns
            where table_schema = 'auth' and table_name = 'users'
              and column_name in ('confirmation_token', 'recovery_token', 'email_change_token_new', 'email_change',
                                  'email_change_token_current', 'phone_change', 'phone_change_token', 'reauthentication_token') loop
    execute format('update auth.users set %I = %L where id in (select (x ->> ''id'')::uuid from jsonb_array_elements($1) x)', c, '')
      using v_rows;
  end loop;
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'aud') then
    execute $q$update auth.users u set aud = 'authenticated', role = 'authenticated',
                 instance_id = '00000000-0000-0000-0000-000000000000',
                 raw_app_meta_data = case when u.phone is not null then '{"provider":"phone","providers":["phone"]}'::jsonb
                                          else '{"provider":"email","providers":["email"]}'::jsonb end,
                 updated_at = now()
               where id in (select (x ->> 'id')::uuid from jsonb_array_elements($1) x)$q$ using v_rows;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
    for u in select (x ->> 'id')::uuid as id, x ->> 'phone' as phone from jsonb_array_elements(v_rows) x where x ->> 'phone' is not null loop
      execute $q$insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
                 values ($1::text, $1, jsonb_build_object('sub', $1::text, 'phone', $2, 'phone_verified', true, 'email_verified', false),
                         'phone', now(), now(), now())$q$ using u.id, u.phone;
    end loop;
  end if;
end $$;

create or replace function private.load_demo(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_shift interval; v_counts jsonb := '{}'::jsonb; t text; n integer; r record;
begin
  if exists (select 1 from public.profiles where is_demo) then
    raise exception 'demo_already_loaded: run select private.purge_demo(); first';
  end if;
  v_shift := date_trunc('minute', now()) - (p ->> 'reference_time')::timestamptz;
  perform set_config('joby.loading_demo', 'on', true);

  perform private.demo_insert_users(p -> 'users', v_shift);
  update public.profiles pr
     set is_demo = true, is_provider = x.is_provider, is_poster = x.is_poster, full_name = x.full_name,
         terms_accepted_at = x.created_at, created_at = x.created_at
    from jsonb_to_recordset(private.demo_shift(p -> 'users', v_shift))
         as x(id uuid, is_provider boolean, is_poster boolean, full_name text, created_at timestamptz)
   where pr.id = x.id;

  foreach t in array array['poster_profiles', 'provider_profiles', 'provider_subcategories', 'provider_skills',
                           'service_cards', 'verification_requests', 'spouse_links', 'jobs', 'applications',
                           'direct_requests', 'engagements', 'feedback_requests', 'feedback', 'credit_transactions',
                           'extra_hire_requests', 'job_saves', 'notifications'] loop
    n := private.demo_insert(t, p -> t, v_shift);
    v_counts := v_counts || jsonb_build_object(t, n);
  end loop;

  -- Wallets (created by trigger) take the final ledger balance.
  update public.provider_wallets w set balance = x.balance
    from jsonb_to_recordset(p -> 'wallets') as x(provider_id uuid, balance integer)
   where w.provider_id = x.provider_id;

  -- Counters and ratings, computed exactly as the live rules do.
  update public.poster_profiles pp set
         jobs_posted = (select count(*) from public.jobs j where j.poster_id = pp.user_id),
         jobs_closed = (select count(*) from public.jobs j where j.poster_id = pp.user_id
                          and j.status in ('hired', 'closed_no_hire', 'expired')),
         hires = (select count(*) from public.engagements e where e.poster_id = pp.user_id and e.source = 'application'
                    and e.cancelled_at is null)
   where pp.is_demo;
  update public.provider_profiles p set
         jobs_done = (select count(*) from public.engagements e where e.provider_id = p.user_id and e.cancelled_at is null)
   where p.is_demo;
  for r in select user_id from public.provider_profiles where is_demo loop
    perform private.recompute_rating(r.user_id, 'poster_to_provider');
  end loop;
  for r in select user_id from public.poster_profiles where is_demo loop
    perform private.recompute_rating(r.user_id, 'provider_to_poster');
  end loop;

  perform private.audit('demo_loaded', 'demo', 'all', null, v_counts);
  return v_counts;
end $$;

-- Remove every demo account and everything attached to it (cascades from auth.users).
create or replace function private.purge_demo()
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.job_saves s using public.jobs j where s.job_id = j.id and j.is_demo;
  delete from auth.users where id in (select id from public.profiles where is_demo);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.admin_purge_demo()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); n integer;
begin
  n := private.purge_demo();
  perform private.audit('demo_purged', 'demo', 'all', null, null, n::text);
  return n;
end $$;

revoke all on function private.guard_demo_application(), private.guard_demo_request(), private.tag_demo_job(),
  private.demo_shift(jsonb, interval), private.demo_map_sub(jsonb), private.demo_insert(text, jsonb, interval),
  private.demo_insert_users(jsonb, interval), private.load_demo(jsonb), private.purge_demo()
  from public, anon, authenticated;
revoke all on function public.admin_purge_demo() from public, anon;
grant execute on function public.admin_purge_demo() to authenticated, service_role;
