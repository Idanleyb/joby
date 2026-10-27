-- =============================================================================
-- Joby MVP · 0700 · Row-level security and grants
-- Rule of thumb: reads go through RLS policies; every write that carries a
-- business rule goes through a security-definer RPC. Direct table writes are
-- allowed only where the owner edits their own content.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Function privileges: nothing callable by anonymous visitors except read helpers.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public, anon;

grant execute on function public.setting_int(text), public.setting_json(text), public.is_admin(public.admin_role),
  public.budget_required(smallint, public.work_mode), public.short_name(text), public.days_to_band(integer),
  public.normalize_il_phone(text)
  to anon;

-- Server-only (service role): verification intake and document cleanup.
revoke execute on function public.submit_verification(uuid, public.verification_kind, text[], jsonb, integer, text, text)
  from authenticated;
revoke execute on function public.mark_documents_deleted(uuid) from authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.run_timers() to service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings', 'profiles', 'admins', 'admin_audit_log', 'categories', 'subcategories', 'notifications',
    'poster_profiles', 'provider_profiles', 'provider_subcategories', 'provider_skills', 'service_cards',
    'provider_experience', 'provider_education', 'provider_wallets', 'credit_transactions',
    'verification_requests', 'spouse_links', 'user_blocks', 'jobs', 'job_claims', 'applications',
    'engagements', 'extra_hire_requests', 'direct_requests', 'feedback_requests', 'feedback',
    'feedback_private_notes', 'reports', 'category_suggestions']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Only explicitly granted writes are possible from the API.
revoke insert, update, delete on all tables in schema public from anon, authenticated;
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reference data (public)
-- ---------------------------------------------------------------------------
create policy "settings readable" on public.app_settings for select using (true);
create policy "categories readable" on public.categories for select using (true);
create policy "subcategories readable" on public.subcategories for select using (true);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create policy "own profile or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
grant update (marketing_opt_in, notification_prefs) on public.profiles to authenticated;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own admin row or admin" on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin('admin'));
create policy "audit for admins" on public.admin_audit_log for select to authenticated
  using (public.is_admin('admin'));

create policy "own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and in_app);

-- ---------------------------------------------------------------------------
-- Posters & providers
-- ---------------------------------------------------------------------------
create policy "poster profiles public" on public.poster_profiles for select using (true);

create policy "approved providers public, own, admin" on public.provider_profiles for select
  using (verification_status = 'approved' or user_id = (select auth.uid()) or public.is_admin());
grant update (display_name, headline, bio, photo_path, city, radius_km, works_onsite, works_remote,
              years_experience, languages, portfolio_links, cv_path, cv_visible, other_title, license_number,
              show_days_band, onboarding_step)
  on public.provider_profiles to authenticated;
create policy "update own provider profile" on public.provider_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Child tables of the provider profile: visible with the profile, editable by the owner.
do $$
declare t text;
begin
  foreach t in array array['provider_subcategories', 'provider_skills', 'service_cards',
                           'provider_experience', 'provider_education'] loop
    execute format($f$
      create policy "visible with profile" on public.%1$I for select using (
        provider_id = (select auth.uid()) or public.is_admin()
        or exists (select 1 from public.provider_profiles pp
                    where pp.user_id = %1$I.provider_id and pp.verification_status = 'approved'));
      create policy "owner inserts" on public.%1$I for insert to authenticated
        with check (provider_id = (select auth.uid()));
      create policy "owner updates" on public.%1$I for update to authenticated
        using (provider_id = (select auth.uid())) with check (provider_id = (select auth.uid()));
      create policy "owner deletes" on public.%1$I for delete to authenticated
        using (provider_id = (select auth.uid()));
      grant insert, update, delete on public.%1$I to authenticated;
    $f$, t);
  end loop;
end $$;

create policy "own wallet" on public.provider_wallets for select to authenticated
  using (provider_id = (select auth.uid()) or public.is_admin());
create policy "own ledger" on public.credit_transactions for select to authenticated
  using (provider_id = (select auth.uid()) or public.is_admin());

create policy "own verification" on public.verification_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "spouse link parties" on public.spouse_links for select to authenticated
  using (reservist_id = (select auth.uid()) or spouse_user_id = (select auth.uid()) or public.is_admin());

create policy "own blocks" on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Jobs and flows
-- ---------------------------------------------------------------------------
create policy "jobs public unless held or removed" on public.jobs for select
  using (status in ('open', 'hired', 'closed_no_hire', 'expired')
         or poster_id = (select auth.uid()) or public.is_admin());
grant update (title, description, skills, city, timeline, start_date, attachment_paths,
              subcategory_id, mode, budget_type, budget_min, budget_max)
  on public.jobs to authenticated;
create policy "owner edits job" on public.jobs for update to authenticated
  using (poster_id = (select auth.uid())) with check (poster_id = (select auth.uid()));

create policy "claims for admins" on public.job_claims for select to authenticated using (public.is_admin());

create policy "application parties" on public.applications for select to authenticated
  using (provider_id = (select auth.uid()) or public.is_admin()
         or exists (select 1 from public.jobs j where j.id = applications.job_id and j.poster_id = (select auth.uid())));

create policy "request parties" on public.direct_requests for select to authenticated
  using (poster_id = (select auth.uid()) or provider_id = (select auth.uid()) or public.is_admin());

create policy "engagement parties" on public.engagements for select to authenticated
  using (poster_id = (select auth.uid()) or provider_id = (select auth.uid()) or public.is_admin());

create policy "extra hire poster or admin" on public.extra_hire_requests for select to authenticated
  using (poster_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Feedback: authors see their own; everyone sees revealed reviews via public_reviews.
-- ---------------------------------------------------------------------------
create policy "own feedback requests" on public.feedback_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "own or revealed-to-me feedback" on public.feedback for select to authenticated
  using (author_id = (select auth.uid()) or public.is_admin()
         or (subject_id = (select auth.uid()) and revealed_at is not null));
create policy "notes for admins" on public.feedback_private_notes for select to authenticated
  using (public.is_admin());

grant select on public.public_reviews to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trust & safety
-- ---------------------------------------------------------------------------
create policy "own reports or admin" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "own suggestions or admin" on public.category_suggestions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
