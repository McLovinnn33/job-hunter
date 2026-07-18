import { cn } from "@/lib/utils";

/**
 * Match ring — podpisový prvok aplikácie (UI_UX.md):
 *   plný indigo kruh   = strong_match
 *   čiastočný jantárový = worth_considering
 *   tenký obrys         = stretch
 * Animuje sa RAZ pri prvom zobrazení (žiadne opakovanie), rešpektuje
 * prefers-reduced-motion. Vždy sa páruje s textovým vysvetlením PREČO —
 * to zabezpečuje rodičovský komponent (UI princíp 2).
 */

export type MatchTier = "strong_match" | "worth_considering" | "stretch";

const DEFAULT_SIZE_PX = 48;
const FULL_STROKE_WIDTH = 4;
const THIN_STROKE_WIDTH = 1.5;
// Podiel obvodu, ktorý kruh vyplní
const FRACTION_FULL = 1;
const FRACTION_PARTIAL = 0.6;

const TIER_CONFIG: Record<
  MatchTier,
  { fraction: number; strokeWidth: number; color: string; label: string }
> = {
  strong_match: {
    fraction: FRACTION_FULL,
    strokeWidth: FULL_STROKE_WIDTH,
    color: "var(--primary)",
    label: "Silná zhoda",
  },
  worth_considering: {
    fraction: FRACTION_PARTIAL,
    strokeWidth: FULL_STROKE_WIDTH,
    color: "var(--urgent)",
    label: "Stojí za zváženie",
  },
  stretch: {
    fraction: FRACTION_FULL,
    strokeWidth: THIN_STROKE_WIDTH,
    color: "var(--muted-foreground)",
    label: "Na skúšku",
  },
};

export function MatchRing({
  tier,
  size = DEFAULT_SIZE_PX,
  className,
}: {
  tier: MatchTier;
  size?: number;
  className?: string;
}) {
  const config = TIER_CONFIG[tier];
  const radius = (size - FULL_STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - config.fraction);

  return (
    <svg
      role="img"
      aria-label={`Miera zhody: ${config.label}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0", className)}
    >
      {/* podkladová dráha */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={config.strokeWidth}
      />
      {/* výplň — začína hore (rotácia -90°), kreslí sa raz pri zobrazení */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={config.color}
        strokeWidth={config.strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="match-ring-arc"
        style={
          { "--ring-circumference": circumference } as React.CSSProperties
        }
      />
    </svg>
  );
}
