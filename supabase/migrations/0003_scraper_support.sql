-- =====================================================================
-- Job Hunter — Module M5: podpora scrapingu
-- 1. Unikátny index (source, url) — umožňuje bezpečný upsert ponúk
-- 2. Funkcia cleanup_expired_postings() — denné čistenie podľa
--    ADR-001 amendmentu: maže exspirované ponuky, ktoré NIE SÚ
--    referencované v matches ani application_tracker
-- Spustenie: Supabase dashboard → SQL Editor → vložiť → Run
-- =====================================================================

create unique index if not exists job_postings_source_url_key
  on public.job_postings (source, url);

create or replace function public.cleanup_expired_postings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.job_postings jp
  where jp.expires_at < now()
    and not exists (
      select 1 from public.matches m where m.job_posting_id = jp.id
    )
    and not exists (
      select 1 from public.application_tracker t
      where t.job_posting_id = jp.id
    );
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Funkciu smie volať len service role (server) — používateľom ju odoberieme
revoke execute on function public.cleanup_expired_postings() from public;
revoke execute on function public.cleanup_expired_postings() from anon;
revoke execute on function public.cleanup_expired_postings() from authenticated;
