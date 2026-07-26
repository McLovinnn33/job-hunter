import { describe, it, expect } from "vitest";
import { computeExpiresAt, POSTING_TTL_HOURS } from "./expiry";

/**
 * Právne citlivé pravidlo (ADR-001 amendment): ponuky musia exspirovať
 * 48 h po stiahnutí. Keby sa tento výpočet niekedy pokazil, ponuky by sa
 * hromadili ako trvalý archív — presne to, čo ADR-001 zakazuje. Preto má
 * vlastný test.
 */
describe("computeExpiresAt — ADR-001 48h retencia", () => {
  it("TTL je presne 48 hodín", () => {
    expect(POSTING_TTL_HOURS).toBe(48);
  });

  it("expirácia = scraped_at + 48 h", () => {
    const scrapedAt = new Date("2026-07-24T10:00:00.000Z");
    const expires = computeExpiresAt(scrapedAt);
    expect(expires).toBe("2026-07-26T10:00:00.000Z");
  });

  it("rozdiel je vždy presne 48*60*60*1000 ms", () => {
    const scrapedAt = new Date("2026-01-01T23:30:00.000Z");
    const diff =
      new Date(computeExpiresAt(scrapedAt)).getTime() - scrapedAt.getTime();
    expect(diff).toBe(48 * 60 * 60 * 1000);
  });
});
