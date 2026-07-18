import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Podmienky používania — Job Hunter",
};

// Zástupný text — finálne znenie dodá právnik vo Phase 1 (SECURITY_GDPR G7).
// Do beta verzie s desiatkami testerov je tento stav v poriadku.
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="text-2xl font-semibold text-ink">Podmienky používania</h1>
      <p className="mt-4 text-ink-muted">
        Job Hunter je v uzavretom beta testovaní. Úplné podmienky používania
        pripravujeme s právnikom a zverejníme ich pred verejným spustením.
        Zatiaľ platí: aplikácia hľadá pracovné ponuky na základe údajov, ktoré
        jej sami poskytnete, a tieto údaje nikomu nepredáva ani neposkytuje
        tretím stranám na marketing.
      </p>
      <p className="mt-4 text-ink-muted">
        Otázky? Napíšte nám na e-mail uvedený pri registrácii do beta programu.
      </p>
      <Link href="/signup" className="mt-8 inline-block text-primary hover:underline">
        Späť na registráciu
      </Link>
    </main>
  );
}
