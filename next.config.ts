import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * pdf-parse (a pdfjs-dist pod kapotou) potrebuje za behu svoj "worker"
   * súbor. Keď ho Next.js zabalí do vlastných chunkov, worker sa stratí a
   * extrakcia textu z PDF spadne na "Setting up fake worker failed" —
   * aplikácia potom PDF uloží, ale bez textu (M2 bug, nájdený 28.7.2026).
   * serverExternalPackages necháva balík načítať priamo z node_modules,
   * takže si so sebou nesie všetko, čo potrebuje.
   *
   * ⚠️ Netreba odstraňovať bez otestovania nahrania REÁLNEHO PDF životopisu.
   */
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
