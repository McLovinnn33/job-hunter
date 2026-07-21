/**
 * Jediné miesto pre AI model ID (ADR-006, REVIEW_NOTES Finding 6).
 * Beží LEN "current" modely — Opus/Fable sú vývojárske nástroje, nikdy
 * nie runtime app (AGENTS.md). Overené k 2026-07-20 na docs.claude.com —
 * pri budúcej zmene modelu stačí upraviť tento súbor.
 */

// Kvalita: onboarding chat, cover letter (M12)
export const QUALITY_MODEL = "claude-sonnet-5";

// Vysoký objem: match reasoning (M8), fake detekcia
export const HIGH_VOLUME_MODEL = "claude-haiku-4-5";
