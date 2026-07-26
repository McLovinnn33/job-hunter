/**
 * Expirácia ponúk (ADR-001 amendment) — vyčlenené ako ČISTÁ funkcia, aby
 * sa dala testovať bez server-only závislostí. Toto je právne citlivé
 * pravidlo (48h retencia), preto má vlastný test.
 */

// Ponuky exspirujú 48 h po stiahnutí (ADR-001 amendment)
export const POSTING_TTL_HOURS = 48;

const MS_PER_HOUR = 60 * 60 * 1000;

/** Vráti ISO čas expirácie: scrapedAt + POSTING_TTL_HOURS. */
export function computeExpiresAt(scrapedAt: Date): string {
  return new Date(scrapedAt.getTime() + POSTING_TTL_HOURS * MS_PER_HOUR).toISOString();
}
