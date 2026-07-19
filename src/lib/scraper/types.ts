/**
 * Zdieľané typy scraping vrstvy (M5). Adaptéry portálov (M6 Worki,
 * M7 Kariéra) implementujú PortalAdapter — jadro sa nemení.
 */

export type JobSource = "profesia" | "worki" | "kariera";

// Preferencie vyhľadávania — v M5 zadávané ručne (dev test),
// od M3 čítané z profiles.preferences_json
export type SearchPreferences = {
  keyword: string;
  location?: string;
};

export type ScrapedPosting = {
  source: JobSource;
  title: string;
  company: string | null;
  salary: string | null;
  location: string | null;
  url: string;
  postedDate: string | null; // ISO dátum (približný — portály udávajú relatívne)
  descriptionText: string | null;
};

export interface PortalAdapter {
  readonly source: JobSource;
  /** Vráti ponuky pre danú preferenciu — vrátane textu ponuky, ak sa dá získať. */
  search(prefs: SearchPreferences): Promise<ScrapedPosting[]>;
}

export type SearchRunResult = {
  fromCache: boolean;
  postingsFound: number;
  newPostings: number;
  scrapeRunId: string | null;
};
