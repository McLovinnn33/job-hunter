# DATABASE_SCHEMA.md — Supabase (Postgres) schema

*Single source of truth for data structure. When the schema changes in code, update this file too.*

*Amended July 2026 per REVIEW_NOTES Findings 1–3, 7–9 and SECURITY_GDPR G5 —
these amendments are implemented in Module M1.*

## `users`
```
id (= auth.users.id — references Supabase's built-in auth, never duplicates it),
email, telegram_id, whatsapp_number, phone (for SMS),
preferred_channel,
plan (free/basic/pro/passive — empty/free until Phase 5, reserved for Stripe),
stripe_customer_id (nullable, reserved for Phase 5),
last_active_at (updated on login/notification click — drives the 3-year
  retention deletion, SECURITY_GDPR G5),
created_at
```
*Note: `digest_frequency` was removed (Finding 7) — notification frequency
lives only in `notification_preferences.frequency`, one source of truth.*

## `profiles`
```
user_id, raw_cv_text, cv_file_url, chat_summary (text from the 
AI onboarding conversation), preferences_json (keyword, location, 
salary, employment type), profile_embedding (vector — from CV + 
chat combined, not just short preferences), updated_at
```

## `cv_versions`
```
id, user_id, version_name (e.g. "Frontend", "Fullstack"), 
file_url, tailored_for_tag, created_at
```

## `job_postings` (shared short-term CACHE — never a permanent archive, ADR-001)
```
id, source (profesia/worki/kariera), title, company, salary,
salary_estimate_min, salary_estimate_max, salary_is_estimated (bool)
  (MVP "rough salary estimate" feature — Finding 9),
location, url, posted_date, scraped_at,
expires_at (scraped_at + 48h — daily cleanup deletes expired rows UNLESS
  referenced in matches/application_tracker, see ADR-001 amendment),
description_text, job_embedding (vector),
deadline (AI-extracted if present),
fake_score (0-100, computed once per posting)
```

## `search_queries` (the dedup mechanism of ADR-001 — Finding 2)
```
id, query_hash (normalized: position + location + filters),
query_params_json, last_executed_at, result_count, created_at
→ The scraper checks query_hash + last_executed_at before hitting a
  portal; if an equivalent query ran <24–48h ago, it reuses cached
  job_postings rows instead of scraping again.
```

## `scrape_runs` (feeds the "agent is scanning..." UI + owner's debugging log — Finding 8)
```
id, user_id (nullable for shared runs),
status (running/completed/failed),
started_at, finished_at, postings_found, matches_created
```

## `matches`
```
id, user_id, job_posting_id, match_tier (strong_match/
worth_considering/stretch), match_score (numeric, from embedding 
comparison), ai_reasoning (text — why it matches or why it's a 
lower match), sent_at, channel_used
```

## `application_tracker`
```
id, user_id, job_posting_id, status (new_match/interested/
applied/interview/offer/rejected), applied_at, cv_version_id 
(reference to cv_versions), cover_letter_text, deadline, 
user_notes, follow_up_reminder_at,
snapshot fields copied on `applied`: title, company, url, deadline
  (so the tracker survives when the cached posting row expires)
```
*`deadline` existing in both job_postings and application_tracker is
INTENTIONAL (Finding 12) — the tracker snapshot must survive posting expiry.
Do not "deduplicate" it.*

## `user_feedback`
```
user_id, job_posting_id, feedback_type (fake/relevant/
irrelevant), created_at
→ This table is the foundation for future automatic 
  fake-job detection (Phase 3+)
```

## `blacklisted_companies`
```
user_id, company_name, created_at
```

## `notification_preferences`
```
user_id, channel (telegram/whatsapp/email/sms/push), 
enabled (bool), priority_threshold (from which match_tier 
to send on this channel),
frequency (immediate/daily/weekly — per channel; the ONLY place
  notification frequency is stored, Finding 7)
```

## `usage_counters` (free-tier limits — Finding 3; empty until Phase 5 logic)
```
user_id, week, alerts_sent
```

---

## Onboarding chat (Module M3)
No schema changes — uses existing `profiles.chat_summary` (text) and
`preferences_json` (jsonb: `{keyword, location, salaryMin, employmentType}`).
Full conversation transcript is never persisted (GDPR G4/Finding 13) — it
lives only in the browser's component state during the chat and is resent
to the server each turn; only the final summary + structured preferences
are written to `profiles`.

## Scraper support (Module M5 — `supabase/migrations/0003_scraper_support.sql`)
Unique index on `job_postings (source, url)` enables idempotent upserts
(re-scraped postings refresh `expires_at` instead of duplicating).
`cleanup_expired_postings()` is a service-only DB function implementing the
ADR-001 amendment: deletes expired postings NOT referenced by matches or
application_tracker; scheduled daily from M13's cron.

## Storage (Module M2 — `supabase/migrations/0002_cv_storage.sql`)
Bucket `cvs`: **private**, 10 MB limit, PDF + DOCX only. Files live at
`<user_id>/cv.<ext>`; storage RLS restricts every operation to the owner's
folder. Viewing goes through short-lived signed URLs (120 s) — never public
links (SECURITY_GDPR S4). `profiles.cv_file_url` stores the storage PATH,
not a URL.

## Security note (SECURITY_GDPR S1, REVIEW_NOTES Finding 5)
Every table gets Row Level Security ENABLED with owner-only policies in
Module M1. `job_postings` and `search_queries` are shared/service-only:
users can read postings only through their own `matches`. No module that
adds a table is done until its RLS policy exists and is tested.

## RLS policy list (implemented in `supabase/migrations/0001_initial_schema.sql`)

| Table | select | insert | update | delete |
|---|---|---|---|---|
| users | own row | — (auth trigger) | own row | — (account deletion = service, M10/G6) |
| profiles | own | — (auth trigger) | own | — (cascade with account) |
| cv_versions | own | own | own | own |
| job_postings | only via own `matches` row | — service only | — service only | — service only |
| search_queries | — service only (no policies at all) | — | — | — |
| scrape_runs | own | — service only | — service only | — service only |
| matches | own | — service only (pipeline) | — service only | — service only |
| application_tracker | own | own | own | own |
| user_feedback | own | own | own | own |
| blacklisted_companies | own | own | — | own |
| notification_preferences | own | own | own | own |
| usage_counters | own | — service only | — service only | — service only |

"own" = `(select auth.uid()) = user_id` (or `= id` for users). "service
only" = no policy exists, so with RLS enabled the anon/authenticated keys
get nothing; only server code with the service_role key (never shipped to
the browser, S3) can touch it.

Additional automation in the migration: `on_auth_user_created` trigger
creates the `users` + `profiles` rows for every new sign-up (with backfill
for accounts created before the migration); `updated_at` auto-touch
triggers on profiles and application_tracker.

## Note on embeddings
`profile_embedding` and `job_embedding` are vectors stored via the
`pgvector` extension in Supabase. The dimension is FIXED at column
creation and gets pinned in Module M4 (ADR-007) — until then it stays a
named constant with a TODO. `job_embedding` gets an HNSW index
(Finding 11) so similarity search stays fast as postings grow.
Comparison is done via a cosine similarity SQL query, not an AI call —
this is a cheap, fast step BEFORE anything gets sent to Haiku/Sonnet
for final evaluation.
