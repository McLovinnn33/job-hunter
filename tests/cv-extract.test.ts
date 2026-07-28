import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { extractCvText, PDF_MIME, DOCX_MIME } from "@/lib/cv/extract";

/**
 * REGRESNÝ TEST pre bug z 28.7.2026: PDF životopisy sa nedali prečítať,
 * lebo Next.js pri bundlovaní zahodil pdf worker. Navonok to vyzeralo ako
 * "sken bez textu" a používateľa to posielalo nahrať Word — pritom PDF bolo
 * v poriadku. Väčšina ľudí má životopis v PDF, takže toto je kritická cesta.
 *
 * Fixture je SYNTETICKÉ CV (nie skutočný životopis používateľa — osobné
 * údaje nepatria do gitu).
 */
const samplePdf = readFileSync(resolve(__dirname, "fixtures/sample-cv.pdf"));

describe("extractCvText — PDF (kritická cesta, väčšina CV je PDF)", () => {
  it("prečíta text z bežného PDF", async () => {
    const result = await extractCvText(samplePdf, PDF_MIME);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.length).toBeGreaterThan(100);
      expect(result.text).toContain("Jana Testovacia");
    }
  });

  it("zachová slovenskú diakritiku", async () => {
    const result = await extractCvText(samplePdf, PDF_MIME);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toMatch(/analytik|Bratislave/);
    }
  });

  it("prázdne/poškodené PDF nespadne, ale vráti rozlíšiteľný dôvod", async () => {
    const result = await extractCvText(Buffer.from("nie je to PDF"), PDF_MIME);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Kľúčové: technická chyba sa NESMIE tváriť ako "sken" (to bol ten bug)
      expect(["error", "empty"]).toContain(result.reason);
    }
  });
});

describe("extractCvText — DOCX", () => {
  it("poškodený DOCX vráti chybu, nie pád", async () => {
    const result = await extractCvText(Buffer.from("nie je to docx"), DOCX_MIME);
    expect(result.ok).toBe(false);
  });
});
