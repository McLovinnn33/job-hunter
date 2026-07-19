import * as cheerio from "cheerio";
import { normalizeText } from "../query";
import type {
  PortalAdapter,
  ScrapedPosting,
  SearchPreferences,
} from "../types";

/**
 * Adaptér pre Profesia.sk (M5).
 *
 * PRÁVNY RÁMEC (ADR-001): vždy cielené vyhľadávanie za konkrétneho
 * používateľa — presne to, čo by si spravil sám v prehliadači. Žiadne
 * plošné sťahovanie celého portálu. Slušné správanie: pauzy medzi
 * requestmi, obmedzený počet stránok aj detailov, jasná identifikácia
 * chýb bez agresívneho opakovania.
 */

const BASE_URL = "https://www.profesia.sk";
// Bežný prehliadačový UA — požiadavky vyzerajú ako požiadavky používateľa,
// ktorého zastupujeme (per-user targeted search, ADR-001)
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
// Slušnosť: pauza medzi HTTP požiadavkami
const REQUEST_DELAY_MS = 1200;
// MVP limity — koľko toho stiahneme na jeden dopyt
const MAX_LIST_PAGES = 1; // 1 stránka = ~20 ponúk
const MAX_DETAIL_FETCHES = 12; // detaily (text ponuky) len pre prvých N
const MAX_DESCRIPTION_CHARS = 20000;
const FETCH_TIMEOUT_MS = 20000;

const DAY_MS = 24 * 60 * 60 * 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function politeFetch(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "sk" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Profesia: HTTP ${response.status} pre ${url}`);
      return null;
    }
    return await response.text();
  } catch (e) {
    console.error(`Profesia: fetch zlyhal pre ${url}:`, e);
    return null;
  }
}

/** Zostaví URL vyhľadávania: lokalita ako path slug, keyword ako parameter. */
export function buildSearchUrl(prefs: SearchPreferences, page: number): string {
  const locationSlug = prefs.location
    ? normalizeText(prefs.location).replace(/\s+/g, "-")
    : null;
  const path = locationSlug ? `/praca/${locationSlug}/` : "/praca/";
  const params = new URLSearchParams({ search_anywhere: prefs.keyword });
  if (page > 1) params.set("page_num", String(page));
  return `${BASE_URL}${path}?${params.toString()}`;
}

/** "dnes" / "včera" / "pred X dňami" / "Pred mesiacom" → približný ISO dátum. */
export function parseRelativeDate(text: string | null): string | null {
  if (!text) return null;
  const t = normalizeText(text);
  const now = Date.now();
  if (t.includes("dnes")) return new Date(now).toISOString().slice(0, 10);
  if (t.includes("vcera"))
    return new Date(now - DAY_MS).toISOString().slice(0, 10);
  const days = t.match(/pred (\d+) dnami/);
  if (days)
    return new Date(now - Number(days[1]) * DAY_MS).toISOString().slice(0, 10);
  if (t.includes("tyzdnom") || t.includes("tyzdnami"))
    return new Date(now - 7 * DAY_MS).toISOString().slice(0, 10);
  if (t.includes("mesiacom") || t.includes("mesiacmi"))
    return new Date(now - 30 * DAY_MS).toISOString().slice(0, 10);
  return null;
}

/** Vyparsuje zoznam ponúk zo stránky výsledkov. */
export function parseListPage(html: string): ScrapedPosting[] {
  const $ = cheerio.load(html);
  const postings: ScrapedPosting[] = [];

  $("li.list-row").each((_i, el) => {
    const row = $(el);
    const titleLink = row.find("h2 a").first();
    const title = row.find("span.title").first().text().trim();
    const href = titleLink.attr("href");
    if (!title || !href) return; // riadok bez ponuky (reklama a pod.)

    // URL bez tracking parametrov (search_id) — stabilný identifikátor
    const url = new URL(href, BASE_URL);
    url.search = "";

    const salaryText = row
      .find(".label-group .label")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    postings.push({
      source: "profesia",
      title,
      company: row.find("span.employer").first().text().trim() || null,
      location: row.find("span.job-location").first().text().trim() || null,
      salary: salaryText || null,
      url: url.toString(),
      postedDate: parseRelativeDate(
        row.find(".list-footer .info").first().text()
      ),
      descriptionText: null, // doplní sa z detailu
    });
  });

  return postings;
}

/** Vyparsuje text ponuky z detailnej stránky. */
export function parseDetailPage(html: string): string | null {
  const $ = cheerio.load(html);
  const sections: string[] = [];

  $(".details-section").each((_i, el) => {
    const section = $(el);
    const heading = section.find("h4").first().text().trim();
    const body = section
      .find(".details-desc")
      .first()
      .text()
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (body) sections.push(heading ? `${heading}\n${body}` : body);
  });

  if (sections.length === 0) return null;
  return sections.join("\n\n").slice(0, MAX_DESCRIPTION_CHARS);
}

export const profesiaAdapter: PortalAdapter = {
  source: "profesia",

  async search(prefs: SearchPreferences): Promise<ScrapedPosting[]> {
    const postings: ScrapedPosting[] = [];

    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      const html = await politeFetch(buildSearchUrl(prefs, page));
      if (!html) break;

      const pagePostings = parseListPage(html);
      postings.push(...pagePostings);
      if (pagePostings.length === 0) break;
      if (page < MAX_LIST_PAGES) await delay(REQUEST_DELAY_MS);
    }

    // Texty ponúk — potrebné pre budúce embeddingy/matching (M8)
    const detailCount = Math.min(postings.length, MAX_DETAIL_FETCHES);
    for (let i = 0; i < detailCount; i++) {
      await delay(REQUEST_DELAY_MS);
      const detailHtml = await politeFetch(postings[i].url);
      if (detailHtml) {
        postings[i].descriptionText = parseDetailPage(detailHtml);
      }
    }

    return postings;
  },
};
