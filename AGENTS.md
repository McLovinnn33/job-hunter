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

## Legal/architectural constraints (do not change without discussion)
- Scraping is ALWAYS a per-user targeted search (as the user would do it themselves), 
  with deduplication of overlapping queries and short-term (24-48h) caching for 
  internal matching only — NEVER a permanent central copy/archive of the portal's 
  database — see DECISIONS.md ADR-001
- Matching is NEVER just a keyword filter — always embedding + AI evaluation of a 
  match gradient, see DECISIONS.md ADR-004

## Before major decisions
Check `DECISIONS.md` — if something has already been decided and justified, don't 
propose changing it without asking why it's that way first.
