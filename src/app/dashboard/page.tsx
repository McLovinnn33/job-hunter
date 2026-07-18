import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex min-h-screen flex-col bg-surface-subtle">
      {/* Sticky navigácia s backdrop-blur (UI_UX.md: iOS pocit) */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <span className="font-semibold text-ink">Job Hunter</span>
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
        <h1 className="text-2xl font-semibold text-ink">Vaše ponuky</h1>

        {/* Prázdny stav = pozvánka, nie ospravedlnenie (UI_UX.md princíp 5) */}
        <Card className="mt-6 shadow-soft">
          <CardHeader>
            <CardTitle>Všetko je pripravené</CardTitle>
            <CardDescription>
              Váš účet funguje. V ďalšom kroku si vytvoríte profil — nahráte
              životopis a poviete agentovi, akú prácu hľadáte. Hneď potom začne
              skenovať pracovné portály za vás.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-muted">
              Vytvorenie profilu pribudne v ďalšej verzii aplikácie.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
