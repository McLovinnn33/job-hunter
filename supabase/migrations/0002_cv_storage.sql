-- =====================================================================
-- Job Hunter — Module M2: úložisko životopisov
-- SECURITY_GDPR S4: bucket je PRIVÁTNY, súbory sa zobrazujú len cez
-- krátkodobé podpísané odkazy. Každý používateľ má vlastný priečinok
-- (názov = jeho user id) a vidí len ten.
-- Spustenie: Supabase dashboard → SQL Editor → vložiť → Run
-- =====================================================================

-- Privátny bucket "cvs": max 10 MB, len PDF a DOCX
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS politiky na objekty: každý len vo svojom priečinku <user_id>/...
create policy "cvs_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cvs_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cvs_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cvs_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
