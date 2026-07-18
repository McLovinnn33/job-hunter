# REVIEW_NOTES.md — Cross-document review (pre-Module-0)

*Fable review session, July 2026. Reviewed: job_hunter_complete_plan.md, AGENTS.md, DATABASE_SCHEMA.md, DECISIONS.md, UI_UX.md. No code written — planning output only.*

**Overall verdict:** The documents are unusually coherent for a pre-build spec. The tech stack is consistent everywhere, ADRs match the plan, and UI_UX maps cleanly onto the match-tier model. There is **one genuine contradiction** (Finding 1), a handful of **missing schema pieces**, one **real infrastructure risk** (Vercel timeouts), and the **module order should change** (database must come before the scrapers). Everything below is ranked by severity.

---

## PART A — Findings

### 🔴 Critical — resolve before Module 0

#### Finding 1: `job_postings` contradicts ADR-001
DATABASE_SCHEMA.md describes `job_postings` as "shared across users, not duplicated," with embeddings and a fake_score "computed once per posting." That is a **permanent, growing, central table of scraped postings** — exactly what ADR-001 says you will NOT build ("never a permanent central copy/archive of the portal's database").

**Resolution (recommended):** Keep `job_postings`, but make it explicitly a cache:
- Add `expires_at` (scraped_at + 48h).
- A daily cleanup job deletes expired rows **unless** the row is referenced in `matches` or `application_tracker` (a posting a user was actually shown/saved is that user's legitimate working data, not a bulk archive).
- On `applied` status, copy `title`, `company`, `url`, `deadline` into `application_tracker` as a snapshot, so the tracker survives even if the posting row is later removed or the source posting disappears.
- Document this retention rule in DECISIONS.md as an amendment to ADR-001, and put it on the lawyer's agenda explicitly ("retained rows = only postings delivered to a specific user").

Without this, the schema silently re-creates the higher-risk architecture ADR-001 was written to avoid.

#### Finding 2: The dedup mechanism from ADR-001 has no table
ADR-001's whole point is "deduplicate overlapping user queries." Nothing in the schema stores queries, so there is nothing to deduplicate against. Add:

```
search_queries
  id, query_hash (normalized: position + location + filters),
  query_params_json, last_executed_at, result_count, created_at
```

The scraper checks `query_hash` + `last_executed_at` before hitting a portal; if a matching query ran < 24–48h ago, it reuses cached `job_postings` rows instead. This table is the implementation of ADR-001 — it belongs in the first scraper module.

#### Finding 3: No billing/plan data anywhere
The business model has 4 tiers (Free/Basic/Pro/Passive) with per-tier limits ("limited alerts/week"), but the schema has no plan field, no Stripe customer ID, no usage counter. Stripe is Phase 5, but retrofitting billing into a live schema is painful. Add now (empty until Phase 5):

```
users: + plan (free/basic/pro/passive), stripe_customer_id
usage_counters (or a view): user_id, week, alerts_sent
```

Free-tier limiting also affects Module logic (notifications must check the counter), so it can't be bolted on later without touching the notification module again.

#### Finding 4: The daily cron will not fit in one Vercel function invocation
The plan assumes: one daily cron → scrape 3 portals → embed → Haiku-evaluate → notify, for *all users*. Vercel serverless functions have execution time limits (short on Hobby, longer on paid tiers, but still bounded). Even at 20–50 beta users this single-invocation design will time out.

**Resolution:** The cron job must be a *dispatcher*, not a worker. It enqueues per-user (or per-query) jobs and separate invocations process small batches. Options, simplest first: (a) cron calls an internal API route per batch of N users, (b) Supabase-side scheduling/queues, (c) upgrade Vercel tier for longer durations. This is a design constraint for Module 13 (integration) and should be stated in AGENTS.md so Opus doesn't build a monolithic loop in the meantime.

Related: scraping from Vercel's shared serverless IPs may get rate-limited or blocked by portals. Treat as a known risk; the fix (proxy, different runtime, or backing off politely) is an implementation decision for the scraper modules — but budget for it mentally.

#### Finding 5: Row Level Security (RLS) is never mentioned
Supabase tables are only safe in a multi-user app if RLS policies are enabled on every table ("users can only read their own rows"). For a non-technical founder this is the single most dangerous thing to forget — without it, any logged-in user can potentially read everyone's CVs. Make it an explicit acceptance criterion of the database module (see M1) and add one line to AGENTS.md: *"Every new table must have RLS enabled with a policy before the module is considered done."*

Also: your custom `users` table must reference Supabase's built-in `auth.users` (id = auth.users.id), not duplicate it. Small detail, big confusion if missed.

---

### 🟠 Medium — resolve during the relevant module (noted per module below)

#### Finding 6: "Sonnet 5" does not exist as an API model
AGENTS.md and the plan reference "Sonnet 5." As of mid-2026 the current API models are `claude-fable-5`, `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`. Intent is clear ("current Sonnet-class model"), but code needs exact strings. Fix in AGENTS.md: *"Runtime models: current Haiku for high-volume, current Sonnet for quality — verify exact model strings at https://docs.claude.com at implementation time and declare them as named constants in one config file."* One config file also means one place to change when models update.

#### Finding 7: Duplicate notification-frequency settings
`users.digest_frequency` and `notification_preferences` (per-channel, with `priority_threshold`) overlap. Two sources of truth = guaranteed bugs. Recommendation: drop `digest_frequency` from `users`; make `notification_preferences` the single source (add `frequency` per channel there). One row per channel fully describes: enabled, from which tier, how often.

#### Finding 8: "Agent is visibly alive" (UI principle 3) has no data source
The "agent scanning…" indicator needs something to read. Add a small table:

```
scrape_runs
  id, user_id (nullable for shared runs), status
  (running/completed/failed), started_at, finished_at,
  postings_found, matches_created
```

Bonus: this doubles as your debugging/monitoring log — as a non-coder you'll want a visible history of "did last night's run actually work."

#### Finding 9: MVP salary estimate has no schema home
The MVP feature list includes "rough salary estimate (labeled as an estimate)" but `job_postings` only stores scraped `salary`. Add `salary_estimate_min`, `salary_estimate_max`, `salary_is_estimated (bool)` to `job_postings`. Cheap now, annoying later.

#### Finding 10: The "fast aha moment" needs its own trigger path
UI principle 1 (first results immediately after onboarding) cannot be served by the daily cron. It needs an on-demand "run my first search now" path — same pipeline, different trigger, running async while the UI shows the "agent scanning" state (which is exactly what Finding 8's table enables — the two features are one design). This deserves its own small module (M11 below) rather than being an afterthought inside integration; it's your key conversion moment.

#### Finding 11: Pin the embedding dimension before creating the vector columns
The schema says "e.g. 1536 dimensions depending on the model." Correct hedge, but be aware: pgvector columns are created with a **fixed** dimension, and changing it later means re-embedding everything. Current Voyage models are typically 1024 (some configurable). Decision needed at M4, not later. Also: add a vector index (HNSW) to `job_embedding` once the table exists — without it, similarity search slows dramatically as postings grow. One line in the module prompt covers it.

#### Finding 12: `deadline` lives in two places — that's actually fine, keep both deliberately
`job_postings.deadline` (AI-extracted) and `application_tracker.deadline` look like duplication, but per Finding 1's snapshot logic, copying the deadline into the tracker at apply-time is *correct* (posting rows can expire; tracker must not). Just document it as intentional in DATABASE_SCHEMA.md so a future agent doesn't "helpfully" deduplicate it.

#### Finding 13: Onboarding chat — decide: transcript or summary only?
`profiles.chat_summary` stores only a summary. That's defensible and GDPR-friendly (data minimization), but it means the AI chat can't be resumed later and you can't audit what the model asked. Recommendation: summary-only for MVP (matches your 3-year retention framing), log the decision in DECISIONS.md so it's a choice, not an accident.

#### Finding 14: WhatsApp Business API has real lead time
Phase 2b placement is right, but WhatsApp requires Meta business verification and approval (weeks, not days) and per-message costs. If you want it in 2b, start the approval process during Phase 4, not at 2b's start. No document change needed — calendar note.

---

### 🟡 Minor — no action needed now, just awareness

- **Finding 15:** `blacklisted_companies` matches by free-text `company_name` — "Slovnaft a.s." vs "SLOVNAFT" won't match. Acceptable for MVP; normalize (lowercase, strip legal suffixes) in code.
- **Finding 16:** `users` has both `whatsapp_number` and `phone` — fine, but the CV upload, GDPR policy, and these fields together mean your privacy policy needs to list every field. Hand the final DATABASE_SCHEMA.md to the lawyer with the Phase 1 consult.
- **Finding 17:** Geist via Google Fonts works; in Next.js prefer `next/font` for self-hosting (faster, no layout shift). One line in the M0 prompt.
- **Finding 18:** Module table says "Sonnet 5 (in-app)" for module 4 and 10 — same as Finding 6, fixed by the config-file approach.

### Consistency checks that PASSED (no action)
- Tech stack identical across all 5 documents ✓
- ADR-002/003/005/006 fully consistent with plan §2, §8 ✓
- Match tiers (strong/worth_considering/stretch) identical in schema, plan, and UI_UX match ring ✓
- `matches.ai_reasoning` supports UI principle 2 (transparent reasoning, even for low matches) ✓
- `user_feedback` + `application_tracker` + `blacklisted_companies` cover MVP features: manual flagging, Kanban, blacklist ✓
- `cv_versions` supports Phase 2b CV tailoring ✓
- Legal checklist timing consistent with ADR-001's "consult before public launch, dozens of beta users OK" ✓
- Phase plan and module table cover the same scope ✓
- pgvector on Supabase + cosine similarity pre-filter before AI calls: technically sound and the standard pattern ✓ (with Finding 11's dimension caveat)

---

## PART B — Final module list (revised order)

### Why the order changed
Your original plan builds three scrapers (modules 1–3) before the database (module 6). Scrapers have nowhere to write without the schema, so Opus would either invent temporary storage (wasted work) or invent its own schema (contradicting DATABASE_SCHEMA.md). **Rule of thumb: data first, then things that produce data, then things that consume it.** Also, the ADR-001 dedup/cache layer is now explicitly part of the first scraper module, and the "aha moment" trigger got its own small module.

### Dependency map (each module only needs the ones listed)

```
M0  Project skeleton + auth            ← nothing
M1  Database schema + RLS              ← M0
M2  CV upload + parsing                ← M1
M3  AI chat onboarding                 ← M1
M4  Profile embedding                  ← M2 + M3
M5  Scraper core + dedup + Profesia    ← M1
M6  Worki scraper                      ← M5
M7  Kariéra.sk scraper                 ← M5
M8  Matching pipeline                  ← M4 + M5
M9  Notifications                      ← M8
M10 Dashboard + tracker                ← M8
M11 Instant first search (aha moment)  ← M8
M12 Cover letter + CV tailoring        ← M10
M13 Integration + daily cron (FABLE)   ← everything
(M14 Stripe — Phase 5, listed for completeness)
```

M2∥M3, M5∥M4, M6∥M7, and M9∥M10∥M11 can each be built in either order.

### Master prompt template (use for every module)

```
CONTEXT
You are Claude Code (Opus) working on the Job Hunter project.
Before anything else, read: AGENTS.md, DATABASE_SCHEMA.md,
DECISIONS.md, UI_UX.md (if this module has UI), REVIEW_NOTES.md.
I am a non-technical founder — follow the AGENTS.md testing
rules strictly.

GOAL
[one paragraph from the module card below]

SCOPE
Work only on this module. If you need changes in another
module's files, stop and tell me first. Do not change the
tech stack or anything decided in DECISIONS.md.

INPUT / OUTPUT
[from the module card below]

RULES
- TypeScript strict, error handling on every external call
- Update DATABASE_SCHEMA.md if you change any table
- [module-specific rules from the card below]

WHEN DONE
Explain in plain language: (1) what you built, (2) exact
step-by-step commands to run and test it, (3) what I should
see if it works, (4) the 2-3 most likely errors and what
each one means. Assume I cannot read code.
```

---

### Module cards

#### M0 — Project skeleton + auth
**Goal:** Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui project, connected to Supabase, with email sign-up/login/logout and a protected empty dashboard page. Design tokens from UI_UX.md set up as Tailwind theme values (colors, radii); Geist + Geist Mono loaded via `next/font`.
**Depends on:** nothing. **Input:** empty repo, Supabase project credentials. **Output:** app runs locally, deploys to Vercel, login works.
**Extra rules for prompt:** "Use Supabase Auth (email). Put design tokens from UI_UX.md into the Tailwind config now, so every later module inherits them. Use next/font for Geist."
**Test:** you can register, log in, see an empty dashboard, log out — locally and on the Vercel URL.

#### M1 — Database schema + RLS
**Goal:** Create the full Supabase schema per DATABASE_SCHEMA.md **including the amendments from this review**: `search_queries`, `scrape_runs`, `job_postings.expires_at` + salary-estimate fields, `users.plan` + `stripe_customer_id`, `notification_preferences.frequency` (and drop `users.digest_frequency`), pgvector enabled, `users` linked to `auth.users`. **RLS enabled on every table with owner-only policies** (job_postings and search_queries are shared/service-only: readable to users only through their own matches).
**Depends on:** M0. **Input:** DATABASE_SCHEMA.md + REVIEW_NOTES.md Findings 1–3, 7–9, 11. **Output:** migration files, updated DATABASE_SCHEMA.md.
**Extra rules:** "Vector columns: leave dimension as a named constant with a TODO until M4 pins the embedding model — or confirm the Voyage model + dimension with me now. Add an HNSW index on job_embedding. Write the RLS policy list into DATABASE_SCHEMA.md."
**Test:** Opus gives you 2–3 SQL snippets to paste into the Supabase dashboard proving: (a) a test user can read own rows, (b) cannot read another user's rows.

#### M2 — CV upload + parsing
**Goal:** Upload a CV (PDF/DOCX) to Supabase Storage, extract raw text into `profiles.raw_cv_text`, store the file URL. Basic UI on the dashboard following UI_UX.md.
**Depends on:** M1. **Output:** working upload form + stored text.
**Extra rules:** "Handle scanned/unparseable PDFs gracefully: tell the user what happened and what to do (UI_UX.md error copy rules). Max file size limit as a named constant."
**Test:** upload 5 real Slovak CVs (different formats); check in Supabase that readable text was stored for each.

#### M3 — AI chat onboarding
**Goal:** Conversational intake (current Sonnet model via API) that asks about desired role, location, salary, employment type, and anything the CV doesn't say; produces `profiles.chat_summary` + structured `preferences_json`. Slovak-language UI, per plan.
**Depends on:** M1 (works without M2). **Output:** chat UI + saved summary/preferences; preferences editable afterwards.
**Extra rules:** "Model IDs live in one config file as named constants (see REVIEW_NOTES Finding 6). Summary-only storage, no full transcript (Finding 13). The chat must work even if the user hasn't uploaded a CV yet."
**Test:** run the chat 5 times with different personas; verify preferences_json is sensible each time and editable in the UI.

#### M4 — Profile embedding
**Goal:** Generate `profile_embedding` from CV text + chat summary combined (per DATABASE_SCHEMA.md note — not just the short preferences), via Voyage AI. Re-generate whenever CV or preferences change. **This module pins the embedding model and dimension** (Finding 11) and updates the vector columns from M1.
**Depends on:** M2 + M3. **Output:** embedding stored/updated in `profiles`.
**Extra rules:** "Choose the current recommended Voyage model, tell me its name, price, and dimension, and record the choice in DECISIONS.md as a new ADR."
**Test:** change a profile, verify (via a snippet Opus provides) that the embedding row updates.

#### M5 — Scraper core + dedup/cache + Profesia
**Goal:** The shared scraping layer implementing ADR-001: normalize a user's preferences into a query, hash it, check `search_queries` — if an equivalent query ran <24–48h ago, reuse cached `job_postings`; otherwise fetch from Profesia, store postings with `expires_at`, log the run in `scrape_runs`. Includes the daily cleanup that purges expired postings **not referenced by matches/application_tracker** (Finding 1).
**Depends on:** M1. **Output:** callable function `runSearchForUser(userId)` + cleanup job.
**Extra rules:** "This is the legally sensitive module — implement ADR-001 exactly as amended in REVIEW_NOTES Finding 1. Polite scraping: delays between requests, identify failures clearly, never retry aggressively. Structure the code so M6/M7 only add a portal adapter, not new logic."
**Test:** 3 different preference sets → postings appear in the table; run the same preferences twice within an hour → second run hits cache (visible in scrape_runs); expired unreferenced postings disappear after cleanup.

#### M6 — Worki adapter / M7 — Kariéra.sk adapter
**Goal:** Add each portal as an adapter to M5's core (no new dedup/cache logic).
**Depends on:** M5. **Test:** same 3 preference sets as M5, per portal.
**Extra rules:** "If the portal blocks serverless requests, stop and report exactly what you observed — do not silently switch to a workaround" (Finding 4's IP-blocking risk becomes visible here, and workarounds are a decision for you, not the agent).

#### M8 — Matching pipeline
**Goal:** For a user: pgvector cosine similarity between `profile_embedding` and fresh `job_embedding`s → broad candidate set → current Haiku model evaluates each into strong_match / worth_considering / stretch **with a written why** (`ai_reasoning`), per ADR-004. Also: job embedding generation for new postings, and `fake_score` computed once per posting (simple heuristic + Haiku for MVP; `user_feedback` data feeds the Phase 3+ version). Respect `blacklisted_companies`.
**Depends on:** M4 + M5. **Output:** rows in `matches`.
**Extra rules:** "The gradient is the product (ADR-004): the Haiku prompt must force an explanation even for stretch matches. Batch the Haiku calls; log token usage so I can see cost."
**Test:** 10 test postings against 2 profiles → verify a spread across all three tiers (not binary), each with a readable Slovak explanation.

#### M9 — Notifications
**Goal:** Delivery via Telegram bot + email (Resend) with urgency routing: strong match + near deadline → immediate; otherwise per-channel `frequency` digest. Respects `notification_preferences` (channel, enabled, priority_threshold) and the free-tier alerts/week counter (Finding 3). Marks `matches.sent_at` / `channel_used`.
**Depends on:** M8. **Test:** a real Telegram message and a real email arrive for a test match; a stretch match does NOT trigger an immediate send; counter increments.

#### M10 — Dashboard + application tracker
**Goal:** The main UI: match list with the **match ring** (UI_UX.md signature element) + AI reasoning always visible; Kanban tracker (new match → interested → applied → interview → offer/rejected) with deadlines, notes, snapshot-on-apply (Finding 12); fake/relevant/irrelevant flagging; company blacklist management; empty states written as invitations; "agent scanning" status from `scrape_runs` (Finding 8).
**Depends on:** M8. **Extra rules:** "Follow UI_UX.md strictly: one primary action per screen, sentence case, Geist Mono for dates/salaries, match ring animates once."
**Test:** move a match through every Kanban column; flag a posting as fake; blacklist a company and verify it stops appearing in new matches.

#### M11 — Instant first search (the aha moment)
**Goal:** When onboarding completes (profile + embedding exist), immediately trigger `runSearchForUser` + matching asynchronously, while the dashboard shows the live "agent scanning 3 portals…" state; first matches appear without waiting for the nightly run (UI principle 1).
**Depends on:** M8 (+ M10 for the visible state). **Extra rules:** "Must run async/background — never block the onboarding response. If it takes longer than the serverless limit, split it (search first, matching as a follow-up invocation) — see REVIEW_NOTES Finding 4."
**Test:** create a fresh account, complete onboarding, watch first matches appear within minutes without any manual trigger.

#### M12 — Cover letter + CV tailoring (Phase 2b)
**Goal:** For a tracked application: Sonnet generates a Slovak cover letter draft (stored in `application_tracker.cover_letter_text`, editable) and suggests which `cv_versions` entry fits best, with reasoning.
**Depends on:** M10. **Test:** 3–5 real postings → letters are specific to the posting (mention the company/role), not generic.

#### M13 — Full integration + daily cron ⚡ FABLE
**Goal:** Wire everything into the daily cycle from plan §3 — with the **dispatcher pattern** (Finding 4): the Vercel cron enqueues per-user work; batched invocations run search → match → notify; `scrape_runs` records everything; cleanup job scheduled; failures notify YOU (email), not just logs.
**Depends on:** all. **Extra rules:** "Reserve the plan's 1–2 week buffer. Before changing any module internals, list the cross-module changes you intend and why."
**Test:** full end-to-end: fresh user → onboarding → instant matches → next scheduled run delivers a digest → Kanban → feedback stored. Then: deliberately break one portal adapter and verify the run completes for the other portals and you get a failure notice.

#### M14 — Stripe (Phase 5, not now)
Plans/checkout/webhooks writing to `users.plan` + `stripe_customer_id`. Listed only so M1 reserves the fields.

---

## PART C — Document edits to make before starting M0

1. **DECISIONS.md:** amend ADR-001 with the retention rule (Finding 1); add placeholder ADR-007 for the embedding model choice (filled at M4).
2. **DATABASE_SCHEMA.md:** add `search_queries`, `scrape_runs`, the new fields from Findings 1/3/9, the Finding 7 change, and a one-line "deadline duplication is intentional" note (Finding 12). (Or: let M1's prompt instruct Opus to make these edits — either works; just don't do both.)
3. **AGENTS.md:** add two lines — RLS requirement (Finding 5) and "model IDs are named constants in one config file, verify current strings at docs.claude.com" (Finding 6). Optionally add: "the daily cron is a dispatcher, never a monolithic loop" (Finding 4).
4. **job_hunter_complete_plan.md §8:** replace the module table with Part B of this file.
5. Put REVIEW_NOTES.md in the project root next to the other four, and reference it in AGENTS.md's reading list.

---

*End of review. Next step per your plan: document edits above → Module 0 in Claude Code.*
