import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cieľ potvrdzovacieho odkazu z e-mailu (PKCE flow): Supabase sem presmeruje
 * s ?code=..., my kód vymeníme za session a pošleme používateľa na dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
    console.error("Výmena kódu za session zlyhala:", error.message);
  }

  // Kód chýba alebo je neplatný/expirovaný → login s vysvetlením
  return NextResponse.redirect(`${origin}/login?error=confirmation`);
}
