import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// Next.js 16: proxy.ts (predtým middleware.ts) — beží pred každým requestom
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Preskočiť statické súbory a obrázky — session tam netreba riešiť
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
