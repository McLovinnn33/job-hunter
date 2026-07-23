# AGENTS.md — Rules for AI agents working on this project

*Claude Code (both Opus and Fable) reads this file before doing any work in this repository.*

## Context
You are working with a non-technical product owner who cannot code (vibecoding). Therefore:
- After EVERY change, explain in plain language what you did and how to test it
- Never assume the owner understands error messages — explain them
- If you're unsure about something, ask rather than guess

## Tech stack (binding, do not change without logging it in DECISIONS.md)
- Next.js (App Router) + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui for components
- Supabase (database, auth, storage)
- Vercel (hosting) + Vercel Cron Jobs (scheduled tasks)
- Stripe (payments), Telegram Bot API, Resend (email)
- Embedding model (Voyage AI or equivalent) for semantic matching
- Claude API: Haiku 4.5 (high volume), Sonnet 5 (quality) — in the app's RUNTIME
- Never use Opus/Fable in the app's production code — those are development tools only

## Code conventions
- Always TypeScript, never plain JavaScript
- Variable/function names in English, comments may be in Slovak
- Every function calling an external API (scraping, AI, payments) MUST have error handling
- No "magic numbers" — constants named and declared at the top of the file
- Before changing the database schema: check against `DATABASE_SCHEMA.md`, update it when you change it

## Module boundaries
- Work only within the module folder you're assigned to; don't touch other modules without explaining why
- If a module needs a change in another module, flag it explicitly, don't do it silently

## Testing (critical, since the owner doesn't code)
After every completed task, always write:
1. Exactly how to run/test this change (step by step, concrete commands)
2. What result the owner should expect if it works
3. What to do if an error appears (at least basic diagnostic steps)

## Workflow & AI-safety rules (protect the code from the AI)
These rules exist because AI coding agents have known failure modes: silently
breaking unrelated code, inventing APIs, drifting from the spec, and losing
context between sessions. Every rule below blocks one of those.
- **One module = one git branch** (e.g. `m1-database`). Never build a module
  directly on `main`. Merge to `main` only after the owner has tested and
  approved. `main` must always be a working app.
- **Definition of done** for every task — ALL of these, no exceptions:
  1. `npm run check` passes (typecheck + lint + tests + production build)
  2. No secrets in code, `.env.local` still gitignored
  3. Docs updated if schema/decisions/UI changed (the doc IS the spec)
  4. Plain-language test instructions written for the owner
  5. Tests exist for the module's core logic (see "Regression safety" below)
  6. Any new env var is added to Vercel AND the feature is verified on the
     deployed URL — "works locally" is not done (ROADMAP.md R1)

## Regression safety (ROADMAP.md Part C — these rules exist to stop an AI agent breaking working code)
- **Never weaken or delete a test to make a change pass.** If a test fails,
  either the change is wrong or the test's expectation genuinely changed —
  in the second case, say so explicitly and explain why before editing it.
- **Every data shape crossing a module boundary** (especially anything
  stored as `jsonb`) is defined ONCE as a Zod schema in `src/lib/contracts/`
  and validated at both write and read. Never re-declare the shape locally,
  never `as SomeType` an unvalidated database value (ROADMAP.md R2).
- **Touching a file outside the module you were assigned** requires stating
  what and why FIRST, before editing. No silent cross-module changes.
- **After any database migration**, run `npm run verify-db` and report the
  result. Never assume the live schema matches the repo.
- **Every migration ships with a written "how to undo this"** note in the
  same file.
- Prefer adding a new function over editing a shared one used elsewhere;
  when a shared function must change, list every call site first.
- **After the owner verifies a module works, tag it**: `git tag m1-verified`.
  Tags are permanent restore points — if a later module breaks something,
  we can always return to the last verified state.
- Never `git push --force`, never rewrite git history, never delete or
  weaken a test to make it pass, never commit directly to `main`.
- Touch only files the task requires. Do not "improve" or reformat
  unrelated code — small diffs are reviewable diffs.
- Every new table must have RLS enabled with a policy before the module is
  considered done (see SECURITY_GDPR.md S1).
- AI model IDs used by the app are named constants in ONE config file —
  verify current strings at docs.claude.com at implementation time.
- The daily cron is a dispatcher that enqueues small batches — never a
  monolithic loop over all users (REVIEW_NOTES Finding 4).

## Legal/architectural constraints (do not change without discussion)
- Read SECURITY_GDPR.md before any module touching user data. RLS on every
  table, secrets only in env vars, CV bucket private.
- Scraping is ALWAYS a per-user targeted search (as the user would do it themselves), 
  with deduplication of overlapping queries and short-term (24-48h) caching for 
  internal matching only — NEVER a permanent central copy/archive of the portal's 
  database — see DECISIONS.md ADR-001
- Matching is NEVER just a keyword filter — always embedding + AI evaluation of a 
  match gradient, see DECISIONS.md ADR-004

## Before major decisions
Check `DECISIONS.md` — if something has already been decided and justified, don't 
propose changing it without asking why it's that way first.
