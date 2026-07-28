"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Hodnotenie ponuky používateľom (user_feedback). Podľa
 * DATABASE_SCHEMA.md je táto tabuľka základom budúcej automatickej
 * detekcie fake ponúk (Phase 3+) — každé kliknutie je tréningové dáta.
 */

const FEEDBACK_TYPES = ["fake", "relevant", "irrelevant"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type FeedbackResult = { ok: boolean; error?: string };

export async function rateMatch(
  jobPostingId: string,
  feedbackType: FeedbackType
): Promise<FeedbackResult> {
  if (!FEEDBACK_TYPES.includes(feedbackType)) {
    return { ok: false, error: "Neplatný typ hodnotenia." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Prihlásenie vypršalo. Prihláste sa znova." };
  }

  // RLS dovolí zapísať len vlastný feedback; primárny kľúč je
  // (user_id, job_posting_id), takže opakované kliknutie hodnotenie zmení
  const { error } = await supabase.from("user_feedback").upsert(
    {
      user_id: user.id,
      job_posting_id: jobPostingId,
      feedback_type: feedbackType,
    },
    { onConflict: "user_id,job_posting_id" }
  );

  if (error) {
    console.error("Uloženie hodnotenia zlyhalo:", error.message);
    return { ok: false, error: "Hodnotenie sa nepodarilo uložiť." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
