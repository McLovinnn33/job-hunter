-- =====================================================================
-- Job Hunter — verify-db introspection (ROADMAP.md Part C, layer 3)
-- Vytvorí funkciu, ktorú `npm run verify-db` volá, aby zistil pre každú
-- tabuľku: je zapnuté RLS a aké má stĺpce. Umožňuje detekciu "driftu"
-- medzi repom a živou databázou (R8).
-- Spustenie: Supabase dashboard → SQL Editor → vložiť → Run (stačí RAZ).
--
-- AKO TO VRÁTIŤ SPÄŤ (undo):
--   drop function if exists public.verify_db_introspect();
-- =====================================================================

create or replace function public.verify_db_introspect()
returns table (table_name text, rls_enabled boolean, columns text[])
language sql
security definer
set search_path = ''
as $$
  select
    c.relname::text as table_name,
    c.relrowsecurity as rls_enabled,
    array(
      select a.attname::text
      from pg_attribute a
      where a.attrelid = c.oid
        and a.attnum > 0
        and not a.attisdropped
      order by a.attnum
    ) as columns
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r';
$$;

-- Len service role (server) ju smie volať — nie anon/authenticated.
revoke execute on function public.verify_db_introspect() from public;
revoke execute on function public.verify_db_introspect() from anon;
revoke execute on function public.verify_db_introspect() from authenticated;
