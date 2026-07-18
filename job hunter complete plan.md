# Job Hunter — Complete Strategic & Development Plan (Agentic AI SaaS)

*This is the main overview document. Details live in: AGENTS.md (coding rules), DATABASE_SCHEMA.md (data), DECISIONS.md (why we decided what we decided), UI_UX.md (design system). All files belong in the project root in VS Code. Note: the PRODUCT itself is Slovak-language facing (UI text, notifications, marketing) — this documentation and all code/comments are in English.*

---

## 1. Vision in one sentence

An agentic AI system that autonomously, daily monitors multiple job portals according to a user's personal profile (CV + AI chat), semantically (not just keyword-based) evaluates relevance, and proactively delivers processed results through the user's preferred channel — including a cover letter draft, CV tailoring suggestions, and a full application tracker.

---

## 2. Tech stack

| Layer | Tool |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Hosting | Vercel + Vercel Cron Jobs (daily run) |
| Database | Supabase (Postgres + pgvector, Auth, Storage) |
| Matching | Embedding model (Voyage AI) + Claude Haiku/Sonnet |
| Payments | Stripe |
| Notifications | Telegram, WhatsApp, email (Resend), SMS (priority matches), push (later) |
| Development | VS Code + Claude Code — Opus (modules) + Fable (integration) |

No Bubble.io, no OpenClaw/Hetzner — a single codebase project (see DECISIONS.md ADR-002, ADR-003).

---

## 3. Architecture — daily cycle

```
1. A Vercel Cron Job runs (scheduled, daily)
2. For each user: their profile embedding (CV + chat) is 
   compared against embeddings of new postings (pgvector, cheap)
3. The broader candidate set goes into AI evaluation (Haiku):
   - strong match / worth considering / stretch
   - always with an explanation of WHY, even for lower matches
4. Fake-score for a posting is computed ONCE per posting (shared)
5. Results are delivered through the user's preferred channel, 
   with smart routing by urgency (deadline + strong match = 
   immediate, otherwise digest)
6. User interacts in the dashboard (tracker), feedback is 
   stored and improves future matching
```

Scraping = always per-user targeted search, deduplicated and short-term cached across similar user queries — never a permanent central copy of the portal's database (see DECISIONS.md ADR-001).

---

## 4. Business model

```
Free:     limited number of alerts/week
Basic:    ~€9/mo — daily alerts, fake job filter
Pro:      ~€19/mo — + cover letter, CV tailoring, salary 
          insights, interview prep
Passive:  ~€3/mo — for users who already found a job, 
          keeps monitoring passively (also gigs/better 
          opportunities)

Long-term (Phase 6+): two-sided marketplace — companies 
pay for featured listings / direct access to users
```

---

## 5. Customer journey

```
1. Discovery → landing page, clear value at first glance
2. Onboarding → AI chat CONVERSATION + CV upload (both from 
   day one), preferences editable anytime
3. Daily autonomous run (see architecture above)
4. Delivery via preferred channel, smartly routed by urgency
5. Interaction in dashboard/tracker → feedback → matching learns
6. Free → paid conversion once the user sees value
7. After landing a job → downgrade to Passive, not churn
8. Phase 6+: marketplace side for companies
```

---

## 6. Complete feature list

### MVP:
- AI chat intake + CV upload (both)
- Daily per-user monitoring: Profesia, Worki, Kariéra.sk
- Embedding + AI semantic matching (match gradient, not yes/no)
- Delivery: Telegram + email + dashboard, adjustable frequency
- Application tracker (Kanban: new match → applied → 
  interview → offer/rejected), with deadlines and notes
- Manual fake/relevant flagging (data for future automation)
- Company blacklist
- Rough salary estimate (lightweight MVP version, labeled as an estimate)

### Phase 2b:
- Cover letter generation
- CV tailoring suggestions (multiple CV versions, system 
  suggests which to send)
- Extended company info
- Follow-up reminders
- User analytics (how many applications, how many interviews)
- WhatsApp + SMS channels (priority matches)

### Later (scaling):
- Automatic AI fake-job detection (from collected data)
- Full salary benchmarking
- Custom company career page URLs from the user
- Interview prep assistant
- Marketplace for companies

---

## 7. Phase plan

```
PHASE 0: Skipped by decision — building directly, learning 
         by doing instead of upfront validation
PHASE 1: Infrastructure + legal consult          Week 1-2
PHASE 2: Core modules (Opus, one at a time)       Week 2-8
PHASE 2b: Cover letter, tracker, channels         Week 7-8
PHASE 3: Integration (Fable)                      Week 8-9
PHASE 4: Private beta (20-50 users)               Week 9-11
PHASE 5: Public launch + payments                 Week 11-13
PHASE 6: Scaling + marketplace                    Month 4+
```

---

## 8. Development plan — modules

| # | Module | Model | Test |
|---|---|---|---|
| 0 | Next.js project setup (skeleton, auth, navigation) | Opus | App runs locally, login works |
| 1 | Per-user Profesia search (deduplicated + short cache) | Opus | 3 different preference sets |
| 2 | Per-user Worki search | Opus | Same |
| 3 | Per-user Kariéra.sk search | Opus | Same |
| 4 | AI chat intake | Opus (code) + Sonnet 5 (in-app) | 5x different answers |
| 5 | CV upload + parsing | Opus | 5 real CVs |
| 6 | Database (Supabase schema per DATABASE_SCHEMA.md) | Opus | Save/retrieve data |
| 7 | Embedding + matching (match gradient) | Opus (code) + Haiku (in-app) | 10 test postings, verify gradient not just yes/no |
| 8 | Notifications (Telegram, email, urgency-based routing) | Opus | Real message arrives |
| 9 | Dashboard + application tracker | Opus | Data visible, Kanban works |
| 10 | Cover letter + CV suggestions | Opus (code) + Sonnet 5 (in-app) | 3-5 examples |
| 11 | **Full integration + daily cron run** | **Fable** | End-to-end test of the whole flow |

**Prompt template for every module:** Context (reference AGENTS.md, DATABASE_SCHEMA.md) + Goal + Input/Output + Rules + "Explain step by step how to run and test this, since I can't code."

---

## 9. Legal checklist

```
☐ Consultation on the per-user scraping approach (before Phase 2)
☐ Privacy Policy (GDPR — CV, preferences, max 3-year retention)
☐ Terms of Service
☐ Cookie consent
☐ Stripe SK/EU compliance
☐ Second consultation before scaling past 50-100 users
```

---

## 10. Budget (monthly, during development)

| Item | Cost/mo |
|---|---|
| Vercel | €0 (hobby tier to start) |
| Supabase | €0 (free tier to start) |
| Domain | ~€1 |
| Embedding API (Voyage) | €5-15 |
| Claude usage (development: Opus/Fable) | Included in Max plan / usage credits |
| Claude API (app runtime) | €5-20 |
| Lawyer (one-time) | €100-200 |
| **Total during development** | **~€100-200/mo** |

---

## 11. Biggest risks

| Risk | Mitigation |
|---|---|
| Portal changes structure, scraper breaks | Daily monitoring, flexible code |
| Low free→paid conversion (realistically 2-5%) | No formal validation phase — monitor real signals closely during beta |
| Legal risk from scraping | Per-user + deduplicated/short-cache approach (ADR-001), legal consultation |
| Integration doesn't work on first try | Reserve 1-2 weeks buffer in Phase 3 |
| Keyword matching filters out relevant postings | Embedding + AI gradient (ADR-004) |

---

## 12. First steps (no formal validation phase — building directly)

```
Step 1: Vercel + Supabase accounts, VS Code + Claude Code setup
Step 2: Load AGENTS.md/DATABASE_SCHEMA.md/DECISIONS.md/UI_UX.md 
        into the project
Step 3: Fable review session across all docs → REVIEW_NOTES.md
Step 4: Module 0 (project setup)
Step 5: Schedule legal consultation (can run in parallel)
```

---

*Living document — update on every major decision, and log the reasoning in DECISIONS.md.*
