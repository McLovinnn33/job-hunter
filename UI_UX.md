# UI_UX.md — Visual identity and UX principles

*Fifth reference document. Claude Code/Opus reads this for every module that touches the frontend.*

## Design tokens

```
Colors:
  --accent: #3B36E0      (Signal Indigo — primary, buttons, links, strong match)
  --accent-urgent: #F5A623 (warm amber — ONLY for deadlines/urgency, used sparingly)
  --ink: #14141A          (primary text, not pure black)
  --ink-muted: #6B6B76    (secondary text)
  --surface: #FFFFFF / #FAFAFA (light backgrounds, not dark-mode-first)

Typography:
  UI text: Geist (Vercel, via Google Fonts or self-hosted)
  Data/metadata (dates, salaries, timestamps): Geist Mono
  Never default to Inter — too generic, blends in with every other app

Layout:
  Corner radius: 16px on cards, 8px on buttons/inputs
  Shadows: soft, layered (not flat, not dramatic) — a subtle "floating" feel
  Sticky navigation: backdrop-blur effect (iOS feel)
  Whitespace: generous, the app should never feel cluttered

Animation (sparing, never decorative):
  State transitions: 150-200ms ease-out
  The match ring animates in once on first render (not looping)
  No unnecessary bounce/wobble effects — subtlety over "wow factor"

Signature element:
  "Match ring" — a circular match-strength indicator instead of a plain 
  percentage/badge
  Full ring (indigo) = strong match
  Partial (amber) = worth considering
  Thin outline = stretch
  Always paired with a text explanation of WHY, even for lower matches
```

## UX principles (from research + Apple/Firecrawl direction)

```
1. FAST "AHA MOMENT"
   The first relevant posting must appear as soon as possible after 
   onboarding — not "tomorrow morning's digest." If technically 
   feasible, trigger the first search IMMEDIATELY after the profile 
   is completed, not only at the next scheduled run.

2. TRANSPARENT AI REASONING
   Never just "this matches you" — always "this matches you BECAUSE X," 
   even for lower matches ("slightly off, but..."). This builds exactly 
   the trust that differentiates the product from a "spam bot."

3. THE AGENT IS VISIBLY "ALIVE"
   A status indicator like "agent scanning..." (see mockup) — gives the 
   feeling that something is actively working in the background, not 
   that the app is a static database.

4. KANBAN TRACKER, NOT JUST A FEED
   Applications have states (new match → applied → interview → offer), 
   the user needs to see this visually, not just scroll a list.

5. EMPTY STATES ARE AN INVITATION, NOT AN APOLOGY
   "No matches yet" → no, better: "Agent is scanning 3 portals, first 
   results within 24h" — active, not passive tone.

6. ONE PRIMARY ACTION PER SCREEN
   Never more than one highlighted (accent-colored) button at a time — 
   other actions are secondary/ghost style.
```

## Copy principles (app tone)

```
Sentence case everywhere, never Title Case or ALL CAPS
Active voice, verb first: "View position," not "Position can be viewed"
Errors: what happened + what to do, never raw technical error text directly
Empty states: an invitation to act, not an apology
"Your positions," not "My positions" (the app speaks TO the user, not FOR them)
```

## Note on growth/conversion elements in the UI

Point 1 (fast aha moment) is the ONLY "growth" element addressed at this stage — it's part of the product itself, not an added trick. Referral programs, precise free-tier limits, and similar mechanisms are addressed in Phase 5 (public launch) based on real beta data, see the main plan document.
