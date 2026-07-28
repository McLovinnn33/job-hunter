import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { parsePreferences } from "@/lib/contracts/preferences";
import { evaluatePosting, type MatchEvaluation } from "./evaluate";

/**
 * Spustenie matchingu pre používateľa (M8 preview).
 *
 * ZATIAĽ BEZ EMBEDDINGOV: pri malom počte ponúk sa vyhodnocuje každá.
 * Pri reálnej prevádzke to je príliš drahé (~$0.004/ponuka) — M4 doplní
 * embedding predfilter a sem sa pridá krok "vyber TOP N kandidátov"
 * (ROADMAP Part G). Preto je tu tvrdý strop MAX_EVALUATIONS_PER_RUN.
 */

// Poistka proti nákladom, kým nie je embedding predfilter (SECURITY_GDPR S6)
const MAX_EVALUATIONS_PER_RUN = 25;
// Koľko hodnotení bežať naraz — kompromis medzi rýchlosťou a rate limitmi
const EVALUATION_BATCH_SIZE = 5;

export type MatchRunResult = {
  evaluated: number;
  saved: number;
  skippedAlreadyMatched: number;
  failed: number;
};

export async function runMatchingForUser(
  userId: string
): Promise<MatchRunResult> {
  const supabase = createServiceClient();

  // 1) Profil kandidáta
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("raw_cv_text, chat_summary, preferences_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Načítanie profilu zlyhalo: ${profileError.message}`);
  }
  const preferences = parsePreferences(profile?.preferences_json);
  if (!preferences) {
    throw new Error(
      "Používateľ nemá dokončený onboarding — chýbajú preferencie hľadania."
    );
  }

  // 2) Čerstvé ponuky (nevypršané) — ADR-001: pracujeme len s platnou cache
  const { data: postings, error: postingsError } = await supabase
    .from("job_postings")
    .select("id, title, company, location, salary, description_text")
    .gt("expires_at", new Date().toISOString())
    .order("scraped_at", { ascending: false })
    .limit(MAX_EVALUATIONS_PER_RUN);

  if (postingsError) {
    throw new Error(`Načítanie ponúk zlyhalo: ${postingsError.message}`);
  }
  if (!postings || postings.length === 0) {
    return { evaluated: 0, saved: 0, skippedAlreadyMatched: 0, failed: 0 };
  }

  // 3) Preskočíme ponuky, ktoré už tento používateľ vyhodnotené má
  const { data: existing } = await supabase
    .from("matches")
    .select("job_posting_id")
    .eq("user_id", userId);
  const alreadyMatched = new Set(
    (existing ?? []).map((m) => m.job_posting_id as string)
  );
  const todo = postings.filter((p) => !alreadyMatched.has(p.id));

  const candidate = {
    preferences,
    chatSummary: profile?.chat_summary ?? null,
    cvText: profile?.raw_cv_text ?? null,
  };

  // 4) Vyhodnotenie po dávkach
  const evaluations: MatchEvaluation[] = [];
  let failed = 0;
  for (let i = 0; i < todo.length; i += EVALUATION_BATCH_SIZE) {
    const batch = todo.slice(i, i + EVALUATION_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((p) =>
        evaluatePosting(candidate, {
          id: p.id,
          title: p.title,
          company: p.company,
          location: p.location,
          salary: p.salary,
          descriptionText: p.description_text,
        })
      )
    );
    for (const r of settled) {
      if (r.status === "fulfilled") evaluations.push(r.value);
      else {
        failed++;
        console.error("Hodnotenie ponuky zlyhalo:", r.reason);
      }
    }
  }

  // 5) Uloženie
  let saved = 0;
  if (evaluations.length > 0) {
    const rows = evaluations.map((e) => ({
      user_id: userId,
      job_posting_id: e.jobPostingId,
      match_tier: e.tier,
      match_score: e.score,
      ai_reasoning: e.reasoning,
      red_flag: e.redFlag,
    }));
    const { error: insertError } = await supabase
      .from("matches")
      .upsert(rows, { onConflict: "user_id,job_posting_id" });
    if (insertError) {
      throw new Error(`Uloženie zhôd zlyhalo: ${insertError.message}`);
    }
    saved = rows.length;
  }

  return {
    evaluated: todo.length,
    saved,
    skippedAlreadyMatched: alreadyMatched.size,
    failed,
  };
}
