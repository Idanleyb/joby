-- =============================================================================
-- 1300 (2026-10-28) — Reviews show the engagement title (like Upwork's work history).
-- Columns are only appended, so existing readers keep working.
-- =============================================================================
create or replace view public.public_reviews as
select f.id, f.subject_id, f.direction, f.overall, f.quality, f.communication, f.reliability, f.value_for_money,
       f.brief_clarity, f.fair_payment, f.would_again,
       case when f.comment_hidden then null else f.comment end as comment,
       f.submitted_at,
       case when f.direction = 'poster_to_provider' then pp.display_name else pr.display_name end as author_name,
       e.title as engagement_title
  from public.feedback f
  join public.engagements e on e.id = f.engagement_id and e.cancelled_at is null
  left join public.poster_profiles pp on pp.user_id = f.author_id
  left join public.provider_profiles pr on pr.user_id = f.author_id
 where f.revealed_at is not null and f.worked_together = 'yes';
grant select on public.public_reviews to anon, authenticated;
