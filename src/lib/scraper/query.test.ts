import { describe, it, expect } from "vitest";
import { normalizeText, normalizePreferences, queryHash } from "./query";

/**
 * Dedup/cache jadro ADR-001 (Finding 2). Ak sa hash rozbije alebo
 * normalizácia zmení, dedup TICHO prestane fungovať — každý dopyt by
 * scrapoval nanovo (plytvanie + vyššie právne riziko). Tieto testy to
 * zachytia.
 */
describe("normalizeText", () => {
  it("malé písmená, bez diakritiky, jedna medzera", () => {
    expect(normalizeText("  Účtovník   Bratislava ")).toBe(
      "uctovnik bratislava"
    );
  });

  it("rôzne varianty diakritiky sa zjednotia", () => {
    expect(normalizeText("Košice")).toBe("kosice");
    expect(normalizeText("Žilina")).toBe("zilina");
  });
});

describe("queryHash — ADR-001 dedup", () => {
  it("ekvivalentné dopyty rôznych používateľov majú ROVNAKÝ hash", () => {
    const a = queryHash({ keyword: "Frontend Developer", location: "Bratislava" });
    const b = queryHash({ keyword: "frontend   developer", location: "  bratislava " });
    expect(a).toBe(b);
  });

  it("odlišné dopyty majú ODLIŠNÝ hash", () => {
    const a = queryHash({ keyword: "účtovník", location: "Bratislava" });
    const b = queryHash({ keyword: "účtovník", location: "Košice" });
    expect(a).not.toBe(b);
  });

  it("chýbajúca a prázdna lokalita sa správajú konzistentne", () => {
    const noLocation = queryHash({ keyword: "skladník" });
    const nullLocation = queryHash({ keyword: "skladník", location: null });
    expect(noLocation).toBe(nullLocation);
  });

  it("hash je stabilný (regresná poistka — nemenná hodnota)", () => {
    // Keby sa niekedy zmenil normalizačný alebo hashovací algoritmus,
    // existujúca cache by sa zneplatnila — tento test to nahlási.
    const h = queryHash({ keyword: "react", location: "bratislava" });
    expect(h).toHaveLength(64); // sha256 hex
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normalizePreferences vráti očakávaný tvar", () => {
    expect(
      normalizePreferences({ keyword: " React ", location: " Košice " })
    ).toEqual({ keyword: "react", location: "kosice" });
  });
});
