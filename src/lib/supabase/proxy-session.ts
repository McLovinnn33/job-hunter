import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Cesty vyžadujúce prihlásenie
const PROTECTED_PREFIXES = ["/dashboard"];
// Auth stránky — prihlásený používateľ na nich nemá čo robiť, presmerujeme na dashboard
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Obnoví Supabase session (refresh tokenu) pri každom requeste a chráni
 * /dashboard pred neprihlásenými používateľmi. Volá sa zo src/proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Bez kľúčov nevieme riešiť session — stránky bez Supabase (login, terms...)
    // necháme zobraziť; stránky, ktoré Supabase potrebujú, zobrazia jasnú chybu samy.
    console.error(
      "Chýbajú Supabase premenné prostredia. Skopírujte .env.example do .env.local a doplňte hodnoty zo Supabase dashboardu (Settings → API)."
    );
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // DÔLEŽITÉ: getUser() overuje token proti Supabase serveru (nie len lokálne),
  // a zároveň obnovuje expirovanú session. Nemazať, nepresúvať.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
