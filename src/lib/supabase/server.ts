import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase klient pre server (server components, server actions, route handlers).
 * Session sa drží v cookies; aj tu sa používa len anon kľúč — RLS platí.
 * service_role kľúč sa v M0 nepoužíva nikde (SECURITY_GDPR S3).
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Chýbajú Supabase premenné prostredia. Skopírujte .env.example do .env.local a doplňte NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY zo Supabase dashboardu (Settings → API)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll zavolaný zo server componentu (tam sa cookies nastaviť nedajú) —
          // session obnovuje proxy.ts, takže toto je bezpečné ignorovať
        }
      },
    },
  });
}
