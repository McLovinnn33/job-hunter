import { describe, it, expect } from "vitest";
import { deriveTier, clampScore, sanitizeText } from "./evaluate";

/**
 * Testy troch poistiek OKOLO modelu (ROADMAP Part G). Všetky tri chyby
 * reálne nastali pri spike 28.7.2026 — model vracal nekonzistentné dáta.
 * Tieto testy zabezpečia, že ich kód zachytí bez ohľadu na to, čo model
 * pošle nabudúce.
 */

describe("deriveTier — stupeň sa počíta zo skóre, nie z modelu", () => {
  it("vysoké skóre = silná zhoda", () => {
    expect(deriveTier(85, false)).toBe("strong_match");
    expect(deriveTier(70, false)).toBe("strong_match");
  });

  it("stredné skóre = stojí za zváženie", () => {
    expect(deriveTier(69, false)).toBe("worth_considering");
    expect(deriveTier(45, false)).toBe("worth_considering");
  });

  it("nízke skóre = odvážne", () => {
    expect(deriveTier(44, false)).toBe("stretch");
    expect(deriveTier(0, false)).toBe("stretch");
  });

  it("REGRESIA: podozrivá ponuka nikdy nedostane silnú zhodu", () => {
    // Presne toto sa stalo: MLM inzerát so skóre 15 dostal "strong_match"
    expect(deriveTier(95, true)).toBe("stretch");
    expect(deriveTier(70, true)).toBe("stretch");
  });
});

describe("clampScore", () => {
  it("drží skóre v rozsahu 0-100", () => {
    expect(clampScore(150, false)).toBe(100);
    expect(clampScore(-20, false)).toBe(0);
  });

  it("zaokrúhľuje", () => {
    expect(clampScore(72.6, false)).toBe(73);
  });

  it("REGRESIA: podozrivá ponuka sa zrazí na strop", () => {
    expect(clampScore(95, true)).toBe(20);
    expect(clampScore(10, true)).toBe(10); // už je nižšie, nedvíha sa
  });
});

describe("sanitizeText — REGRESIA: model vypustil </an_flag> do textu", () => {
  it("odstráni značky", () => {
    expect(sanitizeText("Dobrá ponuka</an_flag></invoke>")).toBe(
      "Dobrá ponuka"
    );
    expect(sanitizeText("<script>zle()</script>text")).toBe("zle()text");
  });

  it("zachová slovenskú diakritiku a normálnu interpunkciu", () => {
    const text = "Máte magisterský titul — to sedí (naozaj)!";
    expect(sanitizeText(text)).toBe(text);
  });

  it("zjednotí biele znaky", () => {
    expect(sanitizeText("veľa    medzier\n\nnový riadok")).toBe(
      "veľa medzier nový riadok"
    );
  });

  it("obmedzí dĺžku", () => {
    expect(sanitizeText("a".repeat(5000)).length).toBeLessThanOrEqual(1200);
  });
});
