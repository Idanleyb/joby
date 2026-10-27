-- =============================================================================
-- Joby database tests: business rules from PRD v1.1, run end to end.
-- Plain SQL + assertions (no pgTAP needed). Run with `npm run test:db`.
-- Each block switches identity the way the API does: a JWT "sub" + role.
-- =============================================================================
\set QUIET on
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Test helpers
-- ---------------------------------------------------------------------------
drop schema if exists test cascade;
create schema test;
grant usage on schema test to anon, authenticated, service_role;

create table test.users (name text primary key, id uuid not null);
grant select on test.users to anon, authenticated, service_role;

create function test.uid(p_name text) returns uuid language sql stable as $$
  select id from test.users where name = p_name
$$;

create function test.login(p_name text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(test.uid(p_name)::text, ''), false);
end $$;

create function test.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FAILED: %', p_label; end if;
end $$;

create function test.expect_error(p_sql text, p_message text) returns void language plpgsql as $$
declare v_ran boolean := false;
begin
  begin
    execute p_sql;
    v_ran := true;
  exception when others then
    if position(p_message in sqlerrm) = 0 then
      raise exception 'FAILED: expected "%" but got "%" for: %', p_message, sqlerrm, p_sql;
    end if;
  end;
  if v_ran then raise exception 'FAILED: expected "%" but the statement succeeded: %', p_message, p_sql; end if;
end $$;

create function test.balance(p_name text) returns integer language sql security definer as $$
  select balance from public.provider_wallets where provider_id = test.uid(p_name)
$$;

create function test.sub(p_slug text) returns smallint language sql stable as $$
  select id from public.subcategories where slug = p_slug
$$;

grant execute on all functions in schema test to anon, authenticated, service_role;

-- Seed people (as the auth service would).
insert into auth.users (phone, phone_confirmed_at, raw_user_meta_data)
select phone, now(), jsonb_build_object('full_name', full_name)
from (values ('972500000001', 'Yossi Mizrahi'), ('972500000002', 'Noa Barak'), ('972500000003', 'Avi Mor'),
             ('972500000004', 'Dana Levi'),     ('972500000005', 'Ops Admin'), ('972500000006', 'Eli Cohen'),
             ('972500000007', 'Ruth Amsalem')) v(phone, full_name);
insert into test.users (name, id)
select n, u.id from auth.users u
join (values ('972500000001', 'yossi'), ('972500000002', 'noa'), ('972500000003', 'avi'), ('972500000004', 'dana'),
             ('972500000005', 'admin'), ('972500000006', 'eli'), ('972500000007', 'ruth')) v(phone, n)
  on v.phone = u.phone;
insert into public.admins (user_id, role) values (test.uid('admin'), 'admin');

select test.check((select count(*) from public.profiles) = 7, 'profiles created by auth trigger');
select test.check((select phone from public.profiles where id = test.uid('yossi')) = '+972500000001', 'phone normalized');

\echo '  1. sign-up and onboarding'
select test.login('yossi'); set role authenticated;
select public.complete_signup('Yossi Mizrahi', true, false);
select test.check((select verification_status = 'draft' and display_name = 'Yossi M.'
                   from public.provider_profiles where user_id = auth.uid()), 'draft provider with short name');
select test.check((select balance from public.provider_wallets where provider_id = auth.uid()) = 0, 'empty wallet');
reset role;

select test.login('avi'); set role authenticated;
select public.complete_signup('Avi Mor', false, true);
select test.expect_error($$select public.upsert_poster_profile('Acme', 'business', 'Tel Aviv')$$, 'company_required');
select public.upsert_poster_profile('Avi Mor', 'private', 'Rishon LeZion');
reset role;

select test.login('dana'); set role authenticated;
select public.complete_signup('Dana Levi', false, true);
select public.upsert_poster_profile('Dana Levi', 'hr', 'Petah Tikva', 'Brightpath Software');
reset role;

-- A user without a verified phone cannot finish sign-up (Google user before phone step).
update auth.users set phone_confirmed_at = null where id = test.uid('ruth');
select test.login('ruth'); set role authenticated;
select test.expect_error($$select public.complete_signup('Ruth', false, true)$$, 'phone_not_verified');
reset role;
update auth.users set phone_confirmed_at = now() where id = test.uid('ruth');

\echo '  2. job posting and the budget rule'
select test.login('avi'); set role authenticated;
select set_config('test.job_plumbing', public.create_job(test.sub('plumbing'), 'Leaking water heater in the bathroom',
  'Water heater leaks into the bathroom ceiling. Need someone this week in Rishon LeZion please.',
  'onsite', 'Rishon LeZion', 'open_to_quotes', null, null, 'asap')::text, false);
select test.expect_error($$select public.create_job(test.sub('development'), 'Landing page build',
  'We need a fast responsive landing page in Next.js with a signup form connected to our CRM.',
  'remote', null, 'open_to_quotes', null, null, 'month')$$, 'budget_required');
select test.expect_error($$select public.create_job(test.sub('painting'), 'Remote painting advice',
  'Video call to plan colors for a 4-room apartment, about one hour of consultation needed.',
  'remote', null, 'open_to_quotes', null, null, 'flexible')$$, 'budget_required');
select test.expect_error($$select public.create_job(test.sub('development'), 'Landing page build',
  'We need a fast responsive landing page in Next.js with a signup form connected to our CRM.',
  'remote', null, 'hourly', 40, 80, 'month')$$, 'budget_too_low');
select set_config('test.job_dev', public.create_job(test.sub('development'), 'Landing page for a new product',
  'We need a fast responsive landing page in Next.js with a signup form connected to our CRM.',
  'remote', null, 'fixed', 4000, 7000, 'month')::text, false);
select test.check((select jobs_posted from public.poster_profiles where user_id = auth.uid()) = 2, 'jobs_posted counter');
reset role;

\echo '  3. Form 3010 verification'
select test.login('yossi'); set role authenticated;
select test.expect_error(format($$select public.apply_to_job(%L, repeat('x', 60))$$, current_setting('test.job_plumbing')), 'not_verified');
-- the browser can never call the intake function directly
select test.expect_error(format($$select public.submit_verification(%L, 'form_3010', array['a/b.pdf'], '{}', 112, 'h')$$, auth.uid()), 'permission denied');
reset role;

-- server (service role) submits after AI extraction
set role service_role;
select set_config('test.ver_yossi', public.submit_verification(test.uid('yossi'), 'form_3010',
  array[test.uid('yossi') || '/3010-a.pdf', test.uid('yossi') || '/3010-b.pdf'],
  '{"forms": 2}', 112, 'hash-yossi')::text, false);
reset role;
select test.check((select verification_status from public.provider_profiles where user_id = test.uid('yossi')) = 'pending', 'pending after submit');

select test.login('yossi'); set role authenticated;
select test.expect_error(format($$select public.decide_verification(%L, 'approved')$$, current_setting('test.ver_yossi')), 'not_authorized');
reset role;

select test.login('admin'); set role authenticated;
select test.expect_error(format($$select public.decide_verification(%L, 'approved', null, 25)$$, current_setting('test.ver_yossi')), 'below_threshold');
select test.expect_error(format($$select public.decide_verification(%L, 'rejected')$$, current_setting('test.ver_yossi')), 'reason_required');
select test.check(cardinality(public.decide_verification(current_setting('test.ver_yossi')::uuid, 'approved')) = 2,
                  'decision returns files to delete');
reset role;
select test.check((select verification_status = 'approved' and days_band = '60-119' and verified_at is not null
                   from public.provider_profiles where user_id = test.uid('yossi')), 'yossi approved, 60-119 band');
select test.check(test.balance('yossi') = 100, '100 welcome credits');
select test.check((select extracted is null and days_total is null from public.verification_requests
                   where id = current_setting('test.ver_yossi')::uuid), 'extracted data wiped at decision');

-- Duplicate identity is flagged, not silently accepted.
select test.login('eli'); set role authenticated;
select public.complete_signup('Eli Cohen', true, false);
reset role;
set role service_role;
select public.submit_verification(test.uid('eli'), 'form_3010', array[test.uid('eli') || '/x.pdf'], '{}', 40, 'hash-yossi');
reset role;
select test.check((select duplicate_suspected from public.verification_requests where user_id = test.uid('eli')), 'duplicate ID flagged');

\echo '  4. profile protection and row-level security'
select test.login('yossi'); set role authenticated;
update public.provider_profiles set headline = 'Licensed electrician' where user_id = auth.uid();
select test.expect_error($$update public.provider_profiles set display_name = 'Someone Else' where user_id = auth.uid()$$, 'name_locked');
select test.expect_error($$update public.provider_profiles set verification_status = 'approved' where user_id = auth.uid()$$, 'permission denied');
select test.expect_error($$update public.provider_wallets set balance = 9999$$, 'permission denied');
insert into public.provider_subcategories (provider_id, subcategory_id) values
  (auth.uid(), test.sub('electricity')), (auth.uid(), test.sub('plumbing')), (auth.uid(), test.sub('repairs-handyman'));
-- unlimited subcategories (v1.3): a 4th and 5th are fine
insert into public.provider_subcategories (provider_id, subcategory_id) values (auth.uid(), test.sub('painting')), (auth.uid(), test.sub('carpentry'));
select test.check((select count(*) from public.provider_subcategories where provider_id = auth.uid()) = 5, 'unlimited subcategories');
delete from public.provider_subcategories where provider_id = auth.uid() and subcategory_id in (test.sub('painting'), test.sub('carpentry'));
-- skills keep their limit of 15
insert into public.provider_skills (provider_id, skill) select auth.uid(), 'skill ' || g from generate_series(1, 15) g;
select test.expect_error($$insert into public.provider_skills (provider_id, skill) values (auth.uid(), 'one too many')$$, 'limit_reached');
delete from public.provider_skills where provider_id = auth.uid();
select test.expect_error(format($$insert into public.provider_skills (provider_id, skill) values (%L, 'hack')$$, test.uid('avi')), 'row-level security');
reset role;

select set_config('request.jwt.claim.sub', '', false); set role anon;
select test.check((select count(*) from public.provider_profiles) = 1, 'anon sees only approved providers');
select test.check((select count(*) from public.provider_wallets) = 0, 'anon cannot see wallets');
select test.check((select count(*) from public.profiles) = 0, 'anon cannot see private profiles');
select test.check((select count(*) from public.provider_subcategories) = 3, 'anon sees approved provider categories');
select test.check((select count(*) from public.jobs) = 2, 'anon sees open jobs');
select test.expect_error($$select public.create_job(1::smallint, 'x', 'y', 'remote', null, 'fixed', 100, 200, 'asap')$$, 'permission denied');
reset role;

select test.login('eli'); set role authenticated;
select test.check((select count(*) from public.provider_profiles) = 2, 'pending provider sees approved + self');
select test.check((select count(*) from public.provider_wallets) = 1, 'own wallet only');
reset role;

\echo '  5. Flow A: apply, credits, contact reveal, hire'
select test.login('yossi'); set role authenticated;
select test.expect_error(format($$select public.apply_to_job(%L, 'too short')$$, current_setting('test.job_plumbing')), 'check constraint');
select set_config('test.app_yossi_plumbing', public.apply_to_job(current_setting('test.job_plumbing')::uuid,
  'Licensed plumber in Rishon, 12 years of experience. I can come tomorrow morning with all parts.')::text, false);
select test.check(test.balance('yossi') = 90, 'apply costs 10');
select test.expect_error(format($$select public.apply_to_job(%L, repeat('again ', 12))$$, current_setting('test.job_plumbing')), 'already_applied');
select test.check(test.balance('yossi') = 90, 'no charge on duplicate apply');
select test.check((select count(*) from public.get_contact(test.uid('avi'))) = 0, 'no contact before Contact');
reset role;

select test.login('dana'); set role authenticated;
select test.check((select count(*) from public.applications) = 0, 'other posters cannot see applications');
select test.expect_error(format($$select public.hire_application(%L)$$, current_setting('test.app_yossi_plumbing')), 'not_found');
reset role;

select test.login('avi'); set role authenticated;
select test.check((select count(*) from public.applications) = 1, 'poster sees applications to own job');
select public.mark_application_viewed(current_setting('test.app_yossi_plumbing')::uuid);
select public.contact_applicant(current_setting('test.app_yossi_plumbing')::uuid);
select test.check((select phone from public.get_contact(test.uid('yossi'))) = '+972500000001', 'contact revealed to poster');
reset role;
select test.login('yossi'); set role authenticated;
select test.check((select phone from public.get_contact(test.uid('avi'))) = '+972500000003', 'contact revealed to provider');
reset role;

\echo '  6. spouse linking'
select test.login('yossi'); set role authenticated;
select test.expect_error($$select public.invite_spouse('Noa', '12345')$$, 'invalid_phone');
select public.invite_spouse('Noa Barak', '050-000-0002');
select test.expect_error($$select public.invite_spouse('Someone', '0500000009')$$, 'spouse_link_exists');
reset role;
select test.check((select to_phone from public.notifications where event = 'spouse_invite') = '+972500000002', 'invite queued to WhatsApp');

-- the token arrives in the WhatsApp invite link
select set_config('test.invite_token', (select invite_token from public.spouse_links where invite_phone = '+972500000002'), false);
select test.login('noa'); set role authenticated;
select test.check((select count(*) from public.spouse_links) = 0, 'invite not visible to others before accepting');
select public.complete_signup('Noa Barak', false, false);
select test.expect_error($$select public.accept_spouse_invite('wrong-token')$$, 'invite_invalid');
select public.accept_spouse_invite(current_setting('test.invite_token'));
select test.check((select provider_type from public.provider_profiles where user_id = auth.uid()) = 'spouse', 'spouse profile created');
reset role;
set role service_role;
select set_config('test.ver_noa', public.submit_verification(test.uid('noa'), 'spouse',
  array[test.uid('noa') || '/marriage.pdf'], '{}', null, null)::text, false);
reset role;
select test.login('admin'); set role authenticated;
select public.decide_verification(current_setting('test.ver_noa')::uuid, 'approved');
reset role;
select test.check(test.balance('noa') = 100 and public.is_verified_provider(test.uid('noa')), 'spouse approved with credits');
select test.check((select status from public.spouse_links where spouse_user_id = test.uid('noa')) = 'approved', 'link approved');

\echo '  7. hire, one hire per job, extra hire by admin'
select test.login('noa'); set role authenticated;
select set_config('test.app_noa_plumbing', public.apply_to_job(current_setting('test.job_plumbing')::uuid,
  'My partner and I run a small repairs business; I handle bookings and smaller plumbing jobs.')::text, false);
reset role;
select test.login('avi'); set role authenticated;
select set_config('test.eng_1', public.hire_application(current_setting('test.app_yossi_plumbing')::uuid)::text, false);
select test.check((select status from public.jobs where id = current_setting('test.job_plumbing')::uuid) = 'hired', 'job hired');
select test.check((select status from public.applications where id = current_setting('test.app_noa_plumbing')::uuid) = 'not_selected', 'others not selected');
select test.expect_error(format($$select public.hire_application(%L)$$, current_setting('test.app_noa_plumbing')), 'job_already_hired');
select set_config('test.extra', public.request_extra_hire(current_setting('test.app_noa_plumbing')::uuid)::text, false);
reset role;
select test.login('admin'); set role authenticated;
select public.decide_extra_hire(current_setting('test.extra')::uuid, true, 'Two technicians needed');
reset role;
select test.check((select count(*) from public.engagements where job_id = current_setting('test.job_plumbing')::uuid) = 2, 'extra hire engagement');
select test.check((select count(*) from public.notifications where event = 'extra_hire_approved' and user_id = test.uid('avi')) = 1, 'poster notified of extra hire');
select test.check((select hires from public.poster_profiles where user_id = test.uid('avi')) = 2, 'poster hire count');

\echo '  8. closing without a hire refunds; withdrawals do not'
select test.login('avi'); set role authenticated;
select set_config('test.job_paint', public.create_job(test.sub('painting'), 'Paint a 4-room apartment',
  'About 110 square meters of walls, white, plus repairs to two cracks. Ramat Gan, before move-in.',
  'onsite', 'Ramat Gan', 'open_to_quotes', null, null, 'week')::text, false);
reset role;
select test.login('yossi'); set role authenticated;
select public.apply_to_job(current_setting('test.job_paint')::uuid, 'Painter and handyman, can start Sunday, references available.');
reset role;
select test.login('noa'); set role authenticated;
select set_config('test.app_noa_paint', public.apply_to_job(current_setting('test.job_paint')::uuid,
  'Interior painting, two-person team, clean and on schedule. Happy to visit for a quote.')::text, false);
select public.withdraw_application(current_setting('test.app_noa_paint')::uuid);
reset role;
select test.check(test.balance('yossi') = 80 and test.balance('noa') = 80, 'both charged');
select test.login('avi'); set role authenticated;
select public.close_job(current_setting('test.job_paint')::uuid);
reset role;
select test.check(test.balance('yossi') = 90, 'yossi refunded on close without hire');
select test.check(test.balance('noa') = 80, 'withdrawn application not refunded');

\echo '  9. timers: unopened credit-back, expiry, opened applications are not refunded'
select test.login('dana'); set role authenticated;
select set_config('test.job_hr', public.create_job(test.sub('project-management'), 'Project manager for an office move',
  'Coordinate contractors, IT and logistics for a 60-person office move in November, on site.',
  'onsite', 'Petah Tikva', 'hourly', 160, 230, 'asap')::text, false);
reset role;
select test.login('yossi'); set role authenticated;
select set_config('test.app_unopened', public.apply_to_job(current_setting('test.job_hr')::uuid,
  'Ran three office moves as an operations lead, including IT cut-over and vendor coordination.')::text, false);
reset role;
select test.login('noa'); set role authenticated;
select set_config('test.app_opened', public.apply_to_job(current_setting('test.job_hr')::uuid,
  'Operations and project coordination for small companies; available from next week, full time.')::text, false);
reset role;
select test.login('dana'); set role authenticated;
select public.mark_application_viewed(current_setting('test.app_opened')::uuid);
reset role;
update public.applications set sent_at = now() - interval '31 days' where job_id = current_setting('test.job_hr')::uuid;
select private.run_timers();
select test.check((select status from public.applications where id = current_setting('test.app_unopened')::uuid) = 'credited_back', 'unopened refunded after 30 days');
select test.check((select status from public.applications where id = current_setting('test.app_opened')::uuid) = 'viewed', 'opened not refunded');
select test.check(test.balance('yossi') = 90 and test.balance('noa') = 70, 'balances after unopened credit-back');
select private.run_timers();
select test.check(test.balance('yossi') = 90, 'credit-back is idempotent');
update public.jobs set expires_at = now() - interval '1 minute' where id = current_setting('test.job_hr')::uuid;
select private.run_timers();
select test.check((select status from public.jobs where id = current_setting('test.job_hr')::uuid) = 'expired', 'job expired');
select test.check(test.balance('noa') = 80, 'expired job refunds opened application');

\echo ' 10. applicant cap and settings'
select test.login('admin'); set role authenticated;
select public.admin_update_setting('job_applicant_cap', '1');
reset role;
select test.login('avi'); set role authenticated;
select set_config('test.job_cap', public.create_job(test.sub('gardening'), 'Garden maintenance every two weeks',
  'Private garden of about 80 square meters plus a drip irrigation fix. Ra''anana, flexible days.',
  'onsite', 'Ra''anana', 'open_to_quotes', null, null, 'flexible')::text, false);
reset role;
select test.login('yossi'); set role authenticated;
select public.apply_to_job(current_setting('test.job_cap')::uuid, 'Gardening and irrigation repairs, I work in the Sharon area every week.');
reset role;
select test.login('noa'); set role authenticated;
select test.expect_error(format($$select public.apply_to_job(%L, repeat('garden ', 10))$$, current_setting('test.job_cap')), 'applicant_cap_reached');
reset role;
select test.login('admin'); set role authenticated;
select public.admin_update_setting('job_applicant_cap', '30');
reset role;

\echo ' 11. Flow B: direct requests'
select test.login('dana'); set role authenticated;
select test.expect_error(format($$select public.send_direct_request(%L, test.sub('development'), 'Internal tool',
  'Build a small internal dashboard for our HR team.', 'remote', null, 'open_to_quotes', null, null, 'month')$$,
  test.uid('yossi')), 'budget_required');
select set_config('test.req_yossi', public.send_direct_request(test.uid('yossi'), test.sub('development'), 'Internal tool',
  'Build a small internal dashboard for our HR team.', 'remote', null, 'fixed', 3000, 5000, 'month')::text, false);
select test.expect_error(format($$select public.send_direct_request(%L, test.sub('development'), 'Second request',
  'Another request while the first one is pending.', 'remote', null, 'fixed', 3000, 5000, 'month')$$,
  test.uid('yossi')), 'request_already_open');
select test.expect_error(format($$select public.send_direct_request(%L, test.sub('development'), 'Unverified',
  'Request to a provider who is not verified yet.', 'remote', null, 'fixed', 3000, 5000, 'month')$$,
  test.uid('eli')), 'provider_unavailable');
select set_config('test.req_noa', public.send_direct_request(test.uid('noa'), test.sub('content'), 'Careers page copy',
  'Rewrite our careers page in Hebrew and English.', 'remote', null, 'fixed', 1500, 2500, 'week')::text, false);
reset role;
select test.login('yossi'); set role authenticated;
select set_config('test.eng_req', public.respond_direct_request(current_setting('test.req_yossi')::uuid, true)::text, false);
select test.check(test.balance('yossi') = 78, 'approve costs 2 (90 - 10 garden - 2)');
select test.check((select phone from public.get_contact(test.uid('dana'))) = '+972500000004', 'contacts revealed after approval');
reset role;
select test.login('admin'); set role authenticated;
select public.admin_adjust_credits(test.uid('noa'), -79, 'test: drain wallet');
reset role;
select test.login('noa'); set role authenticated;
select test.expect_error(format($$select public.respond_direct_request(%L, true)$$, current_setting('test.req_noa')), 'insufficient_credits');
select public.respond_direct_request(current_setting('test.req_noa')::uuid, false, 'Fully booked this month');
select test.check(test.balance('noa') = 1, 'decline is free');
reset role;
select test.login('admin'); set role authenticated;
select public.admin_adjust_credits(test.uid('noa'), 79, 'test: restore');
reset role;

\echo ' 12. feedback schedule: request, reminders, block at 30 days, blind reveal'
update public.engagements set created_at = now() - interval '4 days' where id = current_setting('test.eng_1')::uuid;
select private.run_timers();
select test.check((select count(*) from public.feedback_requests where engagement_id = current_setting('test.eng_1')::uuid) = 2, 'two feedback requests');
select test.login('yossi'); set role authenticated;
select public.submit_feedback(current_setting('test.eng_1')::uuid, 'not_yet');
reset role;
update public.feedback_requests set requested_at = now() - interval '8 days' where engagement_id = current_setting('test.eng_1')::uuid;
select private.run_timers();
select test.check((select min(reminders_sent) from public.feedback_requests where engagement_id = current_setting('test.eng_1')::uuid) = 1, 'reminder after 7 days');
update public.feedback_requests set requested_at = now() - interval '15 days' where engagement_id = current_setting('test.eng_1')::uuid;
select private.run_timers();
select test.check((select count(*) from public.notifications where event = 'feedback_block_warning'
                   and payload ->> 'engagement_id' = current_setting('test.eng_1')) = 2, 'block warning after 14 days');
select test.login('yossi'); set role authenticated;
select test.expect_error(format($$select public.submit_feedback(%L, 'not_yet')$$, current_setting('test.eng_1')), 'answer_required');
reset role;
update public.feedback_requests set requested_at = now() - interval '31 days' where engagement_id = current_setting('test.eng_1')::uuid;
select private.run_timers();
select test.check(public.is_feedback_blocked(test.uid('yossi')) and public.is_feedback_blocked(test.uid('avi')), 'both blocked at 30 days');
select test.login('yossi'); set role authenticated;
select test.expect_error(format($$select public.apply_to_job(%L, repeat('blocked ', 10))$$, current_setting('test.job_dev')), 'feedback_blocked');
select public.submit_feedback(current_setting('test.eng_1')::uuid, 'yes', 5::smallint, '{"brief_clarity": 5, "communication": 4, "fair_payment": 5}', true, 'Clear brief and paid on time.', null, 'Great first client');
select test.check(not public.is_feedback_blocked(auth.uid()), 'block lifted on submit');
select test.check((select revealed_at is null from public.feedback where author_id = auth.uid()), 'not revealed until both submit');
reset role;
select test.login('avi'); set role authenticated;
select test.expect_error($$select public.create_job(test.sub('plumbing'), 'Another job while blocked',
  'This should fail because Avi still owes feedback on the hire from last month, as per the rules.',
  'onsite', 'Rishon LeZion', 'open_to_quotes', null, null, 'asap')$$, 'feedback_blocked');
select public.submit_feedback(current_setting('test.eng_1')::uuid, 'yes', 4::smallint, '{"quality": 4, "communication": 5, "reliability": 4, "value_for_money": 4}', true, 'Arrived on time and fixed the leak.');
reset role;
select test.check((select count(*) from public.feedback where engagement_id = current_setting('test.eng_1')::uuid and revealed_at is not null) = 2, 'both revealed together');
select test.check((select rating_avg = 4.0 and rating_count = 1 from public.provider_profiles where user_id = test.uid('yossi')), 'provider rating');
select test.check((select rating_avg = 5.0 from public.poster_profiles where user_id = test.uid('avi')), 'poster rating');
select set_config('request.jwt.claim.sub', '', false); set role anon;
select test.check((select count(*) from public.public_reviews) = 2, 'anon sees revealed reviews');
select test.check((select count(*) from public.feedback) = 0, 'anon cannot read raw feedback');
reset role;
select test.login('avi'); set role authenticated;
select test.check((select count(*) from public.feedback_private_notes) = 0, 'private notes hidden from users');
reset role;

-- One-sided feedback is revealed after 14 days.
update public.engagements set created_at = now() - interval '4 days' where id = current_setting('test.eng_req')::uuid;
select private.run_timers();
select test.login('dana'); set role authenticated;
select public.submit_feedback(current_setting('test.eng_req')::uuid, 'no', null, '{}', null, null, 'price');
reset role;
update public.feedback set submitted_at = now() - interval '15 days' where engagement_id = current_setting('test.eng_req')::uuid;
select private.run_timers();
select test.check((select revealed_at is not null from public.feedback where engagement_id = current_setting('test.eng_req')::uuid), 'one-sided revealed after 14 days');
select test.check((select rating_count from public.provider_profiles where user_id = test.uid('yossi')) = 1, '"No" answers do not count in the score');

\echo ' 12b. job lifetime (30 + 30 days) and no refund for unopened applications after a hire'
select test.login('avi'); set role authenticated;
select set_config('test.job_life', public.create_job(test.sub('carpentry'), 'Custom bookshelf for a living room',
  'Wall 3.2 meters wide, floor to ceiling, oak veneer, in Rishon LeZion. Measurements are ready.',
  'onsite', 'Rishon LeZion', 'open_to_quotes', null, null, 'flexible')::text, false);
select test.check((select expires_at between now() + interval '29 days 23 hours' and now() + interval '30 days 1 hour'
                   from public.jobs where id = current_setting('test.job_life')::uuid), 'job open 30 days');
select public.extend_job(current_setting('test.job_life')::uuid);
select test.check((select expires_at between now() + interval '59 days 23 hours' and now() + interval '60 days 1 hour'
                   from public.jobs where id = current_setting('test.job_life')::uuid), 'extension to 60 days');
select test.expect_error(format($$select public.extend_job(%L)$$, current_setting('test.job_life')), 'cannot_extend');
reset role;
select set_config('test.bal_yossi', test.balance('yossi')::text, false);
select test.login('yossi'); set role authenticated;
select set_config('test.app_life_yossi', public.apply_to_job(current_setting('test.job_life')::uuid,
  'Carpenter with a workshop in Rishon. Oak veneer shelving is a regular job for me; photos on request.')::text, false);
reset role;
select test.login('noa'); set role authenticated;
select set_config('test.app_life_noa', public.apply_to_job(current_setting('test.job_life')::uuid,
  'We build custom shelving and finish it on site; can measure this week and deliver in three weeks.')::text, false);
reset role;
select test.login('avi'); set role authenticated;
select public.mark_application_viewed(current_setting('test.app_life_noa')::uuid);
select public.hire_application(current_setting('test.app_life_noa')::uuid);
reset role;
update public.applications set sent_at = now() - interval '31 days' where job_id = current_setting('test.job_life')::uuid;
select private.run_timers();
select test.check((select status from public.applications where id = current_setting('test.app_life_yossi')::uuid) = 'not_selected',
                  'unopened application not refunded after a hire');
select test.check(test.balance('yossi') = current_setting('test.bal_yossi')::int - 10, 'no credit-back after a hire');

\echo ' 13. reports hide a job; suspended accounts cannot act'
select test.login('yossi'); set role authenticated; select public.report_content('job', current_setting('test.job_dev')::uuid, 'spam'); reset role;
select test.login('noa');   set role authenticated; select public.report_content('job', current_setting('test.job_dev')::uuid, 'spam'); reset role;
select test.check((select status from public.jobs where id = current_setting('test.job_dev')::uuid) = 'open', 'two reports: still open');
select test.login('dana');  set role authenticated; select public.report_content('job', current_setting('test.job_dev')::uuid, 'fake'); reset role;
select test.check((select status from public.jobs where id = current_setting('test.job_dev')::uuid) = 'held', 'three reports: held');
select set_config('request.jwt.claim.sub', '', false); set role anon;
select test.check(not exists (select 1 from public.jobs where id = current_setting('test.job_dev')::uuid), 'held job hidden from public');
reset role;
select test.login('admin'); set role authenticated;
select public.admin_set_account_status(test.uid('noa'), 'suspended', 'test');
reset role;
select test.login('noa'); set role authenticated;
select test.expect_error(format($$select public.apply_to_job(%L, repeat('suspended ', 8))$$, current_setting('test.job_cap')), 'account_suspended');
reset role;

\echo ' 13b. spouse invite accepted after choosing "offer services" at sign-up'
-- approve Eli (pending, flagged duplicate) so he can invite
select test.login('admin'); set role authenticated;
select public.decide_verification((select id from public.verification_requests where user_id = test.uid('eli') and status = 'pending'), 'approved');
reset role;
select test.login('eli'); set role authenticated;
select public.invite_spouse('Ruth Amsalem', '050-000-0007');
reset role;
select set_config('test.invite2', (select invite_token from public.spouse_links where invite_phone = '+972500000007'), false);
set role anon;
select test.check((select reservist_name from public.get_spouse_invite(current_setting('test.invite2'))) = 'Eli C.', 'invite readable by token');
reset role;
select test.login('ruth'); set role authenticated;
select public.complete_signup('Ruth Amsalem', true, false);
select test.check((select provider_type from public.provider_profiles where user_id = auth.uid()) = 'reservist', 'draft reservist before accepting');
select public.accept_spouse_invite(current_setting('test.invite2'));
select test.check((select provider_type from public.provider_profiles where user_id = auth.uid()) = 'spouse', 'draft converted to spouse');
reset role;

\echo ' 13c. distance, matching, job alerts, "viewed" notice, provider search'
select test.check(public.distance_km('ראש העין', 'פתח תקווה') between 5 and 10, 'Rosh HaAyin to Petah Tikva about 7 km');
select test.check(public.distance_km('קרית שמונה', 'קריית שמונה') = 0, 'spelling normalized');
select test.check(public.distance_km('תל אביב', 'חיפה') between 75 and 95, 'Tel Aviv found by prefix');
select test.check(public.distance_km('Atlantis', 'חיפה') is null, 'unknown town gives null');
update public.provider_profiles set city = 'ראש העין', radius_km = 25, works_onsite = true, works_remote = false
 where user_id = test.uid('eli');
insert into public.provider_subcategories values (test.uid('eli'), test.sub('electricity')) on conflict do nothing;
insert into auth.users (phone, phone_confirmed_at, raw_user_meta_data)
values ('972500000008', now(), '{"full_name": "Gal Peretz"}');
insert into test.users select 'gal', id from auth.users where phone = '972500000008';
select test.login('gal'); set role authenticated;
select public.complete_signup('Gal Peretz', false, true);
select public.upsert_poster_profile('Gal Peretz', 'private', 'פתח תקווה');
select set_config('test.job_near', public.create_job(test.sub('electricity'), 'New sockets in the kitchen',
  'Need four new sockets and a dedicated line for the oven in a kitchen renovation, this month.',
  'onsite', 'פתח תקווה', 'fixed', 500, 800, 'month')::text, false);
select set_config('test.job_far', public.create_job(test.sub('electricity'), 'Lighting for a hotel lobby',
  'Replace lobby lighting with LED fixtures; around twenty fixtures, ceiling height four meters.',
  'onsite', 'אילת', 'fixed', 3000, 5000, 'month')::text, false);
reset role;
select test.check(exists (select 1 from public.notifications where user_id = test.uid('eli') and event = 'job_alert'
                          and payload ->> 'job_id' = current_setting('test.job_near')), 'job alert for a job 7 km away');
select test.check(not exists (select 1 from public.notifications where user_id = test.uid('eli') and event = 'job_alert'
                              and payload ->> 'job_id' = current_setting('test.job_far')), 'no alert for Eilat (25 km radius)');
select test.login('eli'); set role authenticated;
select test.check(current_setting('test.job_near')::uuid in (select public.my_matching_jobs()), 'near job in Matches');
select test.check(current_setting('test.job_far')::uuid not in (select public.my_matching_jobs()), 'far job not in Matches');
select set_config('test.app_near', public.apply_to_job(current_setting('test.job_near')::uuid,
  'Licensed electrician, kitchens are my specialty. Can come for a quote on Sunday morning.')::text, false);
update public.provider_profiles set availability = 'busy', busy_until = current_date + 10 where user_id = auth.uid();
reset role;
select test.login('gal'); set role authenticated;
select public.mark_application_viewed(current_setting('test.app_near')::uuid);
select public.mark_application_viewed(current_setting('test.app_near')::uuid);
reset role;
select test.check((select count(*) from public.notifications where user_id = test.uid('eli') and event = 'application_viewed') = 1,
                  '"viewed" notice sent once');
select set_config('request.jwt.claim.sub', '', false); set role anon;
select test.check(current_setting('test.job_near')::uuid in (select public.jobs_near('ראש העין', 10)), 'area filter: 10 km');
select test.check(current_setting('test.job_far')::uuid not in (select public.jobs_near('ראש העין', 50)), 'area filter excludes Eilat');
select test.check(test.uid('eli') in (select user_id from public.search_providers(p_subcategory => test.sub('electricity'),
                  p_city => 'פתח תקווה', p_radius => 25, p_sort => 'distance')), 'search finds the electrician nearby');
select test.check(test.uid('eli') not in (select user_id from public.search_providers(p_subcategory => test.sub('electricity'),
                  p_city => 'אילת', p_radius => 25)), 'search by area excludes far providers');
select test.check(test.uid('eli') not in (select user_id from public.search_providers(p_available_only => true)), 'busy hidden by "available now"');
select test.check(test.uid('dana') not in (select user_id from public.search_providers()), 'only approved providers');
reset role;
select test.login('eli'); set role authenticated;
select public.mark_notifications_read();
select test.check(not exists (select 1 from public.notifications where user_id = auth.uid() and read_at is null and in_app), 'nothing unread');
select test.expect_error($$update public.provider_profiles set verification_status = 'approved' where user_id = auth.uid()$$, 'permission denied');
reset role;
select test.login('gal'); set role authenticated;
update public.poster_profiles set about = 'Family home in Petah Tikva' where user_id = auth.uid();
select test.check((select about from public.poster_profiles where user_id = auth.uid()) = 'Family home in Petah Tikva', 'poster edits about');
update public.poster_profiles set about = 'hack' where user_id = test.uid('dana');
select test.check((select about from public.poster_profiles where user_id = test.uid('dana')) is null, 'cannot edit another poster');
select test.expect_error($$update public.poster_profiles set hires = 99 where user_id = auth.uid()$$, 'permission denied');
reset role;

\echo ' 14. ledger integrity'
select test.check(not exists (
  select 1 from public.provider_wallets w
  where w.balance <> coalesce((select sum(amount) from public.credit_transactions t where t.provider_id = w.provider_id), 0)
     or w.balance <> coalesce((select balance_after from public.credit_transactions t where t.provider_id = w.provider_id
                               order by id desc limit 1), 0)), 'wallet = sum(ledger) = last balance_after');
select test.check((select count(*) from public.admin_audit_log) >= 6, 'admin actions audited');

\echo '  ✔ marketplace tests passed'
drop schema test cascade;
