-- =============================================================================
-- Joby MVP · 0600 · Scheduled rules (PRD §7)
-- One idempotent function runs every 10 minutes (pg_cron). Safe to re-run:
-- every step checks state first, and the credits ledger refuses duplicates.
-- =============================================================================

alter table public.jobs add column expiry_notified_at timestamptz;

create or replace function private.run_timers()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_jobs_expired int := 0; v_expiry_warn int := 0; v_credit_backs int := 0; v_requests_expired int := 0;
  v_fb_requested int := 0; v_fb_reminders int := 0; v_fb_blocked int := 0; v_fb_revealed int := 0;
  v_reminders jsonb := public.setting_json('feedback_reminder_days');
  v_rem1 int := (v_reminders ->> 0)::int;
  v_rem2 int := (v_reminders ->> 1)::int;
  v_block int := public.setting_int('feedback_block_days');
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
  --    Once the job ends with a hire, unopened applications are not refunded (decision v1.2).
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

  -- 6. Reminder 2 (+7 days) and reminder 3 with the block warning (+14 days).
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
            returning id, user_id, engagement_id, requested_at loop
    perform private.notify(r.user_id, 'feedback_block_warning',
                           jsonb_build_object('engagement_id', r.engagement_id,
                                              'block_at', r.requested_at + make_interval(days => v_block)));
    v_fb_reminders := v_fb_reminders + 1;
  end loop;

  -- 7. Block at +30 days. Lifted the moment the feedback is submitted.
  for r in update public.feedback_requests set blocked_at = now()
            where completed_at is null and blocked_at is null
              and requested_at <= now() - make_interval(days => v_block)
            returning user_id, engagement_id loop
    perform private.notify(r.user_id, 'account_blocked_feedback', jsonb_build_object('engagement_id', r.engagement_id));
    v_fb_blocked := v_fb_blocked + 1;
  end loop;

  -- 8. Blind reveal 14 days after the first submission.
  for r in select id from public.feedback
            where revealed_at is null
              and submitted_at <= now() - make_interval(days => public.setting_int('feedback_reveal_days')) loop
    perform private.reveal_feedback(r.id);
    v_fb_revealed := v_fb_revealed + 1;
  end loop;

  -- 9. Spouse invites past their validity.
  update public.spouse_links set status = 'expired' where status = 'invited' and expires_at < now();

  return jsonb_build_object('jobs_expired', v_jobs_expired, 'expiry_warnings', v_expiry_warn,
                            'credit_backs', v_credit_backs, 'requests_expired', v_requests_expired,
                            'feedback_requested', v_fb_requested, 'feedback_reminders', v_fb_reminders,
                            'feedback_blocks', v_fb_blocked, 'feedback_revealed', v_fb_revealed);
end $$;

-- Schedule every 10 minutes where pg_cron exists (hosted Supabase). Local test
-- databases without pg_cron skip this; run `select private.run_timers();` by hand.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('joby-run-timers', '*/10 * * * *', 'select private.run_timers()');
  end if;
end $$;
