import type { Metadata } from "next";
import { MatchRing } from "@/components/match-ring";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Náhľad dizajnu — Job Hunter",
};

// Interná galéria dizajnu — vizuálna kontrola tokenov z UI_UX.md bez
// potreby Supabase. Pred verejným spustením (Phase 5) túto stránku
// odstránime alebo schováme za prihlásenie; neobsahuje žiadne dáta.

const COLOR_SWATCHES = [
  { name: "Signal Indigo (primary)", className: "bg-primary" },
  { name: "Urgent amber (len deadliny)", className: "bg-urgent" },
  { name: "Ink (text)", className: "bg-ink" },
  { name: "Ink muted (sekundárny text)", className: "bg-ink-muted" },
] as const;

const RING_EXAMPLES = [
  {
    tier: "strong_match",
    title: "Frontend developer — Bratislava",
    reasoning:
      "Sedí vám React aj TypeScript z CV a plat je v hľadanom rozmedzí.",
  },
  {
    tier: "worth_considering",
    title: "Fullstack developer — remote",
    reasoning:
      "Frontend sedí výborne, backend v Jave zatiaľ nemáte — ale hľadajú juniora ochotného učiť sa.",
  },
  {
    tier: "stretch",
    title: "Tech lead — Košice",
    reasoning:
      "O úroveň vyššia rola, než hľadáte. Trochu odvážne, ale firma sedí s vaším profilom.",
  },
] as const;

export default function PreviewPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-ink">Náhľad dizajnu</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Vizuálna identita z UI_UX.md — interná stránka na kontrolu, nie časť
        produktu.
      </p>

      {/* Farby */}
      <h2 className="mt-10 text-lg font-semibold text-ink">Farby</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COLOR_SWATCHES.map((swatch) => (
          <div key={swatch.name}>
            <div className={`h-14 rounded-lg ${swatch.className}`} />
            <p className="mt-1 text-xs text-ink-muted">{swatch.name}</p>
          </div>
        ))}
      </div>

      {/* Typografia */}
      <h2 className="mt-10 text-lg font-semibold text-ink">Typografia</h2>
      <div className="mt-3 space-y-1">
        <p className="text-ink">Geist — bežný text aplikácie (aj diakritika: čerešňová šťava)</p>
        <p className="font-mono text-sm text-ink-muted">
          Geist Mono — dáta: 2 400 € / mesiac · 18. 7. 2026
        </p>
      </div>

      {/* Tlačidlá a formulár */}
      <h2 className="mt-10 text-lg font-semibold text-ink">
        Tlačidlá a formulár
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        V reálnej aplikácii je na obrazovke vždy len jedno zvýraznené tlačidlo
        (princíp 6) — tu sú vedľa seba len na porovnanie.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button>Hlavná akcia</Button>
        <Button variant="secondary">Sekundárna</Button>
        <Button variant="ghost">Tichá</Button>
        <Button variant="destructive">Zmazať</Button>
      </div>
      <div className="mt-4 grid max-w-xs gap-2">
        <Label htmlFor="preview-input">E-mail</Label>
        <Input id="preview-input" placeholder="vas@email.sk" />
      </div>

      {/* Match ring */}
      <h2 className="mt-10 text-lg font-semibold text-ink">
        Match ring — podpisový prvok
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Animuje sa raz pri načítaní stránky. Vysvetlenie PREČO je vždy súčasťou
        (princíp 2) — aj pri slabšej zhode.
      </p>
      <div className="mt-3 space-y-3">
        {RING_EXAMPLES.map((example) => (
          <Card key={example.tier} className="shadow-soft">
            <CardContent className="flex items-center gap-4">
              <MatchRing tier={example.tier} />
              <div>
                <p className="font-medium text-ink">{example.title}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {example.reasoning}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prázdny stav */}
      <h2 className="mt-10 text-lg font-semibold text-ink">
        Prázdny stav — pozvánka, nie ospravedlnenie
      </h2>
      <Card className="mt-3 shadow-soft">
        <CardHeader>
          <CardTitle>Agent skenuje 3 portály</CardTitle>
          <CardDescription>
            Prvé výsledky uvidíte do 24 hodín. Medzitým si môžete doladiť
            preferencie.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
