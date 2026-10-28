-- =============================================================================
-- Demo data: loads supabase/demo/load_demo.sql, checks it obeys the live rules,
-- checks demo and real users cannot transact, then removes it all again.
-- =============================================================================
\set QUIET on
set client_min_messages = warning;

\ir ../demo/load_demo.sql

do $$
declare n integer; bad integer;
begin
  -- Everything is tagged.
  select count(*) into n from public.profiles where is_demo;
  if n <> 128 then raise exception 'FAILED: expected 128 demo profiles, got %', n; end if;
  if exists (select 1 from public.provider_profiles where not is_demo) or exists (select 1 from public.jobs where not is_demo) then
    raise exception 'FAILED: untagged demo rows';
  end if;
  -- Wallet = ledger, never negative.
  select count(*) into bad from public.provider_wallets w
   where w.balance <> coalesce((select sum(amount) from public.credit_transactions t where t.provider_id = w.provider_id), 0)
      or w.balance < 0;
  if bad > 0 then raise exception 'FAILED: % wallets differ from their ledger', bad; end if;
  -- Dates were shifted to "now": the newest job is recent and open jobs are still open.
  if (select max(published_at) from public.jobs) < now() - interval '2 days' then raise exception 'FAILED: dates not shifted'; end if;
  if not exists (select 1 from public.jobs where status = 'open' and expires_at > now()) then raise exception 'FAILED: no open jobs'; end if;
  -- Counters and ratings follow the live rules.
  if exists (select 1 from public.jobs j where application_count <> (select count(*) from public.applications a where a.job_id = j.id)) then
    raise exception 'FAILED: application_count';
  end if;
  if (select count(*) from public.provider_profiles where rating_count >= 3) < 5 then raise exception 'FAILED: too few rated providers'; end if;
  if (select rating_count from public.provider_profiles p join public.profiles u on u.id = p.user_id where u.phone = '+972500000101') < 3 then
    raise exception 'FAILED: Yossi should have a visible rating';
  end if;
  -- Admin queues have work to show.
  if (select count(*) from public.verification_requests where status = 'pending') < 5 then raise exception 'FAILED: pending verifications'; end if;
  if not exists (select 1 from public.jobs where status = 'held') then raise exception 'FAILED: held job'; end if;
  -- Sign-in accounts have phones; the rest do not.
  if (select count(*) from public.profiles where is_demo and phone is not null) <> 4 then raise exception 'FAILED: four demo sign-in accounts'; end if;
  -- Loading twice is refused.
  begin
    perform private.load_demo('{"reference_time":"2026-10-25T15:00:00Z"}'::jsonb);
    raise exception 'FAILED: second load accepted';
  exception when others then
    if sqlerrm not like '%demo_already_loaded%' then raise; end if;
  end;
end $$;

-- A real provider cannot apply to a demo job; a real poster cannot request a demo provider.
insert into auth.users (phone, phone_confirmed_at, raw_user_meta_data)
values ('972500000201', now(), '{"full_name": "Real Provider"}'), ('972500000202', now(), '{"full_name": "Real Poster"}');
do $$
declare v_real uuid := (select id from public.profiles where phone = '+972500000201');
        v_poster uuid := (select id from public.profiles where phone = '+972500000202');
        v_job uuid := (select id from public.jobs where status = 'open' and expires_at > now() limit 1);
        v_demo_provider uuid := (select user_id from public.provider_profiles where verification_status = 'approved' limit 1);
begin
  insert into public.provider_profiles (user_id, provider_type, verification_status, display_name)
  values (v_real, 'reservist', 'approved', 'Real P.');
  insert into public.poster_profiles (user_id, display_name, poster_type, city) values (v_poster, 'Real P.', 'private', 'חיפה');
  begin
    insert into public.applications (job_id, provider_id, pitch)
    values (v_job, v_real, repeat('real provider pitch ', 4));
    raise exception 'FAILED: real provider applied to a demo job';
  exception when others then
    if sqlerrm not like '%demo_mismatch%' then raise; end if;
  end;
  begin
    insert into public.direct_requests (poster_id, provider_id, subcategory_id, title, description, mode, city, budget_type, timeline, expires_at)
    values (v_poster, v_demo_provider, (select id from public.subcategories where slug = 'electricity'), 'Real request',
            'A real poster tries to reach a demo provider.', 'onsite', 'חיפה', 'open_to_quotes', 'week', now() + interval '7 days');
    raise exception 'FAILED: real poster reached a demo provider';
  exception when others then
    if sqlerrm not like '%demo_mismatch%' then raise; end if;
  end;
  -- Matches never mix sides.
  perform set_config('request.jwt.claim.sub', v_real::text, true);
  if exists (select 1 from public.my_matching_jobs()) then raise exception 'FAILED: demo job in a real provider''s matches'; end if;
end $$;

-- Purge removes every demo row and nothing else.
do $$
declare n integer;
begin
  n := private.purge_demo();
  if n <> 128 then raise exception 'FAILED: purge removed % accounts', n; end if;
  if exists (select 1 from public.profiles where is_demo) or exists (select 1 from public.jobs)
     or exists (select 1 from public.credit_transactions) or exists (select 1 from public.feedback) then
    raise exception 'FAILED: demo rows left after purge';
  end if;
  if (select count(*) from public.profiles) <> 2 then raise exception 'FAILED: real users removed by purge'; end if;
end $$;
delete from auth.users where phone in ('972500000201', '972500000202');

\echo '  ✔ demo data tests passed'
