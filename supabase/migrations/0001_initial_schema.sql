-- =====================================================================
-- Job Hunter — Module M1: kompletná schéma databázy + RLS
-- Zdroj pravdy: DATABASE_SCHEMA.md (v znení po REVIEW_NOTES amendmentoch)
-- Spustenie: Supabase dashboard → SQL Editor → vložiť celý súbor → Run
-- Bezpečné spustiť aj opakovane po častiach — používa "if not exists"
-- tam, kde to Postgres dovoľuje.
-- =====================================================================

-- pgvector pre embeddingy (ADR-004)
create extension if not exists vector;

-- ---------------------------------------------------------------------
-- Pomocná funkcia: automatické updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- users — 1:1 s auth.users (nikdy neduplikuje Supabase auth, Finding 5)
-- ---------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  telegram_id text,
  whatsapp_number text,
  phone text,
  preferred_channel text,
  -- rezervované pre Phase 5 / Stripe (Finding 3)
  plan text not null default 'free'
    check (plan in ('free', 'basic', 'pro', 'passive')),
  stripe_customer_id text,
  -- GDPR G5: poháňa 3-ročnú retenciu, aktualizuje sa pri prihlásení
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  raw_cv_text text,
  cv_file_url text,
  chat_summary text,          -- len súhrn, nie celý prepis (GDPR G4)
  preferences_json jsonb,
  -- TODO M4 / ADR-007: ALTER na vector(N) + HNSW index, keď sa určí model
  profile_embedding vector,
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- cv_versions
-- ---------------------------------------------------------------------
create table public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  version_name text not null,
  file_url text,
  tailored_for_tag text,
  created_at timestamptz not null default now()
);

create index cv_versions_user_id_idx on public.cv_versions (user_id);

-- ---------------------------------------------------------------------
-- job_postings — zdieľaná KRÁTKODOBÁ cache, nie archív (ADR-001!)
-- ---------------------------------------------------------------------
create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('profesia', 'worki', 'kariera')),
  title text not null,
  company text,
  salary text,
  -- MVP odhad platu (Finding 9)
  salary_estimate_min numeric,
  salary_estimate_max numeric,
  salary_is_estimated boolean not null default false,
  location text,
  url text not null,
  posted_date date,
  scraped_at timestamptz not null default now(),
  -- ADR-001 amendment: expirácia; denný cleanup (M5) maže expirované
  -- riadky NEreferencované v matches/application_tracker
  expires_at timestamptz not null default now() + interval '48 hours',
  description_text text,
  -- TODO M4 / ADR-007: ALTER na vector(N) + HNSW index
  job_embedding vector,
  deadline date,
  fake_score integer check (fake_score between 0 and 100)
);

create index job_postings_expires_at_idx on public.job_postings (expires_at);
create index job_postings_source_idx on public.job_postings (source);

-- ---------------------------------------------------------------------
-- search_queries — dedup mechanizmus ADR-001 (Finding 2)
-- ---------------------------------------------------------------------
create table public.search_queries (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique,
  query_params_json jsonb not null,
  last_executed_at timestamptz,
  result_count integer,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- scrape_runs — "agent je viditeľne živý" + debug log majiteľa (Finding 8)
-- ---------------------------------------------------------------------
create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  postings_found integer,
  matches_created integer
);

create index scrape_runs_user_id_idx on public.scrape_runs (user_id);

-- ---------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  job_posting_id uuid not null references public.job_postings (id) on delete cascade,
  match_tier text not null
    check (match_tier in ('strong_match', 'worth_considering', 'stretch')),
  match_score numeric,
  ai_reasoning text not null,  -- ADR-004: vysvetlenie je povinné, aj pre stretch
  sent_at timestamptz,
  channel_used text,
  created_at timestamptz not null default now(),
  unique (user_id, job_posting_id)
);

create index matches_user_id_idx on public.matches (user_id);
create index matches_job_posting_id_idx on public.matches (job_posting_id);

-- ---------------------------------------------------------------------
-- application_tracker — Kanban; snapshot polia prežijú expiráciu ponuky
-- ---------------------------------------------------------------------
create table public.application_tracker (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- set null: ponuka môže byť po expirácii zmazaná, tracker musí prežiť
  job_posting_id uuid references public.job_postings (id) on delete set null,
  status text not null default 'new_match'
    check (status in ('new_match', 'interested', 'applied', 'interview', 'offer', 'rejected')),
  applied_at timestamptz,
  cv_version_id uuid references public.cv_versions (id) on delete set null,
  cover_letter_text text,
  -- Zámerná "duplicita" s job_postings.deadline (Finding 12) — snapshot
  deadline date,
  user_notes text,
  follow_up_reminder_at timestamptz,
  -- snapshot kopírovaný pri statuse 'applied' (ADR-001 amendment)
  snapshot_title text,
  snapshot_company text,
  snapshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_tracker_user_id_idx on public.application_tracker (user_id);
create index application_tracker_job_posting_id_idx on public.application_tracker (job_posting_id);

create trigger application_tracker_set_updated_at
  before update on public.application_tracker
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_feedback — základ budúcej automatickej fake detekcie (Phase 3+)
-- ---------------------------------------------------------------------
create table public.user_feedback (
  user_id uuid not null references public.users (id) on delete cascade,
  job_posting_id uuid not null references public.job_postings (id) on delete cascade,
  feedback_type text not null
    check (feedback_type in ('fake', 'relevant', 'irrelevant')),
  created_at timestamptz not null default now(),
  primary key (user_id, job_posting_id)
);

-- ---------------------------------------------------------------------
-- blacklisted_companies
-- ---------------------------------------------------------------------
create table public.blacklisted_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, company_name)
);

-- ---------------------------------------------------------------------
-- notification_preferences — JEDINÝ zdroj pravdy o frekvencii (Finding 7)
-- ---------------------------------------------------------------------
create table public.notification_preferences (
  user_id uuid not null references public.users (id) on delete cascade,
  channel text not null
    check (channel in ('telegram', 'whatsapp', 'email', 'sms', 'push')),
  enabled boolean not null default true,
  priority_threshold text not null default 'worth_considering'
    check (priority_threshold in ('strong_match', 'worth_considering', 'stretch')),
  frequency text not null default 'daily'
    check (frequency in ('immediate', 'daily', 'weekly')),
  primary key (user_id, channel)
);

-- ---------------------------------------------------------------------
-- usage_counters — free-tier limity (Finding 3; logika až Phase 5)
-- ---------------------------------------------------------------------
create table public.usage_counters (
  user_id uuid not null references public.users (id) on delete cascade,
  week date not null,
  alerts_sent integer not null default 0,
  primary key (user_id, week)
);

-- =====================================================================
-- Automatika: nový auth používateľ → riadok v users + profiles
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''));
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: účty zaregistrované pred touto migráciou (napr. M0 test)
insert into public.users (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;

insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- =====================================================================
-- ROW LEVEL SECURITY — na KAŽDEJ tabuľke (SECURITY_GDPR S1, Finding 5)
-- Vzor: (select auth.uid()) namiesto auth.uid() = odporúčanie Supabase
-- pre výkon (vyhodnotí sa raz na dotaz, nie na riadok).
-- =====================================================================

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.cv_versions enable row level security;
alter table public.job_postings enable row level security;
alter table public.search_queries enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.matches enable row level security;
alter table public.application_tracker enable row level security;
alter table public.user_feedback enable row level security;
alter table public.blacklisted_companies enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.usage_counters enable row level security;

-- users: čítať a upravovať len vlastný riadok; insert robí trigger,
-- delete robí account-deletion (service role, M10/G6)
create policy "users_select_own" on public.users
  for select using ((select auth.uid()) = id);
create policy "users_update_own" on public.users
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- profiles: vlastný riadok
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- cv_versions: plná správa vlastných verzií
create policy "cv_versions_select_own" on public.cv_versions
  for select using ((select auth.uid()) = user_id);
create policy "cv_versions_insert_own" on public.cv_versions
  for insert with check ((select auth.uid()) = user_id);
create policy "cv_versions_update_own" on public.cv_versions
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "cv_versions_delete_own" on public.cv_versions
  for delete using ((select auth.uid()) = user_id);

-- job_postings: zdieľaná service tabuľka — používateľ vidí ponuku LEN
-- cez vlastný match (M1 karta v REVIEW_NOTES). Zápis len service role.
create policy "job_postings_select_via_own_match" on public.job_postings
  for select using (
    exists (
      select 1 from public.matches m
      where m.job_posting_id = job_postings.id
        and m.user_id = (select auth.uid())
    )
  );

-- search_queries: čisto service tabuľka — RLS zapnuté, ŽIADNE politiky
-- pre používateľov = nikto okrem service role nevidí nič. (Zámerne.)

-- scrape_runs: používateľ vidí vlastné behy (UI "agent skenuje...")
create policy "scrape_runs_select_own" on public.scrape_runs
  for select using ((select auth.uid()) = user_id);

-- matches: čítať vlastné; zapisuje ich pipeline (service role)
create policy "matches_select_own" on public.matches
  for select using ((select auth.uid()) = user_id);

-- application_tracker: plná správa vlastných záznamov (Kanban)
create policy "application_tracker_select_own" on public.application_tracker
  for select using ((select auth.uid()) = user_id);
create policy "application_tracker_insert_own" on public.application_tracker
  for insert with check ((select auth.uid()) = user_id);
create policy "application_tracker_update_own" on public.application_tracker
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "application_tracker_delete_own" on public.application_tracker
  for delete using ((select auth.uid()) = user_id);

-- user_feedback: plná správa vlastného feedbacku
create policy "user_feedback_select_own" on public.user_feedback
  for select using ((select auth.uid()) = user_id);
create policy "user_feedback_insert_own" on public.user_feedback
  for insert with check ((select auth.uid()) = user_id);
create policy "user_feedback_update_own" on public.user_feedback
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_feedback_delete_own" on public.user_feedback
  for delete using ((select auth.uid()) = user_id);

-- blacklisted_companies: plná správa vlastného blacklistu
create policy "blacklist_select_own" on public.blacklisted_companies
  for select using ((select auth.uid()) = user_id);
create policy "blacklist_insert_own" on public.blacklisted_companies
  for insert with check ((select auth.uid()) = user_id);
create policy "blacklist_delete_own" on public.blacklisted_companies
  for delete using ((select auth.uid()) = user_id);

-- notification_preferences: plná správa vlastných nastavení
create policy "notif_prefs_select_own" on public.notification_preferences
  for select using ((select auth.uid()) = user_id);
create policy "notif_prefs_insert_own" on public.notification_preferences
  for insert with check ((select auth.uid()) = user_id);
create policy "notif_prefs_update_own" on public.notification_preferences
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "notif_prefs_delete_own" on public.notification_preferences
  for delete using ((select auth.uid()) = user_id);

-- usage_counters: čítať vlastné; zapisuje service role
create policy "usage_counters_select_own" on public.usage_counters
  for select using ((select auth.uid()) = user_id);
