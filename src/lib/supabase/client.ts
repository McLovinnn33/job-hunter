import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase klient pre prehliadač (client components).
 * Používa VÝHRADNE verejný "anon/publishable" kľúč — RLS politiky platia (SECURITY_GDPR S3).
 * Kľúče žijú len v .env.local / Vercel env vars, nikdy v kóde (S2).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Chýbajú Supabase premenné prostredia. Skopírujte .env.example do .env.local a doplňte NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY zo Supabase dashboardu (Settings → API)."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
