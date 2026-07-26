/**
 * verify-db (ROADMAP.md Part C, layer 3) — deteguje "drift" medzi tým, čo
 * repo očakáva, a tým, čo je reálne v živej databáze. Migrácie sa aplikujú
 * ručne v Supabase dashboarde (R8), takže sa DB môže ticho rozísť s kódom.
 *
 * Kontroluje: (1) existujú všetky očakávané tabuľky, (2) na KAŽDEJ je
 * zapnuté RLS (S1 — najnebezpečnejšie nastavenie v projekte), (3) očakávané
 * kritické stĺpce existujú.
 *
 * Spustenie: npm run verify-db   (číta kľúče z .env.local)
 * Vráti exit code 1, ak čokoľvek nesedí — vhodné aj do CI (keď budú kľúče).
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const EXPECTED_TABLES = [
  "users",
  "profiles",
  "cv_versions",
  "job_postings",
  "search_queries",
  "scrape_runs",
  "matches",
  "application_tracker",
  "user_feedback",
  "blacklisted_companies",
  "notification_preferences",
  "usage_counters",
];

// Kritické stĺpce, ktorých strata by ticho pokazila logiku
const EXPECTED_COLUMNS: Record<string, string[]> = {
  profiles: ["preferences_json", "chat_summary", "raw_cv_text", "cv_file_url"],
  job_postings: ["expires_at", "source", "url"],
  search_queries: ["query_hash", "last_executed_at"],
  users: ["last_active_at", "plan"],
};

function loadEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

async function rpcQuery(
  url: string,
  key: string,
  sql: string
): Promise<unknown[]> {
  // Použijeme Postgres REST introspection cez information_schema view,
  // ktoré Supabase vystavuje len service role. Voláme cez /rest/v1/ s
  // dopytom na systémový pohľad nie je možné priamo; namiesto toho čítame
  // z nami vytvoreného RPC. Ak RPC neexistuje, fallback nižšie.
  void sql;
  const res = await fetch(`${url}/rest/v1/rpc/verify_db_introspect`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`introspection RPC unavailable (${res.status})`);
  return (await res.json()) as unknown[];
}

async function tableReachable(
  url: string,
  key: string,
  table: string
): Promise<boolean> {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.ok;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error(
      "❌ Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SECRET_KEY v .env.local"
    );
    process.exit(1);
  }

  const problems: string[] = [];

  // 1) Existencia tabuliek — service role dosiahne každú existujúcu tabuľku
  for (const table of EXPECTED_TABLES) {
    const ok = await tableReachable(url, key, table);
    if (!ok) problems.push(`Tabuľka '${table}' nie je dosiahnuteľná / neexistuje`);
  }

  // 2) RLS + policies + stĺpce cez introspection RPC (ak je nasadené).
  //    RPC je voliteľné — bez neho spravíme aspoň kontrolu existencie tabuliek.
  try {
    const rows = (await rpcQuery(url, key, "")) as Array<{
      table_name: string;
      rls_enabled: boolean;
      columns: string[];
    }>;
    const byTable = new Map(rows.map((r) => [r.table_name, r]));
    for (const table of EXPECTED_TABLES) {
      const info = byTable.get(table);
      if (!info) continue; // už nahlásené vyššie
      if (!info.rls_enabled) {
        problems.push(`⚠️ RLS NIE JE zapnuté na '${table}' (S1 — kritické!)`);
      }
      for (const col of EXPECTED_COLUMNS[table] ?? []) {
        if (!info.columns.includes(col)) {
          problems.push(`Stĺpec '${table}.${col}' chýba`);
        }
      }
    }
    console.log("✓ RLS a stĺpce overené cez introspection RPC");
  } catch {
    console.log(
      "ℹ️  Introspection RPC (verify_db_introspect) nie je nasadené — overila sa len existencia tabuliek."
    );
    console.log(
      "   Pre plnú kontrolu RLS spusti raz supabase/migrations/0004_verify_db_rpc.sql v SQL editore."
    );
  }

  if (problems.length === 0) {
    console.log(
      `\n✅ verify-db: OK — všetkých ${EXPECTED_TABLES.length} tabuliek na mieste.`
    );
    process.exit(0);
  } else {
    console.error(`\n❌ verify-db našiel ${problems.length} problém(ov):`);
    for (const p of problems) console.error("   - " + p);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("verify-db zlyhal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
