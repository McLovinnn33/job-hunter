import { z } from "zod";

/**
 * JEDINÁ definícia tvaru "aké preferencie hľadania má kandidát"
 * (ROADMAP.md Part C, layer 2 — rieši R2). Tento tvar prechádza hranicou
 * medzi modulmi (M3 zapisuje do profiles.preferences_json, M5 číta) a je
 * uložený ako jsonb. Preto MUSÍ byť definovaný raz a validovaný na oboch
 * stranách — nikdy nie `as SomeType` na neoverenej hodnote z databázy.
 *
 * Keď M3.5 (guided profiling) rozšíri profil o ďalšie polia, pridajú sa
 * SEM — a TypeScript aj testy okamžite ukážu každé miesto, ktoré treba
 * doplniť. To je celý zmysel kontraktu.
 */

export const EMPLOYMENT_TYPES = [
  "plny_uvazok",
  "ciastocny_uvazok",
  "zivnost",
  "brigada",
  "remote",
] as const;

export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);

// Uložený tvar v profiles.preferences_json. Voliteľné polia sú nullable,
// pretože jsonb z DB vracia null (nie undefined) pre nevyplnené hodnoty.
export const candidatePreferencesSchema = z.object({
  keyword: z.string().min(1, "Chýba hľadaná pozícia."),
  location: z.string().min(1).nullable().optional(),
  salaryMin: z.number().positive().nullable().optional(),
  employmentType: employmentTypeSchema.nullable().optional(),
});

export type CandidatePreferences = z.infer<typeof candidatePreferencesSchema>;

/**
 * Bezpečne prečíta preferencie z ľubovoľnej (neistej) hodnoty — napr.
 * priamo z databázového jsonb stĺpca. Vráti null namiesto pádu, keď tvar
 * nesedí, aby volajúci mohol zobraziť zrozumiteľnú hlášku.
 */
export function parsePreferences(value: unknown): CandidatePreferences | null {
  const result = candidatePreferencesSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Podmnožina, ktorú potrebuje scraper (M5): stačí pozícia + lokalita.
 * Odvodené z toho istého kontraktu, takže nemôže zísť z cesty.
 */
export const searchPreferencesSchema = candidatePreferencesSchema.pick({
  keyword: true,
  location: true,
});

export type SearchPreferences = z.infer<typeof searchPreferencesSchema>;
