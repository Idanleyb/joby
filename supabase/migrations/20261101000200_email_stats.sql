-- =============================================================================
-- Joby MVP · PRD v1.7 · Email stats
-- Each sent email is tagged with its template ID (as in the content doc) and the
-- Resend email id. Resend webhooks (/api/resend/webhook) fill delivered / opened /
-- clicked / bounced / complained. public.admin_email_stats() feeds /admin/emails,
-- including whether the person then did what the email asked ("conversion").
-- =============================================================================

alter table public.notifications
  add column email_template      text,
  add column email_provider_id   text,
  add column email_delivered_at  timestamptz,
  add column email_opened_at     timestamptz,
  add column email_clicked_at    timestamptz,
  add column email_bounced_at    timestamptz,
  add column email_complained_at timestamptz;
create index notifications_email_provider_idx on public.notifications (email_provider_id) where email_provider_id is not null;
create index notifications_email_sent_idx on public.notifications (email_sent_at) where email_status = 'sent';

-- Webhook writes (server key only).
create or replace function public.record_email_event(p_provider_id text, p_type text, p_at timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.notifications set
    email_delivered_at  = case when p_type = 'email.delivered'  then coalesce(email_delivered_at, p_at)  else email_delivered_at end,
    email_opened_at     = case when p_type = 'email.opened'     then coalesce(email_opened_at, p_at)     else email_opened_at end,
    email_clicked_at    = case when p_type = 'email.clicked'    then coalesce(email_clicked_at, p_at)    else email_clicked_at end,
    email_bounced_at    = case when p_type = 'email.bounced'    then coalesce(email_bounced_at, p_at)    else email_bounced_at end,
    email_complained_at = case when p_type = 'email.complained' then coalesce(email_complained_at, p_at) else email_complained_at end
  where email_provider_id = p_provider_id;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.record_email_event(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_email_event(text, text, timestamptz) to service_role;

-- Did the person do what the email asked, within 14 days after it was sent?
-- Null when the template has no measurable next step.
create or replace function private.email_converted(n public.notifications)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    -- Provider profile submitted (wizard finished) after the email.
    when n.email_template in ('P1_2', 'P1_4', 'P2_1', 'P2_2a', 'P2_2b', 'P2_3', 'P2_4') then exists (
      select 1 from public.provider_profiles pp where pp.user_id = n.user_id and pp.onboarding_step >= 8
        and pp.updated_at between n.email_sent_at and n.email_sent_at + interval '14 days')
    -- 3010 uploaded after the guide / the rejection / the request for more info.
    when n.email_template in ('P1_8', 'P1_9') then exists (
      select 1 from public.verification_requests v where v.user_id = n.user_id
        and v.submitted_at between n.email_sent_at and n.email_sent_at + interval '14 days')
    -- First / next application after the email.
    when n.email_template in ('P1_7', 'P3_1', 'P3_1b', 'P3_2', 'P3_6', 'P5') then exists (
      select 1 from public.applications a where a.provider_id = n.user_id
        and a.sent_at between n.email_sent_at and n.email_sent_at + interval '14 days')
    -- Direct request answered.
    when n.email_template in ('P3_8', 'P3_9') then exists (
      select 1 from public.direct_requests q where q.id::text = n.payload ->> 'request_id'
        and q.status in ('approved', 'declined') and q.responded_at >= n.email_sent_at)
    -- Feedback given for that engagement.
    when n.email_template in ('P4_1', 'P4_2', 'P4_3') then exists (
      select 1 from public.feedback f where f.engagement_id::text = n.payload ->> 'engagement_id'
        and f.author_id = n.user_id and f.submitted_at >= n.email_sent_at)
    -- Poster posted a job or sent a direct request.
    when n.email_template in ('H1_2', 'H2_1', 'H2_2', 'H2_3', 'H2_4', 'H3_3', 'H3_9') then
      exists (select 1 from public.jobs j where j.poster_id = n.user_id
                and j.created_at between n.email_sent_at and n.email_sent_at + interval '14 days')
      or exists (select 1 from public.direct_requests q where q.poster_id = n.user_id
                   and q.sent_at between n.email_sent_at and n.email_sent_at + interval '14 days')
    -- Poster opened applications of that job.
    when n.email_template in ('H3_2', 'H3_2b', 'H3_4') then exists (
      select 1 from public.applications a where a.job_id::text = n.payload ->> 'job_id'
        and a.viewed_at between n.email_sent_at and n.email_sent_at + interval '14 days')
    -- Job extended.
    when n.email_template = 'H3_8' then exists (
      select 1 from public.jobs j where j.id::text = n.payload ->> 'job_id' and j.extended)
    else null
  end
$$;

create or replace function public.admin_email_stats(p_days integer default 30)
returns table (template text, emails bigint, delivered bigint, opened bigint, clicked bigint,
               bounced bigint, complained bigint, measurable bigint, converted bigint, last_sent timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin('reviewer');
  return query
  with sent as (
    -- One row per email (a digest covers several outbox rows).
    select distinct on (coalesce(n.email_provider_id, n.id::text))
           n.*, private.email_converted(n) as conv
      from public.notifications n
     where n.email_status = 'sent' and n.email_template is not null
       and n.email_sent_at >= now() - make_interval(days => greatest(p_days, 1))
     order by coalesce(n.email_provider_id, n.id::text), n.id
  )
  select s.email_template, count(*), count(s.email_delivered_at), count(s.email_opened_at), count(s.email_clicked_at),
         count(s.email_bounced_at), count(s.email_complained_at), count(s.conv), count(*) filter (where s.conv),
         max(s.email_sent_at)
    from sent s
   group by s.email_template
   order by s.email_template;
end $$;
revoke all on function public.admin_email_stats(integer) from public, anon;
grant execute on function public.admin_email_stats(integer) to authenticated, service_role;
