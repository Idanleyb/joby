-- =============================================================================
-- Joby MVP · 1100 · Saved jobs (job feed "Saved" tab, PRD 5.9)
-- =============================================================================
create table public.job_saves (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  job_id     uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
alter table public.job_saves enable row level security;
create policy "own saves" on public.job_saves for select to authenticated using (user_id = (select auth.uid()));
create policy "save jobs" on public.job_saves for insert to authenticated with check (user_id = (select auth.uid()));
create policy "unsave jobs" on public.job_saves for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.job_saves from anon;
grant select, insert, delete on public.job_saves to authenticated;
