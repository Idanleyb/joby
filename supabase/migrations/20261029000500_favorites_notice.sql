-- =============================================================================
-- 20261029000500 — "Shortlist" is called "מועדפים" (favorites) in the UI, and the provider is
-- notified the first time a poster marks the application as a favorite (founder, 2026-10-29).
-- Status value stays 'shortlisted' in the database. Also fixes the button: the status needed a cast
-- ("column status is of type application_status but expression is of type text").
-- =============================================================================

create or replace function public.shortlist_application(p_app uuid, p_on boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.applications := private.require_job_owner_for_app(p_app);
begin
  if a.status not in ('sent', 'viewed', 'shortlisted') then perform public.raise_app_error('invalid_state'); end if;
  update public.applications
     set status = (case when p_on then 'shortlisted' else 'viewed' end)::public.application_status,
         viewed_at = coalesce(viewed_at, now())
   where id = a.id;
  -- Once per application: un-marking and marking again does not notify twice.
  if p_on and a.status <> 'shortlisted' and not exists (
       select 1 from public.notifications
        where user_id = a.provider_id and event = 'application_shortlisted' and payload ->> 'application_id' = a.id::text) then
    perform private.notify(a.provider_id, 'application_shortlisted', jsonb_build_object('job_id', a.job_id, 'application_id', a.id));
  end if;
end $$;
