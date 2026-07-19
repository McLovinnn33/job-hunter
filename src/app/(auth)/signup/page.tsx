import type { Metadata } from "next";
import { SignupForm } from "./signup-form";
import { DotPattern } from "@/components/ui/dot-pattern";

export const metadata: Metadata = {
  title: "Registrácia — Job Hunter",
};

export default function SignupPage() {
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
        <SignupForm />
      </div>
    </main>
  );
}
