import { readFile } from "fs/promises";
import { resolve } from "path";
import { NextResponse } from "next/server";
import { extractCvText, PDF_MIME } from "@/lib/cv/extract";

/**
 * DEV diagnostika: overí, že extrakcia textu z PDF funguje V REÁLNOM
 * kontexte Next.js servera (nie len v samostatnom skripte). Presne tu sa
 * prejavil bug z 28.7.2026 — knižnica fungovala v skripte, ale v appke
 * spadla na chýbajúci pdf worker. Unit test toto nezachytí, lebo nebeží
 * cez Next.js bundler.
 *
 * Použitie: /api/dev/test-pdf   (len vo vývoji; v produkcii 404)
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const pdf = await readFile(
      resolve(process.cwd(), "tests/fixtures/sample-cv.pdf")
    );
    const result = await extractCvText(pdf, PDF_MIME);

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        message: "PDF extrakcia funguje v Next.js kontexte ✅",
        chars: result.text.length,
        preview: result.text.slice(0, 120),
      });
    }
    return NextResponse.json(
      { ok: false, reason: result.reason, detail: result.detail },
      { status: 500 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
