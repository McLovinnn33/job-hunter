# DECISIONS.md — Architecture Decision Records

*A short log of WHEN and WHY something was decided. AI agents should read this before proposing changes to already-decided things.*

## ADR-001: Deduplicated search + short-term cache (revised)
**Original decision (superseded):** Strictly individual per-user search, no shared cache at all.
**Revised decision:** Similar/overlapping user queries (e.g. same position + location) are deduplicated into a single search. Results are cached short-term (24-48h), used only for internal matching for active users with similar preferences — not as a permanent, growing, browsable database. No user ever sees results outside their own matching.
**Reason for change:** Strict 1:1 per-user search is wasteful at scale (repeated identical requests). A short-term, purpose-limited cache is a reasonable compromise between efficiency and legal risk.
**Sui generis database right (§130-135 Slovak Copyright Act) — still a relevant risk:** Protects structured databases of portals like Profesia/Worki against extraction of a substantial part. The distinction between "temporary working memory to serve your own users" (lower risk) and "building a permanent competing database" (higher risk) is real but not precisely defined in this document.
**⚠️ NOT YET VERIFIED BY A LAWYER:** This decision is a technical assumption, not a confirmed legal conclusion. Must be verified in the planned legal consultation BEFORE scaling past a few dozen users. If the app is run with a small number of test users (dozens), the risk is low even without a prior consultation; a consultation is required before public launch.

**Amendment (July 2026, from REVIEW_NOTES Finding 1):** `job_postings` is
explicitly a short-term cache, not an archive: every row gets `expires_at`
(scraped_at + 48h); a daily cleanup job deletes expired rows UNLESS the row is
referenced in `matches` or `application_tracker` (a posting actually delivered
to a specific user is that user's legitimate working data). On `applied`
status, title/company/url/deadline are copied into `application_tracker` as a
snapshot. This retention rule goes on the lawyer's agenda explicitly:
"retained rows = only postings delivered to a specific user."

## ADR-002: Next.js/Supabase/Vercel instead of Bubble.io
**Decision:** The entire app is real code (Next.js), not a no-code tool.
**Reason:** Vibecoding with Claude Code/Opus/Fable requires the AI to directly edit code files. Bubble.io is a visual drag-and-drop interface that AI cannot directly manipulate — incompatible with the vibecoding approach.

## ADR-003: Vercel Cron Jobs instead of a standalone AI agent framework (OpenClaw/Hetzner)
**Decision:** The daily scraping run is a plain scheduled script (cron job) within the same Next.js project, not a separate "AI agent" on an external server.
**Reason:** The task ("check sources daily, evaluate, send") doesn't need a full conversational AI agent framework. Simplifies infrastructure to a single hosting setup instead of two separate systems.

## ADR-004: Semantic (embedding) matching instead of pure keyword filtering
**Decision:** Matching postings to a user's profile happens in three steps: embedding comparison (broad candidate set) → AI evaluation of the match gradient (not yes/no).
**Reason:** A pure keyword filter would exclude relevant postings that don't use the exact same words as the user (e.g. "React Engineer" vs "frontend developer"), even when the user's CV/context shows genuine relevance/fit.

## ADR-005: Model routing — Opus by default, Fable only for integration
**Decision:** Individual module development = Opus. Fable is used exclusively for (a) connecting multiple finished modules together, (b) debugging errors that span multiple files.
**Reason:** Opus is strong enough for well-scoped tasks at a fraction of Fable's cost. Fable's real advantage only shows up on long, complex, multi-step tasks.

## ADR-006: Production AI = Haiku 4.5 + Sonnet 5, never Opus/Fable
**Decision:** The running app only calls Haiku (high volume: match reasoning, fake detection) and Sonnet (quality: onboarding chat, cover letter).
**Reason:** Opus/Fable are 5-25x more expensive with no real benefit for these simple, well-scoped production tasks.
**Note (REVIEW_NOTES Finding 6):** "Haiku"/"Sonnet" here mean the *current* models of that class — exact model ID strings are verified at docs.claude.com at implementation time and declared as named constants in one config file.

## ADR-007: Embedding model choice — PLACEHOLDER, decided at Module M4
**Decision:** Not yet made. M4 pins the Voyage AI model name, price, and vector dimension (pgvector columns have a fixed dimension — changing it later means re-embedding everything, see REVIEW_NOTES Finding 11).
**Rule until then:** vector column dimension stays a named constant with a TODO; M1 creates the schema with this constant.
