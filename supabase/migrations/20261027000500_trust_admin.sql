-- =============================================================================
-- Joby MVP · 0500 · Trust & safety, category suggestions, user utilities
-- PRD 5.15 (suggestions), 5.17 (reports, blocks), 5.18 (admin queues).
-- =============================================================================

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'job', 'review')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam', 'fraud', 'offensive', 'prohibited', 'fake', 'other')),
  details     text check (char_length(details) <= 1000),
  status      public.review_state not null default 'open',
  handled_by  uuid references public.profiles (id),
  handled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_queue_idx on public.reports (status, created_at) where status = 'open';

create or replace function public.report_content(p_target_type text, p_target_id uuid, p_reason text,
                                                 p_details text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user(); v_count integer;
begin
  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (v_uid, p_target_type, p_target_id, p_reason, p_details)
  on conflict (reporter_id, target_type, target_id) do nothing;
  -- PRD 5.17: a job reported by 3 different users is hidden pending review.
  if p_target_type = 'job' then
    select count(distinct reporter_id) into v_count from public.reports
     where target_type = 'job' and target_id = p_target_id and status = 'open';
    if v_count >= 3 then
      update public.jobs set status = 'held', hold_reason = 'reports' where id = p_target_id and status = 'open';
    end if;
  end if;
end $$;

create or replace function public.resolve_report(p_report uuid, p_action_taken boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('reviewer');
begin
  update public.reports
     set status = case when p_action_taken then 'approved'::public.review_state else 'declined'::public.review_state end,
         handled_by = v_admin, handled_at = now()
   where id = p_report and status = 'open';
  if not found then perform public.raise_app_error('not_found'); end if;
  perform private.audit('report_resolved', 'report', p_report::text, null, jsonb_build_object('action_taken', p_action_taken));
end $$;

create or replace function public.block_user(p_other uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  insert into public.user_blocks (blocker_id, blocked_id) values (v_uid, p_other) on conflict do nothing;
end $$;

create or replace function public.unblock_user(p_other uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.user_blocks where blocker_id = (select auth.uid()) and blocked_id = p_other;
$$;

create or replace function public.admin_set_account_status(p_user uuid, p_status public.account_status, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_before public.account_status;
begin
  if coalesce(trim(p_reason), '') = '' then perform public.raise_app_error('reason_required'); end if;
  select status into v_before from public.profiles where id = p_user;
  update public.profiles set status = p_status where id = p_user;
  perform private.audit('account_status', 'profile', p_user::text, to_jsonb(v_before), to_jsonb(p_status), p_reason);
end $$;

-- "Missing your occupation? Tell us" (PRD 5.15)
create table public.category_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete set null,
  text       text not null check (char_length(text) between 2 and 120),
  context    text not null check (context in ('onboarding', 'browse', 'job_post')),
  status     public.review_state not null default 'open',
  handled_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index category_suggestions_queue_idx on public.category_suggestions (status, created_at) where status = 'open';

create or replace function public.suggest_category(p_text text, p_context text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.require_active_user();
begin
  insert into public.category_suggestions (user_id, text, context) values (v_uid, trim(p_text), p_context);
end $$;

create or replace function public.mark_notifications_read(p_ids bigint[] default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = (select auth.uid()) and read_at is null and (p_ids is null or id = any (p_ids));
$$;

-- Admin edits a configurable rule (PRD §7).
create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.require_admin('admin'); v_before jsonb;
begin
  select value into v_before from public.app_settings where key = p_key;
  if v_before is null then perform public.raise_app_error('not_found'); end if;
  update public.app_settings set value = p_value, updated_at = now(), updated_by = v_admin where key = p_key;
  perform private.audit('setting_updated', 'app_setting', p_key, v_before, p_value);
end $$;
