"use server";

import { revalidatePath } from "next/cache";
import {
  continueOnboardingChat,
  MAX_MESSAGE_CHARS,
  MAX_ONBOARDING_MESSAGES,
  type ChatMessage,
} from "@/lib/ai/onboarding";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionResult =
  | { ok: true; type: "message"; assistantText: string }
  | {
      ok: true;
      type: "complete";
      preferences: {
        keyword: string;
        location?: string;
        salaryMin?: number;
        employmentType?: string;
      };
      summary: string;
    }
  | { ok: false; error: string };

export async function sendOnboardingMessage(
  history: ChatMessage[],
  newMessage: string
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Prihlásenie vypršalo. Prihláste sa znova." };
  }

  const trimmedMessage = newMessage.trim();
  if (!trimmedMessage) {
    return { ok: false, error: "Napíšte prosím nejakú správu." };
  }
  if (trimmedMessage.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `Správa je príliš dlhá (max ${MAX_MESSAGE_CHARS} znakov). Skúste to skrátiť.`,
    };
  }
  // S6: rozhovor má strop — server ho vynúti dokončiť, nikdy sa nenaťahuje donekonečna
  if (history.length > MAX_ONBOARDING_MESSAGES) {
    return {
      ok: false,
      error: "Rozhovor je príliš dlhý. Obnovte stránku a začnite znova.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("raw_cv_text")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Načítanie CV pre onboarding chat zlyhalo:", profileError.message);
  }

  const updatedHistory: ChatMessage[] = [
    ...history,
    { role: "user", content: trimmedMessage },
  ];

  let result;
  try {
    result = await continueOnboardingChat(
      updatedHistory,
      profile?.raw_cv_text ?? null
    );
  } catch (e) {
    console.error("Onboarding chat zlyhal:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Niečo sa pokazilo. Skúste to o chvíľu znova.",
    };
  }

  if (result.type === "message") {
    return { ok: true, type: "message", assistantText: result.assistantText };
  }

  // Dokončené — uložíme LEN štruktúrované preferencie a súhrn (GDPR G4,
  // Finding 13). Celý prepis konverzácie sa NIKDY neukladá do databázy.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      preferences_json: {
        keyword: result.preferences.keyword,
        location: result.preferences.location ?? null,
        salaryMin: result.preferences.salaryMin ?? null,
        employmentType: result.preferences.employmentType ?? null,
      },
      chat_summary: result.summary,
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Uloženie preferencií zlyhalo:", updateError.message);
    return {
      ok: false,
      error:
        "Rozhovor sa dokončil, ale uloženie preferencií zlyhalo. Skúste to znova.",
    };
  }

  revalidatePath("/dashboard");
  return {
    ok: true,
    type: "complete",
    preferences: result.preferences,
    summary: result.summary,
  };
}
