import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Registrácia — Job Hunter",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-glow p-4">
      <SignupForm />
    </main>
  );
}
