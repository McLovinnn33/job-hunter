import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov — Job Hunter",
};

// Zástupný text — finálne zásady dodá právnik vo Phase 1 (SECURITY_GDPR G7).
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="text-2xl font-semibold text-ink">
        Zásady ochrany osobných údajov
      </h1>
      <p className="mt-4 text-ink-muted">
        Job Hunter je v uzavretom beta testovaní. Úplné zásady ochrany osobných
        údajov pripravujeme s právnikom a zverejníme ich pred verejným
        spustením. Už teraz platí: vaše údaje (e-mail, neskôr životopis a
        preferencie) sú uložené v EÚ, používajú sa výhradne na hľadanie
        pracovných ponúk pre vás a máte právo ich kedykoľvek exportovať alebo
        zmazať.
      </p>
      <p className="mt-4 text-ink-muted">
        Otázky k vašim údajom? Napíšte nám na e-mail uvedený pri registrácii do
        beta programu.
      </p>
      <Link href="/signup" className="mt-8 inline-block text-primary hover:underline">
        Späť na registráciu
      </Link>
    </main>
  );
}
