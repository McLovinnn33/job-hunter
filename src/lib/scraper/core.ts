import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { profesiaAdapter } from "./adapters/profesia";
import {
  normalizePreferences,
  queryHash,
  QUERY_CACHE_TTL_HOURS,
} from "./query";
import type {
  PortalAdapter,
  ScrapedPosting,
  SearchPreferences,
  SearchRunResult,
} from "./types";

/**
 * Jadro scrapingu (M5) — implementuje ADR-001 v znení amendmentu:
 * 1. normalizuj dopyt a over v search_queries, či ekvivalentný dopyt
 *    nebežal za posledných 24 h → ak áno, použije sa cache (žiadny scraping)
 * 2. inak spusti adaptéry portálov, ulož ponuky s expires_at (+48 h)
 * 3. všetko zaloguj do scrape_runs (viditeľné v UI aj pre debugging)
 * M6/M7 pridajú ďalšie adaptéry do ACTIVE_ADAPTERS — nič iné sa nemení.
 */

// Ponuky exspirujú 48 h po stiahnutí (ADR-001 amendment)
const POSTING_TTL_HOURS = 48;

const ACTIVE_ADAPTERS: PortalAdapter[] = [profesiaAdapter];

type PostingRow = {
  source: string;
  title: string;
  company: string | null;
  salary: string | null;
  location: string | null;
  url: string;
  posted_date: string | null;
  description_text: string | null;
  scraped_at: string;
  expires_at: string;
};

function toRow(posting: ScrapedPosting): PostingRow {
  const now = new Date();
  return {
    source: posting.source,
    title: posting.title,
    company: posting.company,
    salary: posting.salary,
    location: posting.location,
    url: posting.url,
    posted_date: posting.postedDate,
    description_text: posting.descriptionText,
    scraped_at: now.toISOString(),
    expires_at: new Date(
      now.getTime() + POSTING_TTL_HOURS * 60 * 60 * 1000
    ).toISOString(),
  };
}

/**
 * Spustí vyhľadávanie pre dané preferencie. `userId` je voliteľné
 * (null = servisný/testovací beh) a slúži len na priradenie záznamu
 * v scrape_runs konkrétnemu používateľovi.
 */
export async function runSearch(
  prefs: SearchPreferences,
  userId: string | null = null
): Promise<SearchRunResult> {
  const supabase = createServiceClient();
  const normalized = normalizePreferences(prefs);
  const hash = queryHash(normalized);

  // 1) Dedup/cache podľa ADR-001: bežal ekvivalentný dopyt nedávno?
  const cacheCutoff = new Date(
    Date.now() - QUERY_CACHE_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: cachedQuery, error: cacheError } = await supabase
    .from("search_queries")
    .select("id, last_executed_at, result_count")
    .eq("query_hash", hash)
    .gte("last_executed_at", cacheCutoff)
    .maybeSingle();

  if (cacheError) {
    console.error("Kontrola cache dopytu zlyhala:", cacheError.message);
    // Pokračujeme — radšej scrapneme nanovo, než aby beh spadol
  }

  if (cachedQuery) {
    return {
      fromCache: true,
      postingsFound: cachedQuery.result_count ?? 0,
      newPostings: 0,
      scrapeRunId: null,
    };
  }

  // 2) Nový beh — zalogujeme štart (Finding 8: agent je viditeľne živý)
  const { data: run, error: runError } = await supabase
    .from("scrape_runs")
    .insert({ user_id: userId, status: "running" })
    .select("id")
    .single();

  if (runError) {
    console.error("Zápis scrape_runs zlyhal:", runError.message);
  }
  const runId = run?.id ?? null;

  try {
    const allPostings: ScrapedPosting[] = [];
    for (const adapter of ACTIVE_ADAPTERS) {
      const postings = await adapter.search(normalized);
      allPostings.push(...postings);
    }

    // 3) Uloženie: upsert podľa (source, url) — existujúcim sa predĺži platnosť
    let newCount = 0;
    if (allPostings.length > 0) {
      const rows = allPostings.map(toRow);

      const { data: existing, error: existingError } = await supabase
        .from("job_postings")
        .select("url")
        .in(
          "url",
          rows.map((r) => r.url)
        );
      if (existingError) {
        console.error(
          "Kontrola existujúcich ponúk zlyhala:",
          existingError.message
        );
      }
      const existingUrls = new Set((existing ?? []).map((r) => r.url));
      newCount = rows.filter((r) => !existingUrls.has(r.url)).length;

      const { error: upsertError } = await supabase
        .from("job_postings")
        .upsert(rows, { onConflict: "source,url" });
      if (upsertError) {
        throw new Error(`Uloženie ponúk zlyhalo: ${upsertError.message}`);
      }
    }

    // 4) Záznam dopytu pre budúci dedup
    const { error: queryError } = await supabase.from("search_queries").upsert(
      {
        query_hash: hash,
        query_params_json: normalized,
        last_executed_at: new Date().toISOString(),
        result_count: allPostings.length,
      },
      { onConflict: "query_hash" }
    );
    if (queryError) {
      console.error("Zápis search_queries zlyhal:", queryError.message);
    }

    // 5) Uzavretie behu
    if (runId) {
      await supabase
        .from("scrape_runs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          postings_found: allPostings.length,
        })
        .eq("id", runId);
    }

    return {
      fromCache: false,
      postingsFound: allPostings.length,
      newPostings: newCount,
      scrapeRunId: runId,
    };
  } catch (e) {
    console.error("Scraping beh zlyhal:", e);
    if (runId) {
      await supabase
        .from("scrape_runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", runId);
    }
    throw e;
  }
}

/**
 * Vyhľadávanie pre konkrétneho používateľa — číta preferencie z profilu.
 * (Preferencie vzniknú v M3; do M3 vráti zrozumiteľnú chybu.)
 */
export async function runSearchForUser(
  userId: string
): Promise<SearchRunResult> {
  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("preferences_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Načítanie profilu zlyhalo: ${error.message}`);
  }

  const prefs = profile?.preferences_json as SearchPreferences | null;
  if (!prefs?.keyword) {
    throw new Error(
      "Používateľ zatiaľ nemá nastavené preferencie hľadania (vzniknú v module M3 — AI onboarding)."
    );
  }

  return runSearch(prefs, userId);
}

/**
 * Denný cleanup podľa ADR-001 amendmentu: zmaž exspirované ponuky,
 * ktoré nie sú referencované v matches ani application_tracker.
 * Implementované ako DB funkcia (migrácia 0003) — atomicky v databáze.
 */
export async function cleanupExpiredPostings(): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("cleanup_expired_postings");
  if (error) {
    throw new Error(`Cleanup exspirovaných ponúk zlyhal: ${error.message}`);
  }
  return typeof data === "number" ? data : 0;
}
