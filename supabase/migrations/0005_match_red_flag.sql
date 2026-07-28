-- =====================================================================
-- Job Hunter — M8 preview: pole pre "podozrivá ponuka"
-- Spike z 28.7.2026 ukázal, že veľká časť ponúk na portáli je nábor bez
-- reálnej pozície (MLM/poistky). Upozornenie na to je pre používateľa
-- rovnako cenné ako samotná zhoda, preto má vlastný stĺpec — nie schované
-- v texte odôvodnenia.
-- Spustenie: Supabase dashboard → SQL Editor → vložiť → Run
--
-- AKO TO VRÁTIŤ SPÄŤ (undo):
--   alter table public.matches drop column if exists red_flag;
-- =====================================================================

alter table public.matches
  add column if not exists red_flag text;

comment on column public.matches.red_flag is
  'Ak nie je NULL: dôvod, prečo ponuka pôsobí ako nábor bez reálnej pozície (MLM, clickbait, chýbajúci popis). Ponuka je zároveň vždy zrazená na najnižší stupeň zhody.';
