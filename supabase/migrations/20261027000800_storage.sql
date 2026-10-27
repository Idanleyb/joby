-- =============================================================================
-- Joby MVP · 0800 · File storage
-- Every user uploads into a folder named after their user id: <uid>/<file>.
--   avatars           public    profile photos, poster logos           2 MB
--   verification-docs private   Form 3010 / proof of marriage          10 MB  (deleted after decision)
--   cvs               private   CVs; signed-in users can read visible CVs   5 MB
--   job-attachments   private   job photos / PDFs, signed-in users read  10 MB
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('cvs', 'cvs', false, 5242880,
   array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('job-attachments', 'job-attachments', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Avatars
create policy "avatars are public" on storage.objects for select using (bucket_id = 'avatars');
create policy "upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Verification documents: owner uploads; only owner and admins read; deletion by the server.
create policy "upload own verification docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "read own verification docs or admin" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- CVs: owner manages; signed-in users can read the CV of an approved provider who allows it.
create policy "upload own cv" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace own cv" on storage.objects for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own cv" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "read visible cvs" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (
    (storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()
    or exists (select 1 from public.provider_profiles pp
                where pp.user_id::text = (storage.foldername(name))[1]
                  and pp.verification_status = 'approved' and pp.cv_visible and pp.cv_path = name)));

-- Job attachments
create policy "upload own job attachments" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own job attachments" on storage.objects for delete to authenticated
  using (bucket_id = 'job-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "signed-in users read job attachments" on storage.objects for select to authenticated
  using (bucket_id = 'job-attachments');
