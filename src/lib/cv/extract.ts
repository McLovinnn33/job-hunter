import "server-only";

/**
 * Extrakcia textu zo životopisu (M2). Vyčlenené z cv-actions.ts, aby sa
 * dalo overiť samostatne — bug z 28.7.2026 (pdf worker sa stratil pri
 * bundlovaní) sa navonok tváril ako "sken/obrázkové PDF", hoci PDF bolo
 * v poriadku. Fix je v next.config.ts (serverExternalPackages).
 */

export const PDF_MIME = "application/pdf";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Ak extrakcia vráti menej znakov, ide pravdepodobne o sken/obrázok
export const MIN_PARSED_TEXT_CHARS = 100;

export type ExtractResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "error"; detail?: string };

export async function extractCvText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractResult> {
  try {
    let text = "";

    if (mimeType === PDF_MIME) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        text = (result.text ?? "").trim();
      } finally {
        await parser.destroy();
      }
    } else {
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = (result.value ?? "").trim();
    }

    if (text.length < MIN_PARSED_TEXT_CHARS) {
      return { ok: false, reason: "empty" };
    }
    return { ok: true, text };
  } catch (e) {
    // DÔLEŽITÉ: technická chyba (napr. chýbajúci pdf worker) NIE JE to isté
    // ako sken bez textu — rozlišujeme ich, aby sa bug znovu neschoval za
    // hlášku "nahrajte Word".
    console.error("Extrakcia textu z CV zlyhala (technická chyba):", e);
    return {
      ok: false,
      reason: "error",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
