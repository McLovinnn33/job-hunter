# Job Hunter

Osobný AI agent, ktorý hľadá pracovné ponuky za vás.

## Stav projektu

- ✅ **M0** — skeleton aplikácie: Next.js + TypeScript + Tailwind + shadcn/ui,
  Supabase auth (registrácia / prihlásenie / odhlásenie), chránený dashboard,
  design tokeny z UI_UX.md, Geist písma cez next/font
- ⬜ M1 a ďalšie — pozri REVIEW_NOTES.md, Part B

## Ako spustiť lokálne

1. Skopírujte `.env.example` ako `.env.local` a doplňte kľúče zo Supabase
   dashboardu (Project Settings → API). Skutočné kľúče nikdy nepatria do Gitu.
2. `npm install`
3. `npm run dev`
4. Otvorte http://localhost:3000

## Dokumentácia projektu (čítať pred akoukoľvek zmenou)

- `AGENTS.md` — pravidlá pre AI agentov
- `DATABASE_SCHEMA.md` — schéma databázy
- `DECISIONS.md` — architektonické rozhodnutia (ADR)
- `UI_UX.md` — design tokeny a UX princípy
- `REVIEW_NOTES.md` — review + poradie modulov
- `SECURITY_GDPR.md` — bezpečnostné a GDPR pravidlá
