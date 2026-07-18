# OWNER_GUIDE.md — The non-coder's control panel

*Written for the project owner. No coding knowledge assumed. This file explains
how the development process protects you, and what to do when something breaks.*

---

## The safety system, in one picture

```
 AI writes code  →  on a SIDE BRANCH (never the live app)
       ↓
 npm run check   →  machine verifies it compiles (AI cannot skip this)
       ↓
 YOU test it     →  using the plain-language steps the AI must give you
       ↓
 merge to main   →  only now it becomes "the app"
       ↓
 git tag         →  permanent restore point you can always return to
       ↓
 GitHub CI       →  robot re-checks every push, red ✗ = something's wrong
```

Every layer catches a different AI failure mode. You never have to read code —
you only ever test the running app and look for green checkmarks.

## The rules the AI must follow (enforced via AGENTS.md)

1. **One module = one branch.** New work happens on a copy; the real app
   (`main`) stays untouched until you approve.
2. **Definition of done** — the AI may not declare a task finished unless
   `npm run check` passes, no secrets are in code, docs are updated, and
   you got test instructions.
3. **Restore points.** After YOU confirm a module works, the AI tags that
   exact state (`m0-verified`, `m1-verified`, ...). Broken code can always
   be rolled back to the last tag.
4. **Docs are the spec.** DATABASE_SCHEMA.md, DECISIONS.md, UI_UX.md,
   SECURITY_GDPR.md define the product. If code and docs disagree, the docs
   win — and any AI session must read them before working. This is what
   protects your features from being "forgotten" between sessions.

## Commands you'll actually use

| What you want | What to type (in the terminal, in C:\job-hunter) |
|---|---|
| Start the app locally | `npm run dev` then open http://localhost:3000 |
| Stop the app | press `Ctrl+C` in the terminal |
| Verify the code is healthy | `npm run check` (green/exit without errors = OK) |
| See what changed | `git status` (files) and `git log --oneline -10` (history) |

You can also just ask Claude Code in plain language: "run the checks",
"show me what changed", "is anything broken?"

## When something breaks — your emergency card

**Stay calm: with branches + tags, almost nothing is permanently lost.**

1. **The app looks broken after a change** → tell Claude Code:
   *"The app is broken. Do not write new code yet. First tell me what
   changed since the last verified tag, then propose the smallest fix."*
2. **You want to undo everything back to the last working state** → say:
   *"Roll back to the last verified tag."* (Manually that's
   `git checkout <tag-name>` — but let the AI do git operations.)
3. **A key leaked (or you suspect it)** → Supabase/Vercel dashboard →
   regenerate the key → update `.env.local` and Vercel env vars. Then follow
   SECURITY_GDPR.md G8 (72h breach plan) if user data was exposed.
4. **The AI seems confused or is making things worse** → stop the session.
   Start a fresh one; make sure it reads the docs
   first. A fresh session with clean context beats a confused one.

## Red flags — stop and push back if the AI ever...

- ...wants to work directly on `main` or skip the branch
- ...says "done" without giving you test steps
- ...proposes changing something recorded in DECISIONS.md without discussing why
- ...pastes an API key into a code file ("just temporarily")
- ...deletes or weakens a check/test "to make it pass"
- ...touches modules unrelated to the current task

Any of these: say *"Stop. This violates AGENTS.md — explain and fix."*

## Verification checklist per module (your part)

After each module the AI must give you a specific test list. In general you:
1. Run `npm run dev` and click through the new feature like a real user.
2. Check the specific things the module card in REVIEW_NOTES.md Part B lists
   under "Test".
3. For data modules: look into the Supabase dashboard (the AI tells you where).
4. Only after this say "verified" — the AI then merges and tags.

## Costs & accounts overview

- **Supabase** (database, EU-Frankfurt) — free tier is fine for beta
- **Vercel** (hosting, functions in fra1) — free Hobby tier is fine for beta
- **GitHub** (code backup + CI robot) — free for private repos
- 2FA ON for all three + your email (SECURITY_GDPR.md S8)
