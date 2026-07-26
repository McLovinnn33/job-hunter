# ROLLBACK.md — How to undo things safely

*Plain-language recovery guide (ROADMAP.md Part C, layer 6). If a change
breaks something, you are never stuck — here is how to go back. Written for
a non-technical owner: copy the commands exactly.*

---

## The most important idea

Every verified module has a permanent **tag** — a labelled restore point.
Going back to one is safe and reversible. Tags so far:

```
m0-verified   m1-verified   m2-verified   m3-verified   m5-verified
```

See all of them any time with: `git tag`

---

## Scenario 1 — "The last change broke something, undo it"

If work is committed but not yet merged to `main`, or you just want to throw
away uncommitted edits on the current branch:

```
git stash          # sets your current changes aside (recoverable)
```
To bring them back later: `git stash pop`. To discard them for good after
stashing: `git stash drop`.

---

## Scenario 2 — "Go back to the last known-good module"

To put the **code** back exactly as it was at a verified restore point
(example: the M3 restore point):

```
git checkout main
git reset --hard m3-verified
```

⚠️ This throws away commits on `main` after that tag. Only do it if you truly
want them gone. If unsure, ask first — there is a safer version:

```
git checkout -b recovery m3-verified
```
This creates a *new* branch at the restore point and leaves `main`
untouched, so nothing is lost while you look around.

---

## Scenario 3 — "The live website is broken, the code is fine"

Vercel keeps every past deployment. You do not need git for this:

1. Vercel → your project → **Deployments**.
2. Find the last deployment that worked (green, older).
3. Click its **⋯** menu → **Promote to Production** (or **Redeploy**).

The live site returns to that version in about a minute. Code and database
are untouched.

---

## Scenario 4 — "A database change broke something"

**Database changes do NOT undo with git.** Git only controls code. Every
migration file therefore carries its own written "how to undo this" note at
the top — open the migration in `supabase/migrations/` and run the `drop ...`
command shown there, in the Supabase SQL Editor.

Example: `0004_verify_db_rpc.sql` ends with its undo line
(`drop function if exists public.verify_db_introspect();`).

⚠️ Dropping a table deletes its data. For anything beyond dropping a helper
function, stop and ask before running an undo — data loss is the one thing
that is genuinely hard to reverse. This is why a database backup/export
before real users exist is on the roadmap (R12).

---

## Scenario 5 — "Is the live database still what the code expects?"

Run the drift check any time:

```
npm run verify-db
```

Green = the live database matches the code's expectations (all tables
present; with the `0004` helper installed, also that privacy/RLS is on
everywhere). Red = it lists exactly what is out of sync.

---

## Golden rules (also enforced in AGENTS.md)

- `main` is always the working app. Never build directly on it.
- Never `git push --force`, never rewrite history, never delete a test to
  make something pass.
- After the owner verifies a module, it gets tagged. Those tags are your
  safety net — they are never deleted.
- When in doubt, the non-destructive option (Scenario 2's `checkout -b`)
  loses nothing. Prefer it.
