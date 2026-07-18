"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
    <Card className="w-full max-w-sm shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Vitajte späť</CardTitle>
        <CardDescription>
          Prihláste sa a pozrite si, čo váš agent našiel.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
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
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Prihlasujem…" : "Prihlásiť sa"}
          </Button>
          <p className="text-sm text-ink-muted">
            Ešte nemáte účet?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Zaregistrujte sa
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
