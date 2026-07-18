import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Registrácia — Job Hunter",
};

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface-subtle p-4">
      <SignupForm />
    </main>
  );
}
