import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { AgentActivity, type ScrapeRunInfo } from "./agent-activity";
import { CvCard } from "./cv-card";
import { MatchList, type MatchItem } from "./match-list";
import { OnboardingChat } from "./onboarding-chat";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { parsePreferences } from "@/lib/contracts/preferences";
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
  // R2 fix: validované cez kontrakt namiesto neovereného `as` castu
  const preferences = parsePreferences(profile?.preferences_json);

  // Zhody + ponuky. RLS zabezpečí, že vidíme len vlastné riadky; ponuku
  // používateľ vidí LEN cez vlastný match (politika job_postings).
  const { data: matchRows, error: matchesError } = await supabase
    .from("matches")
    .select(
      "id, match_score, match_tier, ai_reasoning, red_flag, job_posting_id, job_postings (id, title, company, location, salary, url, source)"
    )
    .eq("user_id", user.id)
    .order("match_score", { ascending: false });

  if (matchesError) {
    console.error("Načítanie zhôd zlyhalo:", matchesError.message);
  }

  const { data: feedbackRows } = await supabase
    .from("user_feedback")
    .select("job_posting_id, feedback_type")
    .eq("user_id", user.id);
  const feedbackByPosting = new Map(
    (feedbackRows ?? []).map((f) => [
      f.job_posting_id as string,
      f.feedback_type as MatchItem["feedback"],
    ])
  );

  const matches: MatchItem[] = (matchRows ?? [])
    .filter((m) => m.job_postings)
    .map((m) => {
      const posting = m.job_postings as unknown as {
        id: string;
        title: string;
        company: string | null;
        location: string | null;
        salary: string | null;
        url: string;
        source: string;
      };
      return {
        id: m.id as string,
        score: Number(m.match_score ?? 0),
        tier: m.match_tier as MatchItem["tier"],
        reasoning: (m.ai_reasoning as string) ?? "",
        redFlag: (m.red_flag as string | null) ?? null,
        feedback: feedbackByPosting.get(posting.id) ?? null,
        posting,
      };
    });

  // Aktivita agenta (Finding 8) — posledné behy + koľko ponúk je platných
  const { data: runRows } = await supabase
    .from("scrape_runs")
    .select("status, started_at, finished_at, postings_found")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(3);

  const runs: ScrapeRunInfo[] = (runRows ?? []).map((r) => ({
    status: r.status as ScrapeRunInfo["status"],
    startedAt: r.started_at as string,
    finishedAt: (r.finished_at as string | null) ?? null,
    postingsFound: (r.postings_found as number | null) ?? null,
  }));

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

        <MatchList matches={matches} />

        <AgentActivity runs={runs} freshPostings={matches.length} />
      </main>
    </div>
  );
}
