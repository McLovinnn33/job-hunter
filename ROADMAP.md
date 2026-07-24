# ROADMAP.md — Mid-build review, safety system & sequenced plan

*Fable review session, 22 July 2026. Written after M0, M1, M2, M3, M5 were
built and verified. Companion to REVIEW_NOTES.md (which was the pre-build
review). Findings here are numbered R1–R16 to distinguish them from
REVIEW_NOTES' Findings 1–18.*

**Verdict in one paragraph:** The planning discipline on this project is
genuinely unusual — the six reference documents, the ADR log, and the
pre-build review are better than most funded startups produce, and the
verified-and-tagged module workflow has kept `main` working through five
modules. The code that exists does real things: real auth, database-enforced
privacy, real CV parsing, real job scraping, a real AI conversation. **But
the project has now reached the size where its safety net is too thin for
its complexity, and — more importantly — it has spent five modules building
plumbing without ever testing the one hypothesis the entire product rests
on: that AI matching produces genuinely useful, well-explained matches.**
Both are fixable in a short, focused push before any new feature work.

---

## PART A — Honest assessment

### What is genuinely strong

1. **The document set is the project's biggest asset.** ADR-001's legal
   reasoning, SECURITY_GDPR's rule-to-module mapping, and REVIEW_NOTES'
   dependency ordering are the reason this codebase is coherent rather than
   a pile of AI-generated fragments. Keep this discipline; it is what makes
   a non-technical owner able to direct AI agents at all.
2. **Security was designed in, not bolted on.** RLS on every table from M1,
   verified by an actual two-user isolation test. Private CV bucket with
   expiring links. Prompt-injection separation in M3 — and it was tested
   against a real injection attempt, which it deflected. Most products this
   young have none of this.
3. **The legal position on scraping is unusually mature** for a pre-launch
   product, and ADR-001's amendment (48h expiry, cleanup that spares
   user-referenced rows) is a real, implemented mechanism rather than a
   promise.
4. **The module → branch → owner-test → merge → tag workflow works.** Five
   restore points exist and `main` has never been broken.

### What is at risk

1. **The core product hypothesis is unvalidated after five modules.** The
   product's entire value is "AI finds jobs you'd actually want and explains
   why." Nothing built so far tests that. If the match gradient turns out
   noisy or the reasoning unconvincing, most of M4–M13 is wasted motion.
   This is the single biggest risk in the project and it is cheap to test
   *now* (see Phase 1).
2. **An existential infrastructure assumption is untested.** Scraping has
   only ever run from a home IP. If Profesia blocks Vercel's shared
   serverless IPs (REVIEW_NOTES Finding 4 flagged this), the architecture
   needs rework. Discovering that at M13 costs weeks; testing it now costs
   an hour.
3. **The safety net is a type checker.** See Part C — this is the owner's
   stated top concern and it is currently justified.
4. **Production has silently drifted from local.** See R1 — features are
   merged and deployed that cannot work in production.

### Strategic risks that are not technical

- **Profesia's tolerance is a single point of failure.** One portal, one
  legal opinion, one blocking decision away from the product not working.
  Diversifying portals (M6/M7) is therefore not just "more results" — it is
  risk mitigation. But it should still come *after* validating the core.
- **Willingness to pay in Slovakia is unproven.** See Part E for market
  pricing data; the plan's four tiers need a reality check against Slovak
  purchasing power, not US SaaS benchmarks.

---

## PART B — Technical findings

### 🔴 Fix before any new feature work

#### R1: Production is broken and nobody would know
`SUPABASE_SECRET_KEY` and `ANTHROPIC_API_KEY` exist in local `.env.local`
but were never added to Vercel's environment variables. M3 (chat) and M5
(scraping) both require them. Since M3 and M5 are merged to `main` and
Vercel auto-deploys `main`, **the live site currently has an onboarding chat
that throws an error when used.** No monitoring exists to surface this.

**Fix:** add both to Vercel → Settings → Environment Variables; verify each
merged feature works on the deployed URL, not just locally. Make "does it
work in production?" part of the definition of done (see amended AGENTS.md).

#### R2: The same data shape is defined three times and cast unchecked
The onboarding preferences object exists as:
- `OnboardingPreferences` in `src/lib/ai/onboarding.ts` (4 fields)
- `SearchPreferences` in `src/lib/scraper/types.ts` (2 fields)
- an inline anonymous type in `src/app/dashboard/page.tsx` (4 fields)

and is read back in `src/lib/scraper/core.ts` as
`profile?.preferences_json as SearchPreferences` — **an unchecked cast**.
TypeScript verifies none of this at runtime. If a future session changes
what M3 writes, M5 keeps compiling and fails silently at runtime with
`undefined` search terms.

This is precisely the class of bug the owner is most afraid of, and it is
already in the codebase.

**Fix:** one Zod schema in `src/lib/contracts/`, imported by every module
that reads or writes the shape, validated at both boundaries. Covered in
Part C.

#### R3: No automated tests exist
`npm run check` = typecheck + lint + build. It catches syntax and type
errors. It does **not** catch: a broken query hash (silently disabling the
ADR-001 dedup), a wrong `expires_at` calculation (silently violating the
legal retention rule), a scraper parse regression, or an RLS policy dropped
from a migration. There is no test framework installed.

**Fix:** Part C, layer 1. This is the highest-value work available on the
project right now.

#### R4: Scraper failure is silent
If Profesia changes its HTML, `parseListPage` returns `[]`, the run is
logged as `completed` with `postings_found: 0`, and nothing alerts anyone.
A dead scraper looks identical to "no jobs matched today."

**Fix:** golden-fixture tests (catch regressions I introduce) + a canary
check (catch changes Profesia introduces) + treat "0 results for a query
that previously returned results" as an alertable event.

### 🟠 Fix during the next phase

#### R5: Vercel IP blocking is untested
See Part A. Test before building more on top of the scraper.

#### R6: No production error visibility
`console.error` writes to Vercel logs that a non-technical owner will never
read. When something breaks for a real user, nobody finds out.

**Fix:** a `logError()` helper that writes to an `error_log` table and, for
critical errors, emails the owner. Sentry's free tier is the fuller answer
later.

#### R7: Rate limiting is incomplete (SECURITY_GDPR S6)
M3 caps a single conversation at 20 messages, but nothing stops a user from
starting unlimited conversations. Nothing caps AI spend per user per day.
Additionally `sendOnboardingMessage` validates the length of the *new*
message but not of the client-supplied *history* — a crafted client could
send 20 oversized messages in one request.

**Fix:** a shared `rate_limit` mechanism (table keyed by user + action +
window) used by every endpoint that costs money, plus total-payload
validation on the chat action.

#### R8: Database migrations are applied by hand with no drift detection
Migrations are copy-pasted into the Supabase dashboard. Nothing records
which have been applied. If one is skipped, applied twice, or edited after
the fact, the live schema silently diverges from the repo — and every future
module is built against a schema assumption that may be false.

**Fix:** a `schema_migrations` tracking table plus a `verify-db` script that
compares live schema, RLS status, and policy list against what the repo
expects. Runnable on demand, and part of CI where possible.

#### R9: `users.last_active_at` is never updated
The column exists for the GDPR 3-year retention mechanism (G5) but nothing
writes to it, so the retention job planned for M13 would have no data to act
on and would eventually delete active users.

**Fix:** update on login (and on notification click, once M9 exists).

#### R10: No staging environment
Every merge to `main` goes straight to the live site. Vercel preview
deployments exist automatically per branch but currently point at the
production database, so schema changes cannot be safely rehearsed.

**Fix:** use preview URLs for owner testing before merge; add a second
(free-tier) Supabase project as staging once schema changes become riskier.

#### R11: No cost observability
No token usage is recorded anywhere. M8 will make many AI calls per user per
day; the owner needs to see cost per user before pricing anything.

**Fix:** log `input_tokens`/`output_tokens` and the model used for every AI
call into an `ai_usage` table, from the shared AI wrapper.

#### R17: There is no password reset — a locked-out user is locked out forever
No forgot-password flow, no reset page, no recovery route exists (`src/app/auth/`
contains only `callback` and `confirm`). The owner hit this on 22 July and had
to be logged in via an admin-generated magic link. Every real user who forgets
their password would be permanently unable to reach their account, CV and
matches — with no self-service path and no support process to fall back on.

**Fix (small, belongs in Phase 0):** a `/forgot-password` page calling
`supabase.auth.resetPasswordForEmail()`, a `/reset-password` page handling the
recovery token, and a "Zabudli ste heslo?" link on the login form. Requires the
Resend email sender (or Supabase's built-in mailer with its low rate limit) —
note that "Confirm email" is currently OFF, which does not affect recovery mail.
Optionally also offer magic-link login, which removes passwords as a failure
mode entirely.

### 🟡 Awareness, no action yet

- **R12: No database backup plan.** Supabase's free tier has limited
  point-in-time recovery. Add a periodic export before real users exist.
- **R13: `main` likely has no branch protection.** AGENTS.md forbids force
  pushes as a rule; GitHub can enforce it as a setting.
- **R14: No user-facing error boundary.** A React crash currently shows a
  generic page rather than a friendly Slovak message.
- **R15: Accessibility unaudited.** Beyond being right, the European
  Accessibility Act may apply to a commercial EU service — add it to the
  Phase 1 lawyer agenda rather than guessing.
- **R16: M8's AI evaluation needs a hard per-run cap.** ADR-004 requires
  reasoning for every match; at scale that is the dominant cost. Specify a
  maximum number of AI evaluations per user per run when building M8.

---

## PART C — The safety system

*This is the answer to "make it so AI coding cannot break the whole thing."
No single mechanism does this. Seven layers do, and they are ordered by
value per hour of work.*

### Why the current setup is not enough

The type checker proves the code is *internally consistent*. It cannot prove
the code is *correct*. Every serious bug this project can have — dedup
silently disabled, postings not expiring, RLS dropped, scraper returning
nothing, preferences read as `undefined` — passes a type check cleanly.

### Layer 1 — Automated tests (the actual safety net)

Install Vitest. Write tests for the logic that is *expensive to get wrong*,
not for everything:

| Test | What it prevents |
|---|---|
| `queryHash` stability + normalization | ADR-001 dedup silently breaking |
| `expires_at` = scraped_at + 48h | Silent violation of the legal retention rule |
| Profesia parsing against saved HTML fixtures | Scraper regressions from my edits |
| Slovak relative-date parsing (`pred 3 dňami`) | Wrong posting ages |
| Preferences contract round-trip (M3 write → M5 read) | R2's silent runtime break |
| Rate-limit logic | Cost blowouts |
| RLS isolation (the M1 two-user test, automated) | The worst-case privacy failure |

Rule going forward: **every module ships with tests for its core logic, and
`npm run check` runs them.** A module is not done until its tests pass.

### Layer 2 — Contracts between modules

Every data shape that crosses a module boundary — especially anything stored
as `jsonb` — gets one Zod schema in `src/lib/contracts/`, and is validated
at both write and read. Fixes R2 and makes future drift a loud, immediate
error instead of a silent `undefined`.

### Layer 3 — Database drift detection

A `npm run verify-db` script that asserts: every expected table exists, RLS
is enabled on all of them, the expected policies are present, and expected
columns exist. Run it after every migration and before every merge. Fixes
R8 and permanently protects the most dangerous single setting in the project
(RLS).

### Layer 4 — CI gates

Extend `.github/workflows/ci.yml` to run tests as well as the build. Enable
GitHub branch protection on `main`: no direct pushes, no force pushes, CI
must be green to merge. This converts AGENTS.md's rules from *promises* into
*enforcement* (R13).

### Layer 5 — Production visibility

`logError()` → `error_log` table + email to owner on critical failures
(R6), and `ai_usage` logging for cost (R11). Breakage becomes visible within
minutes instead of never.

### Layer 6 — Reversibility

Already partly in place (tags). Make it complete and documented:
- Every module keeps its `mN-verified` tag (existing practice — keep it).
- Add `ROLLBACK.md`: the exact commands to return the code to any tag, and
  what to do about database changes (which do not roll back with git).
- Every future migration gets a written "how to undo this" note.
- Feature flags (simple env vars or a `feature_flags` table) so a broken new
  feature can be switched off in seconds without a deploy or a revert.

### Layer 7 — Change discipline for AI sessions

Amendments to AGENTS.md (applied in this session):
- Touching a file outside the current module's folder requires saying so
  first — no silent cross-module edits.
- Any change to a file with an existing test must keep that test passing;
  weakening or deleting a test to make a change pass is forbidden.
- "Definition of done" gains two items: tests pass, and the feature was
  verified on the deployed preview URL, not only locally.

### What this costs

Roughly one to two working sessions to build Layers 1–5 for the existing
code. Every module after that carries a small ongoing cost (tests written
alongside the feature). This is the cheapest insurance available, and it
gets more expensive to retrofit with every module added.

---

## PART D — Re-sequenced plan

REVIEW_NOTES' dependency map remains correct. What changes is **priority
order within what the dependencies allow**, based on one principle: *test
the assumptions that could invalidate the project before building more on
top of them.*

### Phase 0 — Harden (next, before any feature)
1. R1 production secrets + verify deployed app actually works
2. Layer 1 tests for existing M1/M3/M5 logic
3. Layer 2 contracts (fixes R2)
4. Layer 3 `verify-db` + Layer 4 CI gates and branch protection
5. Layer 5 error + AI-cost logging; R7 rate limiting; R9 `last_active_at`

**Exit criterion:** a deliberate breaking change to a core function is
caught automatically by CI, not by a human noticing later.

### Phase 1 — De-risk the two existential unknowns (~1 session)
6. **Vercel scraping test (R5).** Deploy a protected test route; confirm
   Profesia responds to Vercel's IPs. If blocked, stop and redesign before
   building anything else on the scraper.
7. **Matching-quality spike.** Using the 20 real postings and the real
   profile already in the database, run the intended M4+M8 pipeline manually
   (embeddings → similarity → Haiku evaluation with reasoning) and *read the
   output*. This is a throwaway script, not a module. It answers the only
   question that matters: **is the match gradient genuinely useful, and is
   the Slovak reasoning convincing?**

**Exit criterion:** the owner reads ten AI-generated match explanations and
judges whether a real user would find them valuable. If not, the product
concept — not just the code — needs rework, and it is far better to learn
that here than at M13.

### Phase 2 — Core value chain to a visible product
8. **M4** — profile embedding (`voyage-4`, 1024 dims; ADR-007)
9. **M8** — matching pipeline (with R16's per-run cap and R11 cost logging)
10. **M10** — dashboard + tracker + GDPR buttons (G6) — **the product becomes
    visible and testable by real humans here**
11. **M11** — instant first search (the aha moment)

*Note the reordering: M10 moved ahead of M6/M7/M9. Rationale: one portal is
enough to prove the value chain end-to-end; a second portal adds volume, not
learning. Getting to a screen a beta user can react to is worth more than
more postings feeding an unvalidated matcher.*

### Phase 3 — Reach and retention
12. **M6 / M7** — Worki + Kariéra adapters (also mitigates the single-portal
    risk)
13. **M9** — notifications (Telegram + email, urgency routing)
14. **M12** — cover letters + CV tailoring

### Phase 4 — Launch readiness
15. **M13** — integration + daily cron (dispatcher pattern per Finding 4),
    retention job (G5), failure alerts to owner
16. **UX pass + landing page** (Part E) — with real screenshots and real
    beta feedback
17. **Legal consult** (ADR-001, G1/G3/G7/G9, plus R15 accessibility)
18. **M14** — Stripe

---

## PART E — UI, UX and positioning

### Why the UI cannot be "done" as one task

A match list cannot be designed before matches exist; a landing page cannot
be written before the product has a proven promise. What *can* be done now
is the part that unblocks everything else: **positioning**. The rest lands
at specific modules — M10 for the product UI, Phase 4 for the landing page.

### Positioning — the most important finding in this review

Every AI job-search competitor found in current market research —
Teal, JobCopilot, Sorce, Careerflow — is an English-language, US-centric
tool. **None of them index Profesia, Worki, or Kariéra.sk.** For a Slovak
job seeker, the global tools are effectively useless: they cannot see the
market the user is actually applying into.

That is a stronger wedge than the plan currently claims, and it should be
the centre of the positioning, alongside two supporting pillars:

1. **Local** — "sees the jobs that are actually on the Slovak market"
2. **Private** — CVs stored in the EU, nothing public, employer never finds
   out. This is not a compliance checkbox; it is a *feature* for the highest
   value segment (below).
3. **Explained** — every match says *why*, so the user does not have to
   re-read the posting to decide.

### The ideal customer is probably not who the plan assumes

The instinctive target for a job tool is the unemployed active seeker. They
are also the most price-sensitive and the shortest-lived customer (they
leave when they find work).

The better primary segment is the **employed passive candidate**: someone
with a job who would move for the right offer but has no time to scroll
portals daily and *cannot be seen looking*. They have income, they value
discretion highly, and their subscription survives longer because there is
no urgency to cancel. The plan's existing "Passive" tier already senses
this — it should be promoted from a downgrade path to a primary segment.

### Pricing — sanity check against the market

Current market rates: Teal free + ~$9/week; JobCopilot from ~$8.90/week or
~$29.90/month; Sorce $15/week or $40/month; Careerflow ~$23.99/month.

These are US prices. Slovak net wages make a €30/month tool a hard sell for
a consumer product; the realistic corridor for a Slovak consumer
subscription is roughly **€5–15/month**, with the paid tier needing to feel
obviously cheaper than "one wasted week of not finding the right job."
Treat this as a hypothesis to validate with beta users, not a decision.

### Onboarding — where the money is won or lost

Current benchmarks: best-in-class SaaS delivers first value in **2–5
minutes**; top-quartile activation is **40%+** while typical products sit at
15–20%; users who reach first value within 14 days retain at **80%+ at month
12**, versus 35–50% for those who do not; interactive onboarding correlates
with ~50% higher activation; and short 3–5 step checklists complete far more
often than 8+ step ones.

Applied to this product:

- **The aha moment is seeing real matches with real reasoning — and it must
  happen inside the first session.** This makes M11 (instant first search)
  strategically more important than its position in the original plan
  suggests; it is not a nicety, it is the activation mechanism.
- **Do not gate value behind a complete profile.** Start searching as soon
  as the chat yields a job title; refine as more is learned. Show partial
  results while the agent is still working.
- **Keep onboarding to three visible steps** (upload CV → short chat →
  first matches). The current design is already close to this — protect it
  from growing.
- **The "agent is scanning" state is doing real work**: it converts waiting
  into visible progress. It is already in UI_UX.md and the schema supports
  it (`scrape_runs`); build it properly in M10/M11 rather than as a static
  label.

### Product UI — build at M10, against real data

Priorities for the match list, in order:
1. **Scannable** — a user should triage ten matches in thirty seconds.
2. **Reasoning visible without a click** — the explanation *is* the product
   (ADR-004); hiding it behind an expander wastes the differentiator.
3. **One primary action per match** (UI_UX.md already mandates one primary
   action per screen).
4. **The match ring carries the tier** — it is the signature element and it
   already exists in the design system.

### Landing page — Phase 4, drafted earlier

Write the positioning and headline copy during Phase 0–1 (it costs nothing
and forces clarity about what the product must deliver), but build the page
in Phase 4, when it can show real screenshots and quote real beta users.

Structure that converts for this category: a headline naming the segment and
the outcome; a product visual above the fold; the three pillars (local,
private, explained); objection handling (privacy, price, "will it find
anything for *my* field?"); one CTA repeated, never competing CTAs.

---

## PART F — Guided candidate profiling (new module M3.5)

*Raised by the owner 24 July after using the M3 chat. The instinct is correct
and strategically important: the quality of the extracted candidate picture is
the ceiling on match quality. A thin profile → a thin embedding → mediocre
matches, no matter how good M8 is. This is worth doing properly.*

### The two problems the owner observed

1. **"Upraviť" resets the chat with no history.** This is by design, not a
   bug: the transcript is never stored (GDPR G4 / Finding 13 — summary only),
   so there is nothing to replay. But the *experience* is wrong — "edit" feels
   like "start over."
2. **The current M3 extracts too little.** It captures keyword + location +
   salary + employment type. That is enough to *search*, but far too thin to
   *match well* or to feel like the product understood the person.

### Why this is its own module, and when it is built

M3.5 is a deliberate upgrade of onboarding from "quick intake" to "guided
profile builder." **It must be built AFTER the matching-quality spike (Phase
1), not before** — the spike reveals which candidate signals actually move
match quality, and those signals define what the profile must extract. Building
an elaborate questionnaire before knowing what the matcher needs risks
extracting the wrong things beautifully. Deliver M3.5 **together with the M10
product-UI pass** (same design sprint, same "build against real data"
principle), positioned in Phase 2.

### How it should work (industry-standard patterns)

Grounded in current onboarding/profiling practice (progressive profiling,
structured-plus-conversational hybrid, must-haves vs deal-breakers, show-the-
picture-back-and-confirm):

1. **Progressive, not a wall of questions.** Ask one or two things at a time;
   never render a long form. Start searching as soon as a role is known, keep
   enriching. (Each extra upfront field measurably drops completion.)
2. **Hybrid: conversation + structured chips.** The chat handles nuance and
   follow-ups; a structured, directly-editable panel (role, seniority,
   locations, remote/hybrid/on-site, salary floor, employment type, industries,
   company size, must-haves, deal-breakers, work-style/values) holds the
   result. The user can edit either the chips directly OR re-open the chat to
   refine — "Upraviť" opens the structured panel, not a blank chat.
3. **Capture the dimensions that actually differentiate a good match**, which
   the current M3 omits: **deal-breakers** (commute limit, shift work, on-site
   requirement, specific companies to avoid — already have `blacklisted_companies`),
   **must-haves** vs nice-to-haves, seniority level, industries/domains of
   interest, motivation for moving (esp. the passive-candidate segment — see
   Part E), and work-style/values. Deal-breakers are especially high-signal and
   cheap to act on (hard filter before AI spend).
4. **Show the picture back and let them confirm/correct.** The M3 summary card
   is the seed of this — expand it into the editable structured panel above.
   Confirmation both improves data and creates a moment of "it gets me."
5. **Seed re-entry from the existing profile.** When the user returns to refine,
   the agent opens with what it already knows ("Vidím, že hľadáte financie v
   Bratislave — čo chcete upraviť?"), never a blank slate. This fixes problem #1
   without storing the transcript.
6. **GDPR posture unchanged:** still summary + structured preferences only, no
   transcript. The structured panel IS the durable, user-visible, editable
   record — which is also better for the GDPR "rectification" right (G6).

### Schema impact (decide at M3.5, reserve nothing prematurely)

`profiles.preferences_json` already holds arbitrary structure — M3.5 enriches
the shape (validated by the Zod contract from Part C, layer 2). `blacklisted_companies`
already exists for one class of deal-breaker. Likely no new tables; confirm when
building, against what the spike showed the matcher needs.

### Test

A real user completes the guided flow and, reading the resulting structured
profile back, agrees it captures them well — including at least one nuance
(a deal-breaker or a must-have) the old keyword-only intake would have missed.

---

## Immediate next actions

1. Owner: add the two missing environment variables in Vercel (R1).
2. Agent: build Phase 0, Layers 1–5, as one focused work package.
3. Agent: Phase 1 — Vercel scraping test, then the matching-quality spike.
4. Owner + agent: read the spike's output together and decide whether the
   core concept holds before investing in Phase 2.

*Sources for the market and benchmark figures in Part E are recorded in the
session transcript; re-verify before using any number in public marketing
copy.*
