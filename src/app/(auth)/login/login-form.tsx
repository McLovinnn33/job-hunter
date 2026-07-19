"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthFormState } from "../actions";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_STATE: AuthFormState = {};

export function LoginForm({ urlError }: { urlError?: string }) {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE);
  // Chyba z URL (napr. expirovaný potvrdzovací odkaz) sa zobrazí, kým formulár nevráti vlastný stav
  const errorMessage = state.error ?? (state === INITIAL_STATE ? urlError : undefined);

  return (
    <Card className="w-full max-w-sm shadow-soft [--card-spacing:--spacing(6)]">
      <CardHeader className="items-center text-center">
        <BrandMark size={44} className="mx-auto mb-3" />
        <CardTitle className="text-2xl tracking-tight">Vitajte späť</CardTitle>
        <CardDescription className="text-sm">
          Prihláste sa a pozrite si, čo váš agent našiel.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="vas@email.sk"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Heslo</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <Button type="submit" className="mt-1 w-full" disabled={isPending}>
            {isPending ? "Prihlasujem…" : "Prihlásiť sa"}
          </Button>
          <p className="pb-2 text-center text-sm text-ink-muted">
            Ešte nemáte účet?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Zaregistrujte sa
            </Link>
          </p>
        </CardContent>
      </form>
    </Card>
  );
}
