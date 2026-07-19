import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — Job Hunter",
};

// Stránka závisí od prihlásenia (cookies) — vždy sa renderuje na serveri, nie pri builde
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Dvojitá ochrana: proxy.ts presmeruje neprihlásených, toto je poistka priamo v stránke
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-glow">
      {/* Sticky navigácia s backdrop-blur (UI_UX.md: iOS pocit) */}
      <header className="sticky top-0 z-10 border-b border-border/70 bg-surface/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <span className="font-semibold tracking-tight text-ink">
              Job Hunter
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* E-mail = dáta → Geist Mono (UI_UX.md) */}
            <span className="hidden font-mono text-xs text-ink-muted sm:inline">
              {user.email}
            </span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Odhlásiť sa
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Vaše ponuky
          </h1>
          {/* Stav agenta — "viditeľne živý" (UI_UX.md princíp 3) */}
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted shadow-soft ring-1 ring-foreground/5">
            <span className="status-dot size-2 rounded-full bg-primary" />
            Agent pripravený
          </span>
        </div>

        {/* Prázdny stav = pozvánka, nie ospravedlnenie (UI_UX.md princíp 5) */}
        <Card className="animate-fade-up fade-up-delay-1 mt-6 shadow-soft">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/8 ring-1 ring-primary/15">
              <svg width="30" height="30" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle
                  cx="8"
                  cy="8"
                  r="5.5"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="26 9"
                  transform="rotate(-90 8 8)"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink">
              Všetko je pripravené
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
              Váš účet funguje. V ďalšom kroku si vytvoríte profil — nahráte
              životopis a poviete agentovi, akú prácu hľadáte. Hneď potom začne
              skenovať pracovné portály za vás.
            </p>
            <p className="mt-5 rounded-full bg-secondary px-3 py-1 text-xs text-ink-muted">
              Vytvorenie profilu pribudne v ďalšej verzii aplikácie
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
