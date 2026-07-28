"use client";

import { useState, useTransition } from "react";
import { rateMatch, type FeedbackType } from "./match-actions";
import { MatchRing } from "@/components/match-ring";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Zoznam zhôd (M8 preview / predstupeň M10).
 * UI_UX.md princíp 2: vysvetlenie PREČO je vždy viditeľné, nie schované
 * pod rozkliknutím — je to hlavná hodnota produktu (ADR-004).
 */

export type MatchItem = {
  id: string;
  score: number;
  tier: "strong_match" | "worth_considering" | "stretch";
  reasoning: string;
  redFlag: string | null;
  feedback: FeedbackType | null;
  posting: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    salary: string | null;
    url: string;
    source: string;
  };
};

const TIER_LABEL: Record<MatchItem["tier"], string> = {
  strong_match: "Silná zhoda",
  worth_considering: "Stojí za zváženie",
  stretch: "Odvážne",
};

export function MatchList({ matches }: { matches: MatchItem[] }) {
  if (matches.length === 0) {
    return (
      <Card className="animate-fade-up fade-up-delay-2 mt-6 shadow-soft">
        <CardContent className="px-6 py-12 text-center">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Zatiaľ žiadne ponuky
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            Agent zatiaľ nenašiel ponuky pre váš profil. Hneď ako prebehne
            hľadanie, nájdete ich tu aj s vysvetlením, prečo vám sedia.
          </p>
        </CardContent>
      </Card>
    );
  }

  const suspicious = matches.filter((m) => m.redFlag).length;

  return (
    <section className="animate-fade-up fade-up-delay-2 mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Nájdené ponuky
        </h2>
        <p className="font-mono text-xs text-ink-muted">
          {matches.length} ponúk
          {suspicious > 0 && ` · ${suspicious} označených ako podozrivé`}
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}

function MatchCard({ match }: { match: MatchItem }) {
  const [feedback, setFeedback] = useState<FeedbackType | null>(match.feedback);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rate = (type: FeedbackType) => {
    setError(null);
    const previous = feedback;
    setFeedback(type); // optimistické zobrazenie
    startTransition(async () => {
      const result = await rateMatch(match.posting.id, type);
      if (!result.ok) {
        setFeedback(previous);
        setError(result.error ?? "Nepodarilo sa uložiť.");
      }
    });
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-4">
          <MatchRing tier={match.tier} />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-snug">
              <a
                href={match.posting.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {match.posting.title}
              </a>
            </CardTitle>
            <CardDescription className="mt-1">
              {match.posting.company ?? "Firma neuvedená"}
              {match.posting.location && ` · ${match.posting.location}`}
            </CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-ink-muted">
              <span className="rounded-full bg-secondary px-2.5 py-0.5">
                {TIER_LABEL[match.tier]}
              </span>
              {match.posting.salary && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5">
                  {match.posting.salary}
                </span>
              )}
              <span className="rounded-full bg-secondary px-2.5 py-0.5">
                {match.posting.source}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        {/* ADR-004: vysvetlenie je vždy viditeľné */}
        <p className="text-sm leading-relaxed text-ink">{match.reasoning}</p>

        {match.redFlag && (
          <div className="rounded-lg border border-[color:var(--urgent)]/30 bg-[color:var(--urgent)]/8 px-3.5 py-2.5">
            <p className="text-xs font-medium text-ink">
              ⚠️ Pozor — táto ponuka pôsobí podozrivo
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              {match.redFlag}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          <span className="mr-1 text-xs text-ink-muted">Sedelo vám to?</span>
          <FeedbackButton
            active={feedback === "relevant"}
            disabled={isPending}
            onClick={() => rate("relevant")}
          >
            Áno, dobrá ponuka
          </FeedbackButton>
          <FeedbackButton
            active={feedback === "irrelevant"}
            disabled={isPending}
            onClick={() => rate("irrelevant")}
          >
            Nesedí mi
          </FeedbackButton>
          <FeedbackButton
            active={feedback === "fake"}
            disabled={isPending}
            onClick={() => rate("fake")}
          >
            Podvod / fake
          </FeedbackButton>
        </div>

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={active ? "ring-1 ring-primary/30" : ""}
    >
      {children}
    </Button>
  );
}
