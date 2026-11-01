-- =============================================================================
-- Joby MVP · PRD v1.7 (2026-11-01)
--   1. No account block for missing feedback (founder decision). Reminders stay:
--      request at +3 days, reminders at +7 and +14 days; the last one carries no warning.
--   2. Email delivery state on the notification outbox, read by the app's email worker
--      (src/lib/email). WhatsApp keeps using `status` in a later step.
--   3. New outbox events for the lifecycle emails: welcome, receipts, hire confirmation,
--      job closed, credits used up.
--   4. private.run_lifecycle(): hourly nudges and reminders that depend on time
--      (profile completion, first application, unopened applications, surveys…).
--      Each send is recorded once in private.lifecycle_sends, so re-runs are safe.
--   5. Every 5 minutes pg_cron asks the app to send queued emails (pg_net + Vault).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Feedback: no account block
-- ---------------------------------------------------------------------------
create or replace function public.is_feedback_blocked(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select false   -- v1.7: missing feedback never limits an account
$$;

update public.feedback_requests set blocked_at = null where blocked_at is not null;
delete from public.app_settings where key = 'feedback_block_days';
update public.app_settings
   set description = 'Reminders N days after the feedback request (the last one is final; no account block)'
 where key = 'feedback_reminder_days';

insert into public.app_settings (key, value, description) values
  ('email_quiet_start_hour',  '22',   'No lifecycle emails from this hour (Israel time)'),
  ('email_quiet_end_hour',    '8',    'Emails resume at this hour (Israel time)'),
  ('email_shabbat_quiet',     'true', 'Hold emails from Friday 16:00 to Saturday 20:00 (Israel time)'),
  ('beta_survey_url',         '""',   'Link for the beta tester surveys (day 7 and 21). Empty = no survey emails'),
  ('nudge_days',              '[1, 3, 7, 14]', 'Profile-completion / first-job nudges N days after sign-up'),
  ('credits_used_up_below',   '10',   '"Credits used up" email when the balance drops below N')
on conflict (key) do nothing;

-- run_timers without the block step (step 7 removed; step 6 final reminder has no warning).
create or replace function private.run_timers()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_jobs_expired int := 0; v_expiry_warn int := 0; v_credit_backs int := 0; v_requests_expired int := 0;
  v_fb_requested int := 0; v_fb_reminders int := 0; v_fb_revealed int := 0;
  v_reminders jsonb := public.setting_json('feedback_reminder_days');
  v_rem1 int := (v_reminders ->> 0)::int;
  v_rem2 int := (v_reminders ->> 1)::int;
begin
  -- 1. Jobs past their end date → expired, all applications in play refunded.
  for r in select id from public.jobs where status = 'open' and expires_at <= now() loop
    perform private.end_job_without_hire(r.id, 'expired', 'job_expired');
    v_jobs_expired := v_jobs_expired + 1;
  end loop;

  -- 2. "Job expires in 2 days" (poster).
  for r in update public.jobs set expiry_notified_at = now()
            where status = 'open' and expiry_notified_at is null and poster_id is not null
              and expires_at <= now() + interval '2 days'
            returning id, poster_id, expires_at, extended loop
    perform private.notify(r.poster_id, 'job_expiring',
                           jsonb_build_object('job_id', r.id, 'expires_at', r.expires_at, 'can_extend', not r.extended),
                           null, true);
    v_expiry_warn := v_expiry_warn + 1;
  end loop;

  -- 3. Applications still unopened 30 days after sending, while the job is still open → refund.
  for r in select a.id from public.applications a
             join public.jobs j on j.id = a.job_id
            where a.viewed_at is null and a.credited_back_at is null
              and a.status not in ('hired', 'withdrawn', 'credited_back')
              and j.status in ('open', 'held')
              and a.sent_at <= now() - make_interval(days => public.setting_int('credit_back_unopened_days')) loop
    perform private.credit_back(r.id, 'unopened_30_days');
    v_credit_backs := v_credit_backs + 1;
  end loop;

  -- 4. Direct requests without a response → expired (no charge).
  for r in update public.direct_requests set status = 'expired'
            where status = 'pending' and expires_at <= now()
            returning id, poster_id loop
    perform private.notify(r.poster_id, 'request_expired', jsonb_build_object('request_id', r.id), null, true);
    v_requests_expired := v_requests_expired + 1;
  end loop;

  -- 5. Feedback request: engagement + 3 days, one per side.
  for r in select e.id, e.poster_id, e.provider_id, d.direction
             from public.engagements e
            cross join (values ('poster_to_provider'::public.feedback_direction),
                               ('provider_to_poster'::public.feedback_direction)) d(direction)
            where e.cancelled_at is null
              and e.created_at <= now() - make_interval(days => public.setting_int('feedback_request_after_days'))
              and not exists (select 1 from public.feedback_requests fr
                               where fr.engagement_id = e.id and fr.direction = d.direction) loop
    insert into public.feedback_requests (engagement_id, user_id, direction, completed_at)
    values (r.id, case when r.direction = 'poster_to_provider' then r.poster_id else r.provider_id end, r.direction,
            (select f.submitted_at from public.feedback f where f.engagement_id = r.id and f.direction = r.direction));
    if not exists (select 1 from public.feedback f where f.engagement_id = r.id and f.direction = r.direction) then
      perform private.notify(case when r.direction = 'poster_to_provider' then r.poster_id else r.provider_id end,
                             'feedback_request', jsonb_build_object('engagement_id', r.id));
      v_fb_requested := v_fb_requested + 1;
    end if;
  end loop;

  -- 6. Reminder 2 (+7 days) and the last reminder (+14 days). No block afterwards (v1.7).
  for r in update public.feedback_requests
              set reminders_sent = 1, last_reminder_at = now()
            where completed_at is null and reminders_sent = 0
              and requested_at <= now() - make_interval(days => v_rem1)
            returning id, user_id, engagement_id loop
    perform private.notify(r.user_id, 'feedback_reminder', jsonb_build_object('engagement_id', r.engagement_id));
    v_fb_reminders := v_fb_reminders + 1;
  end loop;
  for r in update public.feedback_requests
              set reminders_sent = 2, last_reminder_at = now()
            where completed_at is null and reminders_sent = 1
              and requested_at <= now() - make_interval(days => v_rem2)
            returning id, user_id, engagement_id loop
    perform private.notify(r.user_id, 'feedback_reminder',
                           jsonb_build_object('engagement_id', r.engagement_id, 'final', true));
    v_fb_reminders := v_fb_reminders + 1;
  end loop;

  -- 7. Blind reveal 14 days after the first submission.
  for r in select id from public.feedback
            where revealed_at is null
              and submitted_at <= now() - make_interval(days => public.setting_int('feedback_reveal_days')) loop
    perform private.reveal_feedback(r.id);
    v_fb_revealed := v_fb_revealed + 1;
  end loop;

  -- 8. Spouse invites past their validity.
  update public.spouse_links set status = 'expired' where status = 'invited' and expires_at < now();

  return jsonb_build_object('jobs_expired', v_jobs_expired, 'expiry_warnings', v_expiry_warn,
                            'credit_backs', v_credit_backs, 'requests_expired', v_requests_expired,
                            'feedback_requested', v_fb_requested, 'feedback_reminders', v_fb_reminders,
                            'feedback_revealed', v_fb_revealed);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Email delivery state on the outbox
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column email_status   text not null default 'pending'
                            check (email_status in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  add column email_claimed_at timestamptz,          -- set while a worker run is sending it
  add column email_sent_at  timestamptz,
  add column email_attempts smallint not null default 0,
  add column email_error    text;
-- Nothing written before this release is emailed.
update public.notifications set email_status = 'skipped';
create index notifications_email_queue_idx on public.notifications (send_after, id) where email_status = 'pending';

-- ---------------------------------------------------------------------------
-- 3. New events written by the database
-- ---------------------------------------------------------------------------
-- Welcome (P1.2 / H1.2): when a role is turned on for the first time. Demo accounts are skipped.
create or replace function private.on_role_added()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_demo then return new; end if;
  if new.is_provider and not old.is_provider then
    perform private.notify(new.id, 'welcome_provider', '{}'::jsonb, null, false);
  end if;
  if new.is_poster and not old.is_poster then
    perform private.notify(new.id, 'welcome_poster', '{}'::jsonb, null, false);
  end if;
  return new;
end $$;
create trigger profiles_role_added after update of is_provider, is_poster on public.profiles
  for each row execute function private.on_role_added();

-- Application receipt (P3.3).
create or replace function private.on_application_sent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.provider_id, 'application_sent',
                         jsonb_build_object('job_id', new.job_id, 'application_id', new.id), null, false);
  return new;
end $$;
create trigger applications_sent_notice after insert on public.applications
  for each row execute function private.on_application_sent();

-- Job published or held for review (H3.1).
create or replace function private.on_job_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.poster_id is not null and not new.is_demo then
    perform private.notify(new.poster_id, 'job_published',
                           jsonb_build_object('job_id', new.id, 'held', new.status = 'held'), null, false);
  end if;
  return new;
end $$;
create trigger jobs_created_notice after insert on public.jobs
  for each row execute function private.on_job_created();

-- Job ended without a hire (H3.9). Removal by admin already sends job_removed.
create or replace function private.on_job_ended()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.poster_id is not null and not new.is_demo
     and new.status in ('closed_no_hire', 'expired') and old.status is distinct from new.status then
    perform private.notify(new.poster_id, 'job_closed_no_hire',
                           jsonb_build_object('job_id', new.id, 'expired', new.status = 'expired'), null, true);
  end if;
  return new;
end $$;
create trigger jobs_ended_notice after update of status on public.jobs
  for each row execute function private.on_job_ended();

-- Hire confirmation to the poster (H3.7). Flow B already notifies with request_approved.
create or replace function private.on_engagement_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'application' then
    perform private.notify(new.poster_id, 'hire_confirmed',
                           jsonb_build_object('engagement_id', new.id, 'job_id', new.job_id,
                                              'provider_id', new.provider_id, 'extra_hire', new.extra_hire),
                           null, false);
  end if;
  return new;
end $$;
create trigger engagements_created_notice after insert on public.engagements
  for each row execute function private.on_engagement_created();

-- All welcome credits used (P3.11): balance drops below the cost of one application.
create or replace function private.on_wallet_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_floor int := coalesce(public.setting_int('credits_used_up_below'), 10);
begin
  if new.balance < v_floor and old.balance >= v_floor then
    perform private.notify(new.provider_id, 'credits_used_up', jsonb_build_object('balance', new.balance));
  end if;
  return new;
end $$;
create trigger provider_wallets_used_up after update of balance on public.provider_wallets
  for each row execute function private.on_wallet_change();

-- ---------------------------------------------------------------------------
-- 4. Lifecycle nudges (hourly)
-- ---------------------------------------------------------------------------
create table private.lifecycle_sends (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  key        text not null,              -- e.g. 'provider_nudge:3', 'job_no_applicants:<job id>'
  sent_at    timestamptz not null default now(),
  primary key (user_id, key)
);

-- Record + notify once per (user, key). Returns true when it sent.
create or replace function private.notify_once(p_user uuid, p_key text, p_event text, p_payload jsonb,
                                               p_in_app boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into private.lifecycle_sends (user_id, key) values (p_user, p_key) on conflict do nothing;
  if not found then return false; end if;
  perform private.notify(p_user, p_event, p_payload, null, p_in_app);
  return true;
end $$;

create or replace function private.run_lifecycle()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r record;
  d int;
  v_days int[] := array(select jsonb_array_elements_text(public.setting_json('nudge_days'))::int);
  v_survey text := coalesce(public.setting_json('beta_survey_url') #>> '{}', '');
  v_count int := 0;
  v_pending int;
  v_oldest timestamptz;
begin
  -- P2.1–P2.4: provider profile not submitted yet (wizard not finished), 1/3/7/14 days after it started.
  foreach d in array v_days loop
    for r in select pp.user_id, pp.provider_type, pp.onboarding_step,
                    exists (select 1 from public.verification_requests v where v.user_id = pp.user_id) as proof_sent
               from public.provider_profiles pp
               join public.profiles p on p.id = pp.user_id
              where pp.onboarding_step < 8 and not p.is_demo and p.status = 'active'
                and pp.created_at <= now() - make_interval(days => d)
                and pp.created_at > now() - make_interval(days => d + 3) loop
      if private.notify_once(r.user_id, 'provider_nudge:' || d, 'provider_nudge',
           jsonb_build_object('day', d, 'step', r.onboarding_step, 'proof_sent', r.proof_sent,
                              'spouse', r.provider_type = 'spouse')) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  -- H2.1–H2.4: poster without a job or a direct request, 1/3/7/14 days after choosing to hire.
  foreach d in array v_days loop
    for r in select p.id, (pp.user_id is not null) as has_profile, coalesce(pp.city, '') as city
               from public.profiles p
               left join public.poster_profiles pp on pp.user_id = p.id
              where p.is_poster and not p.is_demo and p.status = 'active'
                and coalesce(pp.created_at, p.created_at) <= now() - make_interval(days => d)
                and coalesce(pp.created_at, p.created_at) > now() - make_interval(days => d + 3)
                and not exists (select 1 from public.jobs j where j.poster_id = p.id)
                and not exists (select 1 from public.direct_requests q where q.poster_id = p.id) loop
      if private.notify_once(r.id, 'poster_nudge:' || d, 'poster_nudge',
           jsonb_build_object('day', d, 'has_profile', r.has_profile, 'city', r.city)) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  -- P2.5: 3 days after verification, profile strength below 70%.
  for r in select pp.user_id,
                  (25 + case when pp.headline is not null and pp.bio is not null then 20 else 0 end
                      + case when exists (select 1 from public.provider_skills s where s.provider_id = pp.user_id) then 15 else 10 end
                      + case when pp.photo_path is not null then 10 else 0 end
                      + case when pp.cv_path is not null then 10 else 0 end
                      + case when exists (select 1 from public.service_cards c where c.provider_id = pp.user_id) then 10 else 0 end
                      + case when cardinality(pp.portfolio_links) + cardinality(pp.gallery_paths) > 0 then 10 else 0 end) as pct,
                  pp.photo_path is null as no_photo, pp.cv_path is null as no_cv,
                  not exists (select 1 from public.service_cards c where c.provider_id = pp.user_id) as no_services,
                  cardinality(pp.portfolio_links) + cardinality(pp.gallery_paths) = 0 as no_gallery
             from public.provider_profiles pp
            where pp.verification_status = 'approved' and not pp.is_demo
              and pp.verified_at <= now() - interval '3 days' and pp.verified_at > now() - interval '6 days' loop
    if r.pct < 70 and private.notify_once(r.user_id, 'profile_strength_tip', 'profile_strength_tip',
         jsonb_build_object('pct', r.pct, 'no_photo', r.no_photo, 'no_cv', r.no_cv,
                            'no_services', r.no_services, 'no_gallery', r.no_gallery)) then
      v_count := v_count + 1;
    end if;
  end loop;

  -- P3.2: verified 7 days ago and never applied.
  for r in select pp.user_id from public.provider_profiles pp
            where pp.verification_status = 'approved' and not pp.is_demo
              and pp.verified_at <= now() - interval '7 days' and pp.verified_at > now() - interval '10 days'
              and not exists (select 1 from public.applications a where a.provider_id = pp.user_id) loop
    if private.notify_once(r.user_id, 'first_application_nudge', 'first_application_nudge', '{}'::jsonb) then
      v_count := v_count + 1;
    end if;
  end loop;

  -- P3.1b: verified provider with no job alert in 7 days (at most once every 30 days).
  for r in select pp.user_id, pp.radius_km, coalesce(pp.city, '') as city from public.provider_profiles pp
            where pp.verification_status = 'approved' and not pp.is_demo
              and pp.verified_at <= now() - interval '7 days'
              and not exists (select 1 from public.notifications n
                               where n.user_id = pp.user_id and n.event = 'job_alert'
                                 and n.created_at > now() - interval '7 days') loop
    if private.notify_once(r.user_id, 'no_matches_tip:' || to_char(now(), 'YYYY-MM'), 'no_matches_tip',
         jsonb_build_object('radius_km', r.radius_km, 'city', r.city)) then
      v_count := v_count + 1;
    end if;
  end loop;

  -- P3.9: direct request still unanswered, 2 days before it expires.
  for r in select q.id, q.provider_id, q.expires_at from public.direct_requests q
            where q.status = 'pending' and q.expires_at <= now() + interval '2 days' and q.expires_at > now() loop
    if private.notify_once(r.provider_id, 'request_expiring:' || r.id, 'request_expiring',
         jsonb_build_object('request_id', r.id, 'expires_at', r.expires_at), true) then
      v_count := v_count + 1;
    end if;
  end loop;

  -- H3.3: open job without applicants 72 hours after publishing.
  for r in select j.id, j.poster_id from public.jobs j
            where j.status = 'open' and j.poster_id is not null and not j.is_demo
              and j.application_count = 0 and j.published_at <= now() - interval '72 hours'
              and j.published_at > now() - interval '7 days' loop
    if private.notify_once(r.poster_id, 'job_no_applicants:' || r.id, 'job_no_applicants',
         jsonb_build_object('job_id', r.id), true) then
      v_count := v_count + 1;
    end if;
  end loop;

  -- H3.4: applications unopened for 5 days on an open job (once a week per job).
  for r in select j.id, j.poster_id, count(*) as unopened from public.jobs j
             join public.applications a on a.job_id = j.id
            where j.status = 'open' and j.poster_id is not null and not j.is_demo
              and a.viewed_at is null and a.status = 'sent' and a.sent_at <= now() - interval '5 days'
            group by j.id, j.poster_id loop
    if private.notify_once(r.poster_id, 'applications_unopened:' || r.id || ':' || to_char(now(), 'IYYY-IW'),
         'applications_unopened', jsonb_build_object('job_id', r.id, 'count', r.unopened), true) then
      v_count := v_count + 1;
    end if;
  end loop;

  -- P5: verified provider who has not signed in for 30 days (at most once a month).
  for r in select pp.user_id from public.provider_profiles pp
             join auth.users u on u.id = pp.user_id
            where pp.verification_status = 'approved' and not pp.is_demo
              and coalesce(u.last_sign_in_at, u.created_at) <= now() - interval '30 days' loop
    if private.notify_once(r.user_id, 'reengagement:' || to_char(now(), 'YYYY-MM'), 'reengagement', '{}'::jsonb) then
      v_count := v_count + 1;
    end if;
  end loop;

  -- B1 / B2: beta surveys 7 and 21 days after sign-up (only when a survey link is set).
  if v_survey <> '' then
    foreach d in array array[7, 21] loop
      for r in select p.id from public.profiles p
                where (p.is_provider or p.is_poster) and not p.is_demo and p.status = 'active'
                  and p.created_at <= now() - make_interval(days => d)
                  and p.created_at > now() - make_interval(days => d + 3) loop
        if private.notify_once(r.id, 'beta_survey:' || d, 'beta_survey',
             jsonb_build_object('day', d, 'url', v_survey)) then
          v_count := v_count + 1;
        end if;
      end loop;
    end loop;
  end if;

  -- O1: verification requests waiting more than 20 hours → every admin, at most every 6 hours.
  select count(*), min(submitted_at) into v_pending, v_oldest from public.verification_requests
   where status = 'pending' and submitted_at <= now() - interval '20 hours';
  if v_pending > 0 then
    for r in select a.user_id from public.admins a loop
      perform private.notify_once(r.user_id,
        'admin_sla_alert:' || to_char(now(), 'YYYY-MM-DD') || ':' || (extract(hour from now())::int / 6),
        'admin_sla_alert',
        jsonb_build_object('count', v_pending,
                           'oldest_hours', floor(extract(epoch from now() - v_oldest) / 3600)::int), true);
    end loop;
  end if;

  return jsonb_build_object('lifecycle_notifications', v_count);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Schedules (hosted Supabase only; local test databases skip this)
-- ---------------------------------------------------------------------------
-- Calls the app's email worker. Needs two Vault secrets, created once in the SQL editor:
--   select vault.create_secret('https://www.joby-ai.com/api/notifications/dispatch', 'joby_dispatch_url');
--   select vault.create_secret('<same value as CRON_SECRET on Vercel>', 'joby_cron_secret');
-- Without them it does nothing.
create or replace function private.call_email_worker()
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then return; end if;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'joby_dispatch_url'$q$ into v_url;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'joby_cron_secret'$q$ into v_secret;
  if v_url is null or v_secret is null then return; end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 55000)'
    using v_url, jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
          '{}'::jsonb;
end $$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('joby-run-lifecycle', '7 * * * *', 'select private.run_lifecycle()');
    if exists (select 1 from pg_available_extensions where name = 'pg_net') then
      create extension if not exists pg_net;
      perform cron.schedule('joby-email-worker', '*/5 * * * *', 'select private.call_email_worker()');
    end if;
  end if;
end $$;

revoke all on function private.run_lifecycle(), private.call_email_worker(),
  private.notify_once(uuid, text, text, jsonb, boolean) from public;
