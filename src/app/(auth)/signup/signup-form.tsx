"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthFormState } from "../actions";
import { BrandMark } from "@/components/brand-mark";
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

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, INITIAL_STATE);

  return (
    <Card className="w-full max-w-sm shadow-soft [--card-spacing:--spacing(6)]">
      <CardHeader className="items-center text-center">
        <BrandMark size={44} className="mx-auto mb-3" />
        <CardTitle className="text-2xl tracking-tight">
          Vytvorte si účet
        </CardTitle>
        <CardDescription className="text-sm">
          Váš osobný agent začne hľadať pracovné ponuky za vás.
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
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Heslo</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="h-10"
            />
            <p className="text-xs text-ink-muted">Aspoň 8 znakov.</p>
          </div>
          {/* GDPR G3: súhlas nikdy nie je predzaškrtnutý */}
          <div className="flex items-start gap-2">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
            />
            <Label htmlFor="consent" className="text-sm font-normal leading-snug">
              Súhlasím s{" "}
              <Link href="/terms" className="text-primary hover:underline">
                podmienkami používania
              </Link>{" "}
              a{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                zásadami ochrany osobných údajov
              </Link>
              .
            </Label>
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.info && (
            <p role="status" className="text-sm text-primary">
              {state.info}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-5 flex-col gap-3">
          <Button
            type="submit"
            className="h-10 w-full text-[0.9rem] shadow-[0_2px_10px_rgb(59_54_224/0.30)] transition-all duration-150 hover:shadow-[0_4px_14px_rgb(59_54_224/0.35)]"
            disabled={isPending}
          >
            {isPending ? "Vytváram účet…" : "Zaregistrovať sa"}
          </Button>
          <p className="text-sm text-ink-muted">
            Už máte účet?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Prihláste sa
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
