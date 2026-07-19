"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Limity ako pomenované konštanty (AGENTS.md: žiadne magické čísla)
const MAX_CV_FILE_SIZE_MB = 10;
const MAX_CV_FILE_SIZE_BYTES = MAX_CV_FILE_SIZE_MB * 1024 * 1024;
// Ak extrakcia vráti menej znakov, PDF je pravdepodobne sken/obrázok
const MIN_PARSED_TEXT_CHARS = 100;
// Podpísaný odkaz na zobrazenie CV platí 2 minúty (S4)
const SIGNED_URL_EXPIRY_SECONDS = 120;

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type CvUploadState = {
  error?: string;
  warning?: string;
  success?: string;
};

async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === PDF_MIME) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text ?? "").trim();
    } finally {
      await parser.destroy();
    }
  }
  const { default: mammoth } = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return (result.value ?? "").trim();
}

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
  let parsedText = "";
  let parseFailed = false;
  try {
    parsedText = await extractText(buffer, file.type);
  } catch (e) {
    console.error("Extrakcia textu z CV zlyhala:", e);
    parseFailed = true;
  }

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

  // UI_UX.md: chyby/varovania = čo sa stalo + čo robiť
  if (parseFailed || parsedText.length < MIN_PARSED_TEXT_CHARS) {
    return {
      warning:
        "Súbor je uložený, ale nepodarilo sa z neho prečítať text — pravdepodobne je to sken alebo obrázkové PDF. Agent potrebuje text: skúste nahrať verziu exportovanú z Wordu alebo iného editora.",
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
