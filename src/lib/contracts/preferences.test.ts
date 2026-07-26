import { describe, it, expect } from "vitest";
import {
  candidatePreferencesSchema,
  parsePreferences,
  searchPreferencesSchema,
} from "./preferences";

/**
 * Kontrakt preferencií (rieši R2). Tieto testy chránia hranicu medzi
 * M3 (zápis) a M5 (čítanie): ak sa tvar rozíde, spadnú TU — nie tichým
 * `undefined` výrazom v scraperi.
 */
describe("candidatePreferences contract", () => {
  it("prijme kompletné platné preferencie", () => {
    const parsed = parsePreferences({
      keyword: "frontend developer",
      location: "Bratislava",
      salaryMin: 2500,
      employmentType: "plny_uvazok",
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.keyword).toBe("frontend developer");
  });

  it("prijme minimálny tvar (len keyword)", () => {
    expect(parsePreferences({ keyword: "účtovník" })).not.toBeNull();
  });

  it("prijme null vo voliteľných poliach (jsonb vracia null, nie undefined)", () => {
    const parsed = parsePreferences({
      keyword: "skladník",
      location: null,
      salaryMin: null,
      employmentType: null,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.location).toBeNull();
  });

  it("odmietne prázdny keyword", () => {
    expect(parsePreferences({ keyword: "" })).toBeNull();
  });

  it("odmietne chýbajúci keyword", () => {
    expect(parsePreferences({ location: "Košice" })).toBeNull();
  });

  it("odmietne typ úväzku mimo povolenej množiny", () => {
    expect(
      parsePreferences({ keyword: "x", employmentType: "vymyslený_typ" })
    ).toBeNull();
  });

  it("odmietne úplne cudzí tvar (napr. keby M3 zmenil zápis)", () => {
    expect(parsePreferences({ foo: "bar" })).toBeNull();
    expect(parsePreferences(null)).toBeNull();
    expect(parsePreferences("reťazec")).toBeNull();
  });

  it("odmietne zápornú mzdu", () => {
    expect(parsePreferences({ keyword: "x", salaryMin: -100 })).toBeNull();
  });

  it("round-trip: čo M3 zapíše, M5 prečíta bezo zmeny", () => {
    // Simuluje presne to, čo onboarding-actions ukladá do preferences_json
    const written = {
      keyword: "java developer",
      location: "remote",
      salaryMin: 3200,
      employmentType: "plny_uvazok" as const,
    };
    const readBack = parsePreferences(JSON.parse(JSON.stringify(written)));
    expect(readBack).toEqual(written);
  });

  it("scraper podmnožina berie len keyword + location", () => {
    const result = searchPreferencesSchema.safeParse({
      keyword: "x",
      location: "y",
    });
    expect(result.success).toBe(true);
  });

  it("plný a scraper schéma sú odvodené z jedného zdroja", () => {
    // Poistka: keby niekto omylom rozdelil definície, tento test to nechytí,
    // ale chytí, že keyword ostáva povinný v oboch.
    expect(candidatePreferencesSchema.safeParse({}).success).toBe(false);
    expect(searchPreferencesSchema.safeParse({}).success).toBe(false);
  });
});
