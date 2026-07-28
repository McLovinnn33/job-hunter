import { NextResponse } from "next/server";
import { runMatchingForUser } from "@/lib/matching/run";
import { createClient } from "@/lib/supabase/server";

/**
 * DEV spúšťač matchingu pre prihláseného používateľa.
 * V produkcii 404 — ostrý trigger príde v M11 (instant first search)
 * s rate limitom podľa SECURITY_GDPR S6.
 *
 * Použitie: prihlás sa v aplikácii, potom otvor /api/dev/match
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Nie ste prihlásený. Prihláste sa v aplikácii a skúste znova." },
      { status: 401 }
    );
  }

  try {
    const result = await runMatchingForUser(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
