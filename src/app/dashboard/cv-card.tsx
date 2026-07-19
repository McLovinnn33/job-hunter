"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { getCvSignedUrl, uploadCv, type CvUploadState } from "./cv-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INITIAL_STATE: CvUploadState = {};

export function CvCard({
  hasCv,
  hasParsedText,
  updatedAt,
}: {
  hasCv: boolean;
  hasParsedText: boolean;
  updatedAt: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    uploadCv,
    INITIAL_STATE
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [isViewPending, startViewTransition] = useTransition();

  const openCv = () => {
    setViewError(null);
    startViewTransition(async () => {
      const result = await getCvSignedUrl();
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        setViewError(result.error ?? "Súbor sa nepodarilo otvoriť.");
      }
    });
  };

  return (
    <Card className="animate-fade-up fade-up-delay-1 mt-6 shadow-soft">
      <CardHeader>
        <CardTitle>Váš životopis</CardTitle>
        <CardDescription>
          {hasCv
            ? "Životopis je nahraný. Môžete ho kedykoľvek nahradiť novším."
            : "Nahrajte životopis (PDF alebo Word) — agent z neho pochopí, čo viete, a nájde ponuky, ktoré vám sadnú."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {hasCv && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2 text-ink">
              <span
                className={`size-2 rounded-full ${hasParsedText ? "bg-primary" : "bg-urgent"}`}
              />
              {hasParsedText
                ? "Text prečítaný — pripravený pre agenta"
                : "Súbor uložený, ale text sa nepodarilo prečítať"}
            </span>
            {updatedAt && (
              <span className="font-mono text-xs text-ink-muted">
                {new Date(updatedAt).toLocaleDateString("sk-SK")}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openCv}
              disabled={isViewPending}
            >
              {isViewPending ? "Otváram…" : "Zobraziť súbor"}
            </Button>
          </div>
        )}

        <form action={formAction} className="grid gap-3">
          <input
            ref={fileInputRef}
            id="cv"
            name="cv"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={hasCv ? "outline" : "default"}
              onClick={() => fileInputRef.current?.click()}
            >
              {hasCv ? "Vybrať nový súbor" : "Vybrať súbor"}
            </Button>
            {fileName && (
              <span className="font-mono text-xs text-ink-muted">
                {fileName}
              </span>
            )}
            {fileName && (
              <Button type="submit" disabled={isPending}>
                {isPending ? "Nahrávam…" : "Nahrať životopis"}
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-muted">
            PDF alebo Word (.docx), max 10 MB. Súbor je uložený súkromne v EÚ —
            nikto okrem vás ho nevidí.
          </p>
        </form>

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.warning && (
          <p role="alert" className="text-sm text-[color:var(--urgent)]">
            {state.warning}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-sm text-primary">
            {state.success}
          </p>
        )}
        {viewError && (
          <p role="alert" className="text-sm text-destructive">
            {viewError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
