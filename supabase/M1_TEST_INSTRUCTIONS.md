# M1 — Ako nasadiť a otestovať databázu (návod pre majiteľa)

*Predpoklad: M0 je overené (registrácia/prihlásenie funguje) a Supabase
projekt existuje v EU regióne.*

## Krok 1 — Spustenie migrácie (2 minúty)

1. Supabase dashboard → v ľavom menu **SQL Editor** → **New query**.
2. Otvorte súbor `supabase/migrations/0001_initial_schema.sql` (Claude Code
   vám ho vie zobraziť, alebo Notepad), skopírujte CELÝ obsah a vložte ho
   do editora.
3. Kliknite **Run** (alebo Ctrl+Enter). Dole sa má zobraziť
   "Success. No rows returned".

## Krok 2 — Vizuálna kontrola (1 minúta)

1. Ľavé menu → **Database** → **Tables**.
2. Mali by ste vidieť 12 tabuliek: users, profiles, cv_versions,
   job_postings, search_queries, scrape_runs, matches, application_tracker,
   user_feedback, blacklisted_companies, notification_preferences,
   usage_counters.
3. **Každá jedna** musí mať zelený štítok **"RLS enabled"**. Ak niektorá
   nemá — STOP, povedzte to Claude Code (pravidlo S1).

## Krok 3 — Test, že RLS naozaj chráni dáta (5 minút)

Potrebujete DVOCH používateľov: zaregistrujte v aplikácii druhý testovací
účet (iný e-mail), ak ho ešte nemáte.

1. Ľavé menu → **Authentication** → **Users** → skopírujte **User UID**
   prvého používateľa (ikonka kopírovania pri riadku). Označme ho A.
   Skopírujte aj UID druhého (B).
2. SQL Editor → nová query → vložte toto, ale `VLOZTE-UID-A` nahraďte
   skopírovaným UID používateľa A:

```sql
begin;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'VLOZTE-UID-A', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- Čo vidí používateľ A v tabuľke users?
select id, email from public.users;

rollback;
```

3. **Očakávaný výsledok:** presne JEDEN riadok — účet A. Nikdy nie oba účty.
4. Zopakujte s UID používateľa B — má vidieť len seba.
5. Ešte jeden test — používateľ A skúša čítať cudzie profily:

```sql
begin;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'VLOZTE-UID-A', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select user_id from public.profiles;      -- očakávané: 1 riadok (vlastný)
select * from public.search_queries;      -- očakávané: 0 riadkov (service tabuľka)
select * from public.job_postings;        -- očakávané: 0 riadkov (žiadne matche zatiaľ)

rollback;
```

Ak všetko sedí → povedzte Claude Code **"M1 verified"** — vetva sa zlúči
do main a označí sa tag `m1-verified`.

## Najpravdepodobnejšie chyby

1. **"relation already exists"** — migrácia (alebo jej časť) už bola
   spustená. Nič sa nedeje: buď pokračujte (ostatné príkazy prebehli),
   alebo požiadajte Claude Code o "reset a znovu-spustenie M1 migrácie".
2. **"permission denied for table ..."** pri teste v Kroku 3 — to je RLS,
   ktorá robí svoju prácu, ak sa to stane pri tabuľke, kde sa očakáva
   0 riadkov. Ak sa to stane pri čítaní VLASTNÉHO riadku, nahláste to.
3. **Vidíte OBA účty v Kroku 3** — RLS nefunguje ako má. STOP, nič ďalej
   nestavajte a povedzte to Claude Code. (Toto je presne ten prípad, pre
   ktorý tento test existuje.)
