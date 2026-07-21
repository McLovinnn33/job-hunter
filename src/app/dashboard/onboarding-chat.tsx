"use client";

import { useRef, useState, useTransition } from "react";
import { sendOnboardingMessage } from "./onboarding-actions";
import type { ChatMessage } from "@/lib/ai/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const OPENING_MESSAGE =
  "Ahoj! Poviete mi, akú prácu hľadáte? Stačí pozícia — zvyšok doladíme.";

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  plny_uvazok: "plný úväzok",
  ciastocny_uvazok: "čiastočný úväzok",
  zivnost: "živnosť",
  brigada: "brigáda",
  remote: "remote",
};

type Preferences = {
  keyword: string;
  location?: string;
  salaryMin?: number;
  employmentType?: string;
};

export function OnboardingChat({
  initialSummary,
  initialPreferences,
}: {
  initialSummary: string | null;
  initialPreferences: Preferences | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(Boolean(initialSummary));
  const [summary, setSummary] = useState(initialSummary);
  const [preferences, setPreferences] = useState<Preferences | null>(
    initialPreferences
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    setInput("");

    const historyForRequest = messages;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    scrollToBottom();

    startTransition(async () => {
      const result = await sendOnboardingMessage(historyForRequest, text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.type === "message") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.assistantText },
        ]);
        scrollToBottom();
      } else {
        setSummary(result.summary);
        setPreferences(result.preferences);
        setDone(true);
      }
    });
  };

  const handleRestart = () => {
    setDone(false);
    setMessages([]);
    setSummary(null);
    setPreferences(null);
    setError(null);
  };

  if (done && summary && preferences) {
    return (
      <Card className="animate-fade-up fade-up-delay-1 mt-6 shadow-soft">
        <CardHeader>
          <CardTitle>Preferencie hľadania</CardTitle>
          <CardDescription>
            Agent bude hľadať podľa tohto — kedykoľvek to môžete zmeniť.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-relaxed text-ink">{summary}</p>
          <div className="flex flex-wrap gap-2 font-mono text-xs text-ink-muted">
            <span className="rounded-full bg-secondary px-3 py-1">
              {preferences.keyword}
            </span>
            {preferences.location && (
              <span className="rounded-full bg-secondary px-3 py-1">
                {preferences.location}
              </span>
            )}
            {preferences.salaryMin && (
              <span className="rounded-full bg-secondary px-3 py-1">
                od {preferences.salaryMin} EUR/mesiac
              </span>
            )}
            {preferences.employmentType && (
              <span className="rounded-full bg-secondary px-3 py-1">
                {EMPLOYMENT_TYPE_LABELS[preferences.employmentType] ??
                  preferences.employmentType}
              </span>
            )}
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={handleRestart}>
              Upraviť
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-up fade-up-delay-1 mt-6 shadow-soft">
      <CardHeader>
        <CardTitle>Rozhovor s agentom</CardTitle>
        <CardDescription>
          Poviete agentovi, akú prácu hľadáte — potom začne skenovať pracovné
          portály za vás.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div
          ref={scrollRef}
          className="flex max-h-80 flex-col gap-3 overflow-y-auto"
        >
          <ChatBubble role="assistant" text={OPENING_MESSAGE} />
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} text={m.content} />
          ))}
          {isPending && (
            <div className="flex items-center gap-2 self-start text-xs text-ink-muted">
              <span className="status-dot size-1.5 rounded-full bg-primary" />
              Agent premýšľa…
            </div>
          )}
        </div>

        <form
          action={handleSend}
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Napíšte odpoveď…"
            rows={1}
            disabled={isPending}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          />
          <Button type="submit" disabled={isPending || !input.trim()}>
            Odoslať
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChatBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "self-end bg-primary text-primary-foreground"
          : "self-start bg-secondary text-ink"
      }`}
    >
      {text}
    </div>
  );
}
