import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { DotPattern } from "@/components/ui/dot-pattern";

export const metadata: Metadata = {
  title: "Prihlásenie — Job Hunter",
};

// Chybové kódy z /auth/callback a /auth/confirm → ľudská hláška (UI_UX.md: čo sa stalo + čo robiť)
const URL_ERROR_MESSAGES: Record<string, string> = {
  confirmation:
    "Potvrdzovací odkaz je neplatný alebo expiroval. Prihláste sa — ak to nepôjde, zaregistrujte sa znova a použite nový odkaz z e-mailu.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const urlError = error ? URL_ERROR_MESSAGES[error] : undefined;

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-glow p-4">
      {/* Jemná bodková textúra v pozadí (motion system / Firecrawl technika) */}
      <DotPattern
        width={22}
        height={22}
        cr={1}
        className="text-ink/10 [mask-image:radial-gradient(720px_circle_at_50%_32%,white,transparent)]"
      />
      <div className="relative w-full max-w-sm animate-fade-up">
        <LoginForm urlError={urlError} />
      </div>
    </main>
  );
}
