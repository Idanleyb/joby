-- =============================================================================
-- 20261103000100 — Beta-tester survey (Google Form) 3 days after sign-up (founder, 2026-11-03).
-- Was day 7. The link is the setting beta_survey_url (empty = no survey emails); the day-21
-- follow-up (B2) is unchanged. Only run_lifecycle() changes: the survey day.
-- =============================================================================

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

  -- B1 / B2: beta surveys 3 and 21 days after sign-up (only when a survey link is set).
  -- Founder 2026-11-03: the first survey (the Google Form for beta testers) goes out on day 3.
  if v_survey <> '' then
    foreach d in array array[3, 21] loop
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

update public.app_settings set description = 'Link for the beta tester surveys (Google Form; day 3 and day 21 after sign-up). Empty = no survey emails'
 where key = 'beta_survey_url';
