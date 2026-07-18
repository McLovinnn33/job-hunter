import type { Metadata } from "next";
import { LoginForm } from "./login-form";

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
    <main className="flex min-h-screen flex-1 items-center justify-center bg-glow p-4">
      <LoginForm urlError={urlError} />
    </main>
  );
}
