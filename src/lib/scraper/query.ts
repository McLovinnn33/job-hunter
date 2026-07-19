import { createHash } from "crypto";
import type { SearchPreferences } from "./types";

/**
 * Normalizácia a hash vyhľadávacieho dopytu — implementácia dedup
 * mechanizmu z ADR-001 (REVIEW_NOTES Finding 2): ekvivalentné dopyty
 * rôznych používateľov zdieľajú jeden scraping beh a jednu cache.
 */

// Ako dlho platí cache dopytu (ADR-001 povoľuje 24–48 h; volíme spodnú hranicu)
export const QUERY_CACHE_TTL_HOURS = 24;

/** Zjednotí text: malé písmená, bez diakritiky, jedna medzera. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePreferences(
  prefs: SearchPreferences
): SearchPreferences {
  return {
    keyword: normalizeText(prefs.keyword),
    location: prefs.location ? normalizeText(prefs.location) : undefined,
  };
}

/** Stabilný hash normalizovaného dopytu — kľúč v tabuľke search_queries. */
export function queryHash(prefs: SearchPreferences): string {
  const normalized = normalizePreferences(prefs);
  const canonical = JSON.stringify({
    keyword: normalized.keyword,
    location: normalized.location ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
