import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Úvodná stránka: prihlásený → dashboard, neprihlásený → login.
// Verejná landing page príde až pred spustením (Phase 5).

// Stránka závisí od prihlásenia (cookies) — vždy sa renderuje na serveri, nie pri builde
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
