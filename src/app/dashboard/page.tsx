import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { CvCard } from "./cv-card";
import { OnboardingChat } from "./onboarding-chat";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
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

  // Profil vytvára databázový trigger pri registrácii; ak chýba, UI to zvládne
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cv_file_url, raw_cv_text, updated_at, chat_summary, preferences_json")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Načítanie profilu zlyhalo:", profileError.message);
  }

  const hasCv = Boolean(profile?.cv_file_url);
  const hasParsedText = Boolean(profile?.raw_cv_text);
  const preferences = profile?.preferences_json as {
    keyword: string;
    location?: string;
    salaryMin?: number;
    employmentType?: string;
  } | null;

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
            Váš profil
          </h1>
          {/* Stav agenta — "viditeľne živý" (UI_UX.md princíp 3) */}
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted shadow-soft ring-1 ring-foreground/5">
            <span className="status-dot size-2 rounded-full bg-primary" />
            Agent pripravený
          </span>
        </div>

        <CvCard
          hasCv={hasCv}
          hasParsedText={hasParsedText}
          updatedAt={profile?.updated_at ?? null}
        />

        <OnboardingChat
          initialSummary={profile?.chat_summary ?? null}
          initialPreferences={preferences}
        />
      </main>
    </div>
  );
}
