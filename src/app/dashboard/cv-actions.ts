"use server";

import { revalidatePath } from "next/cache";
import {
  extractCvText,
  DOCX_MIME,
  PDF_MIME,
} from "@/lib/cv/extract";
import { createClient } from "@/lib/supabase/server";

// Limity ako pomenované konštanty (AGENTS.md: žiadne magické čísla)
const MAX_CV_FILE_SIZE_MB = 10;
const MAX_CV_FILE_SIZE_BYTES = MAX_CV_FILE_SIZE_MB * 1024 * 1024;
// Podpísaný odkaz na zobrazenie CV platí 2 minúty (S4)
const SIGNED_URL_EXPIRY_SECONDS = 120;

export type CvUploadState = {
  error?: string;
  warning?: string;
  success?: string;
};

export async function uploadCv(
  _prevState: CvUploadState,
  formData: FormData
): Promise<CvUploadState> {
  const file = formData.get("cv");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vyberte súbor so životopisom (PDF alebo Word)." };
  }
  if (file.size > MAX_CV_FILE_SIZE_BYTES) {
    return {
      error: `Súbor je príliš veľký (limit ${MAX_CV_FILE_SIZE_MB} MB). Skúste menší súbor alebo PDF bez obrázkov.`,
    };
  }
  if (file.type !== PDF_MIME && file.type !== DOCX_MIME) {
    return {
      error:
        "Tento formát nepodporujeme. Nahrajte životopis ako PDF alebo Word (.docx).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Prihlásenie vypršalo. Prihláste sa znova a skúste to ešte raz." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1) Extrakcia textu — robíme ju PRED uložením, aby sme vedeli varovať
  const extraction = await extractCvText(buffer, file.type);
  const parsedText = extraction.ok ? extraction.text : "";

  // 2) Uloženie súboru do privátneho bucketu (cesta = <user_id>/nazov)
  const extension = file.type === PDF_MIME ? "pdf" : "docx";
  const storagePath = `${user.id}/cv.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Upload CV do Storage zlyhal:", uploadError.message);
    return {
      error:
        "Nahrávanie sa nepodarilo. Skúste to o chvíľu znova — ak problém pretrváva, dajte nám vedieť.",
    };
  }

  // 3) Zápis do profilu
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      raw_cv_text: parsedText || null,
      cv_file_url: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Zápis CV do profilu zlyhal:", updateError.message);
    return {
      error:
        "Súbor sa nahral, ale uloženie do profilu zlyhalo. Skúste to znova — ak problém pretrváva, dajte nám vedieť.",
    };
  }

  revalidatePath("/dashboard");

  // UI_UX.md: chyby/varovania = čo sa stalo + čo robiť.
  // Rozlišujeme NAŠU chybu od skenovaného PDF — používateľa nesmieme posielať
  // konvertovať súbor, keď je problém na našej strane (bug 28.7.2026).
  if (!extraction.ok) {
    if (extraction.reason === "error") {
      return {
        warning:
          "Súbor je uložený, ale text sa nepodarilo prečítať kvôli technickej chybe na našej strane — nie je to chyba vášho súboru. Už o tom vieme; skúste to prosím o chvíľu znova.",
      };
    }
    return {
      warning:
        "Súbor je uložený, ale nenašli sme v ňom žiadny text — pravdepodobne ide o sken alebo fotku. Agent potrebuje text: skúste životopis znova vyexportovať ako PDF z Wordu, Google Docs alebo Canvy (nie odfotiť či naskenovať).",
    };
  }

  return {
    success: "Životopis je nahraný a prečítaný. Agent ho použije pri hľadaní ponúk.",
  };
}

export async function getCvSignedUrl(): Promise<{
  url?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Prihlásenie vypršalo. Prihláste sa znova." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cv_file_url")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.cv_file_url) {
    return { error: "Zatiaľ nemáte nahraný žiadny životopis." };
  }

  const { data, error } = await supabase.storage
    .from("cvs")
    .createSignedUrl(profile.cv_file_url, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("Vytvorenie podpísaného odkazu zlyhalo:", error?.message);
    return {
      error: "Odkaz na súbor sa nepodarilo vytvoriť. Skúste to o chvíľu znova.",
    };
  }

  return { url: data.signedUrl };
}
