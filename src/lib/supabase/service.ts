import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role klient — OBCHÁDZA RLS. Výhradne pre serverové úlohy,
 * ktoré pracujú so zdieľanými/service tabuľkami (job_postings,
 * search_queries, scrape_runs). Import "server-only" navrchu garantuje,
 * že tento súbor sa NIKDY nedostane do kódu pre prehliadač — build by
 * spadol (SECURITY_GDPR S3).
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Chýba SUPABASE_SECRET_KEY v .env.local. Nájdete ho v Supabase: Project Settings → API Keys → Secret keys. Tento kľúč NIKDY nepatrí do prehliadača ani do Gitu."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
