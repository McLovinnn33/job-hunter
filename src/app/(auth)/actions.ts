"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Supabase má default minimum 6, my vyžadujeme 8 — nastavené aj v Supabase dashboarde
const MIN_PASSWORD_LENGTH = 8;

export type AuthFormState = {
  error?: string;
  // Po registrácii s potvrdením e-mailu: správa "skontrolujte si schránku"
  info?: string;
};

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Vyplňte e-mail aj heslo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Chybové hlášky: čo sa stalo + čo robiť, nikdy surová technická chyba (UI_UX.md)
    if (error.code === "invalid_credentials") {
      return {
        error:
          "Nesprávny e-mail alebo heslo. Skontrolujte preklepy a skúste znova.",
      };
    }
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "E-mail ešte nie je potvrdený. Otvorte správu od Job Hunter vo svojej schránke a kliknite na potvrdzovací odkaz.",
      };
    }
    return {
      error:
        "Prihlásenie sa nepodarilo. Skúste to o chvíľu znova — ak problém pretrváva, dajte nám vedieť.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent") === "on";

  if (!email || !password) {
    return { error: "Vyplňte e-mail aj heslo." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Heslo musí mať aspoň ${MIN_PASSWORD_LENGTH} znakov. Zvoľte dlhšie heslo.`,
    };
  }
  // GDPR (SECURITY_GDPR G3): súhlas musí byť aktívne zaškrtnutý, nikdy predvyplnený
  if (!consent) {
    return {
      error:
        "Na vytvorenie účtu potrebujeme váš súhlas s podmienkami a zásadami ochrany osobných údajov — zaškrtnite políčko nižšie.",
    };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // Časová pečiatka súhlasu — uložená v metadátach používateľa (G3)
      data: { terms_accepted_at: new Date().toISOString() },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return {
        error:
          "Účet s týmto e-mailom už existuje. Prihláste sa, alebo použite iný e-mail.",
      };
    }
    if (error.code === "weak_password") {
      return {
        error:
          "Toto heslo je príliš slabé. Zvoľte dlhšie heslo, ideálne kombináciu slov a číslic.",
      };
    }
    return {
      error:
        "Registrácia sa nepodarila. Skúste to o chvíľu znova — ak problém pretrváva, dajte nám vedieť.",
    };
  }

  // Ak je v Supabase vypnuté potvrdzovanie e-mailu, session existuje hneď → rovno dnu
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    info: "Účet je vytvorený. Otvorte svoju e-mailovú schránku a kliknite na potvrdzovací odkaz — potom sa môžete prihlásiť.",
  };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Aj pri chybe presmerujeme na login — session cookie už môže byť neplatná
    console.error("Odhlásenie zlyhalo:", error.message);
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
