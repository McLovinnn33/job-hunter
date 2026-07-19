/**
 * Centrálny motion systém aplikácie (UI_UX.md — Motion system).
 * KAŽDÁ animácia v aplikácii používa tieto hodnoty — žiadne vlastné
 * easingy/trvania v komponentoch. Prevzaté z Firecrawl design systému,
 * prispôsobené našej identite.
 */

// Jediná povolená easing krivka — plynulá, nie skákavá
export const EASE_SMOOTH = [0.25, 0.1, 0.25, 1] as const;
export const EASE_SMOOTH_CSS = "cubic-bezier(0.25, 0.1, 0.25, 1)";

// Trvania: rýchle interakcie / stredné prechody / pomalé veľké zmeny
export const DURATION_QUICK_MS = 200;
export const DURATION_MODERATE_MS = 500;
export const DURATION_SLOW_MS = 1000;

// Varianty pre motion/react (framer-motion) — na scroll-triggered
// a interaktívne animácie v budúcich moduloch
export const fadeUpVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_MODERATE_MS / 1000,
      ease: EASE_SMOOTH,
    },
  },
} as const;

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION_MODERATE_MS / 1000,
      ease: EASE_SMOOTH,
    },
  },
} as const;
