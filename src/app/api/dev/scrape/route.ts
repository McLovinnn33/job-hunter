import { NextResponse } from "next/server";
import { cleanupExpiredPostings, runSearch } from "@/lib/scraper/core";
import { parseListPage } from "@/lib/scraper/adapters/profesia";
import { buildSearchUrl } from "@/lib/scraper/adapters/profesia";

/**
 * DEV testovacia routa pre M5 — existuje LEN vo vývoji (npm run dev).
 * V produkcii vráti 404. Ostrý trigger pre používateľov príde v M11
 * (instant first search) s poriadnym rate limitom (S6).
 *
 * Použitie v prehliadači:
 *   /api/dev/scrape?keyword=react                → plný beh (scrape + uloženie)
 *   /api/dev/scrape?keyword=react&location=bratislava
 *   /api/dev/scrape?keyword=react&dry=1          → len fetch+parse, bez databázy
 *   /api/dev/scrape?cleanup=1                    → spustí cleanup exspirovaných
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.get("cleanup") === "1") {
      const deleted = await cleanupExpiredPostings();
      return NextResponse.json({ ok: true, action: "cleanup", deleted });
    }

    const keyword = searchParams.get("keyword");
    if (!keyword) {
      return NextResponse.json(
        { error: "Chýba parameter ?keyword=..." },
        { status: 400 }
      );
    }
    const prefs = {
      keyword,
      location: searchParams.get("location") ?? undefined,
    };

    // Dry run: otestuje fetch + parsovanie bez zápisu do databázy
    if (searchParams.get("dry") === "1") {
      const url = buildSearchUrl(prefs, 1);
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "sk" },
      });
      const html = await response.text();
      const postings = parseListPage(html);
      return NextResponse.json({
        ok: true,
        action: "dry-run",
        searchUrl: url,
        found: postings.length,
        sample: postings.slice(0, 5),
      });
    }

    const result = await runSearch(prefs, null);
    return NextResponse.json({ ok: true, action: "full-run", ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
