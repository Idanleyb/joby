-- =============================================================================
-- Joby MVP · 0400 · Two-way feedback (PRD 5.14, v1.1 schedule)
-- Request at engagement + 3 days → reminders at +7 and +14 days (the second
-- warns of the block) → account blocked at +30 days until feedback is submitted.
-- Blind reveal: both submitted, or 14 days after the first submission.
-- =============================================================================

create table public.feedback_requests (
  id               uuid primary key default gen_random_uuid(),
  engagement_id    uuid not null references public.engagements (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  direction        public.feedback_direction not null,
  requested_at     timestamptz not null default now(),
  reminders_sent   smallint not null default 0,
  last_reminder_at timestamptz,
  last_answer      public.worked_together,
  blocked_at       timestamptz,
  completed_at     timestamptz,
  unique (engagement_id, direction)
);
create index feedback_requests_open_idx on public.feedback_requests (requested_at) where completed_at is null;
create index feedback_requests_user_idx on public.feedback_requests (user_id) where completed_at is null;

create table public.feedback (
  id              uuid primary key default gen_random_uuid(),
  engagement_id   uuid not null references public.engagements (id) on delete cascade,
  author_id       uuid not null references public.profiles (id) on delete cascade,
  subject_id      uuid not null references public.profiles (id) on delete cascade,
  direction       public.feedback_direction not null,
  worked_together public.worked_together not null check (worked_together in ('yes', 'no')),
  no_reason       text check (no_reason in ('no_response', 'price', 'availability', 'not_a_fit', 'other')),
  overall         smallint check (overall between 1 and 5),
  -- poster → provider
  quality         smallint check (quality between 1 and 5),
  communication   smallint check (communication between 1 and 5),
  reliability     smallint check (reliability between 1 and 5),
  value_for_money smallint check (value_for_money between 1 and 5),
  -- provider → poster
  brief_clarity   smallint check (brief_clarity between 1 and 5),
  fair_payment    smallint check (fair_payment between 1 and 5),
  would_again     boolean,
  comment         text check (char_length(comment) <= 500),
  comment_hidden  boolean not null default false,
  submitted_at    timestamptz not null default now(),
  revealed_at     timestamptz,
  unique (engagement_id, direction),
  check ((worked_together = 'yes' and overall is not null and no_reason is null)
      or (worked_together = 'no' and overall is null and no_reason is not null))
);
create index feedback_subject_idx on public.feedback (subject_id, direction) where revealed_at is not null;
create index feedback_unrevealed_idx on public.feedback (submitted_at) where revealed_at is null;

-- Private notes to Joby are kept apart so they can never leak through a review query.
create table public.feedback_private_notes (
  feedback_id uuid primary key references public.feedback (id) on delete cascade,
  note        text not null check (char_length(note) <= 1000)
);

create or replace function public.is_feedback_blocked(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.feedback_requests
                 where user_id = p_user and blocked_at is not null and completed_at is null)
$$;

create or replace function private.recompute_rating(p_subject uuid, p_direction public.feedback_direction)
returns void language plpgsql security definer set search_path = '' as $$
declare v_avg numeric; v_count integer;
begin
  select round(avg(f.overall)::numeric, 1), count(*) into v_avg, v_count
    from public.feedback f
    join public.engagements e on e.id = f.engagement_id and e.cancelled_at is null
   where f.subject_id = p_subject and f.direction = p_direction
     and f.revealed_at is not null and f.worked_together = 'yes';
  if p_direction = 'poster_to_provider' then
    update public.provider_profiles set rating_avg = v_avg, rating_count = v_count where user_id = p_subject;
  else
    update public.poster_profiles set rating_avg = v_avg, rating_count = v_count where user_id = p_subject;
  end if;
end $$;

create or replace function private.reveal_feedback(p_feedback uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare f public.feedback;
begin
  update public.feedback set revealed_at = now() where id = p_feedback and revealed_at is null returning * into f;
  if f.id is null then return; end if;
  perform private.recompute_rating(f.subject_id, f.direction);
  perform private.notify(f.subject_id, 'feedback_revealed', jsonb_build_object('engagement_id', f.engagement_id), null, true);
  perform private.notify(f.author_id, 'feedback_revealed', jsonb_build_object('engagement_id', f.engagement_id), null, true);
end $$;

-- p_scores keys: quality, communication, reliability, value_for_money (poster → provider)
--                brief_clarity, communication, fair_payment              (provider → poster)
create or replace function public.submit_feedback(
  p_engagement uuid, p_worked_together public.worked_together, p_overall smallint default null,
  p_scores jsonb default '{}'::jsonb, p_would_again boolean default null, p_comment text default null,
  p_no_reason text default null, p_private_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_active_user();
  e public.engagements; v_dir public.feedback_direction; v_subject uuid;
  fr public.feedback_requests; v_id uuid; v_other uuid; v_was_blocked boolean;
begin
  select * into e from public.engagements where id = p_engagement and cancelled_at is null;
  if e.id is null then perform public.raise_app_error('not_found'); end if;
  if v_uid = e.poster_id then v_dir := 'poster_to_provider'; v_subject := e.provider_id;
  elsif v_uid = e.provider_id then v_dir := 'provider_to_poster'; v_subject := e.poster_id;
  else perform public.raise_app_error('not_found'); end if;

  select * into fr from public.feedback_requests where engagement_id = e.id and direction = v_dir for update;
  if fr.completed_at is not null or exists (select 1 from public.feedback where engagement_id = e.id and direction = v_dir) then
    perform public.raise_app_error('feedback_already_submitted');
  end if;
  if fr.id is null then
    insert into public.feedback_requests (engagement_id, user_id, direction) values (e.id, v_uid, v_dir)
    returning * into fr;
  end if;

  -- "Not yet": keeps the reminder schedule running. From the last reminder on, only Yes / No.
  if p_worked_together = 'not_yet' then
    if fr.reminders_sent >= 2 then perform public.raise_app_error('answer_required'); end if;
    update public.feedback_requests set last_answer = 'not_yet' where id = fr.id;
    return null;
  end if;
  if p_worked_together = 'yes' and (p_overall is null or p_overall not between 1 and 5) then
    perform public.raise_app_error('overall_required');
  end if;

  insert into public.feedback (engagement_id, author_id, subject_id, direction, worked_together, no_reason, overall,
                               quality, communication, reliability, value_for_money, brief_clarity, fair_payment,
                               would_again, comment)
  values (e.id, v_uid, v_subject, v_dir, p_worked_together,
          case when p_worked_together = 'no' then coalesce(p_no_reason, 'other') end,
          case when p_worked_together = 'yes' then p_overall end,
          case when v_dir = 'poster_to_provider' then (p_scores ->> 'quality')::smallint end,
          (p_scores ->> 'communication')::smallint,
          case when v_dir = 'poster_to_provider' then (p_scores ->> 'reliability')::smallint end,
          case when v_dir = 'poster_to_provider' then (p_scores ->> 'value_for_money')::smallint end,
          case when v_dir = 'provider_to_poster' then (p_scores ->> 'brief_clarity')::smallint end,
          case when v_dir = 'provider_to_poster' then (p_scores ->> 'fair_payment')::smallint end,
          case when p_worked_together = 'yes' then p_would_again end,
          case when p_worked_together = 'yes' then nullif(trim(p_comment), '') end)
  returning id into v_id;

  if coalesce(trim(p_private_note), '') <> '' then
    insert into public.feedback_private_notes (feedback_id, note) values (v_id, trim(p_private_note));
  end if;

  v_was_blocked := fr.blocked_at is not null;
  update public.feedback_requests set completed_at = now(), last_answer = p_worked_together where id = fr.id;
  if v_was_blocked and not public.is_feedback_blocked(v_uid) then
    perform private.notify(v_uid, 'account_unblocked', '{}'::jsonb);
  end if;

  -- Blind reveal: when both sides have submitted, reveal both now.
  select id into v_other from public.feedback where engagement_id = e.id and id <> v_id;
  if v_other is not null then
    perform private.reveal_feedback(v_id);
    perform private.reveal_feedback(v_other);
  end if;
  return v_id;
end $$;

create or replace function public.admin_hide_review_comment(p_feedback uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('reviewer');
begin
  update public.feedback set comment_hidden = true where id = p_feedback;   -- stars are never changed
  if not found then perform public.raise_app_error('not_found'); end if;
  perform private.audit('review_comment_hidden', 'feedback', p_feedback::text, null, null, p_reason);
end $$;

-- Public reviews: revealed, worked together, no private data. Used on profiles.
create view public.public_reviews as
select f.id, f.subject_id, f.direction, f.overall, f.quality, f.communication, f.reliability, f.value_for_money,
       f.brief_clarity, f.fair_payment, f.would_again,
       case when f.comment_hidden then null else f.comment end as comment,
       f.submitted_at,
       case when f.direction = 'poster_to_provider' then pp.display_name else pr.display_name end as author_name
  from public.feedback f
  join public.engagements e on e.id = f.engagement_id and e.cancelled_at is null
  left join public.poster_profiles pp on pp.user_id = f.author_id
  left join public.provider_profiles pr on pr.user_id = f.author_id
 where f.revealed_at is not null and f.worked_together = 'yes';
