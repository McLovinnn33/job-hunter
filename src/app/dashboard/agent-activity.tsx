import { Card, CardContent } from "@/components/ui/card";

/**
 * "Agent je viditeľne živý" (UI_UX.md princíp 3, REVIEW_NOTES Finding 8).
 * Číta zo scrape_runs — zároveň slúži majiteľovi ako prehľad, či nočný
 * beh vôbec prebehol (debug log, ktorý nie je v konzole).
 */

export type ScrapeRunInfo = {
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  postingsFound: number | null;
};

const STATUS_LABEL: Record<ScrapeRunInfo["status"], string> = {
  running: "Prebieha hľadanie…",
  completed: "Hľadanie dokončené",
  failed: "Hľadanie zlyhalo",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(from: string, to: string | null): string | null {
  if (!to) return null;
  const seconds = Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

export function AgentActivity({
  runs,
  freshPostings,
}: {
  runs: ScrapeRunInfo[];
  freshPostings: number;
}) {
  const latest = runs[0];

  return (
    <Card className="animate-fade-up fade-up-delay-3 mt-8 shadow-soft">
      <CardContent className="grid gap-3 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Čo agent robil
          </h2>
          <span className="font-mono text-xs text-ink-muted">
            {freshPostings} platných ponúk v pamäti
          </span>
        </div>

        {!latest ? (
          <p className="text-sm text-ink-muted">
            Agent zatiaľ nespustil žiadne hľadanie.
          </p>
        ) : (
          <ul className="grid gap-2">
            {runs.map((run, i) => {
              const duration = formatDuration(run.startedAt, run.finishedAt);
              return (
                <li
                  key={`${run.startedAt}-${i}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      run.status === "completed"
                        ? "bg-primary"
                        : run.status === "running"
                          ? "status-dot bg-primary"
                          : "bg-destructive"
                    }`}
                  />
                  <span className="text-ink">{STATUS_LABEL[run.status]}</span>
                  <span className="font-mono text-ink-muted">
                    {formatDateTime(run.startedAt)}
                  </span>
                  {run.postingsFound !== null && (
                    <span className="font-mono text-ink-muted">
                      {run.postingsFound} ponúk
                    </span>
                  )}
                  {duration && (
                    <span className="font-mono text-ink-muted">{duration}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs leading-relaxed text-ink-muted">
          Ponuky sa v pamäti držia 48 hodín a potom sa automaticky mažú —
          agent si nebuduje trvalý archív portálu.
        </p>
      </CardContent>
    </Card>
  );
}
