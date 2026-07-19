"use client";

import { motion, useReducedMotion } from "motion/react";
import { fadeUpVariants } from "@/lib/motion";

/**
 * Fade-up vstupná animácia pre sekcie/karty (UI_UX.md motion system).
 * Spustí sa raz, keď prvok vstúpi do viewportu. Pri prefers-reduced-motion
 * sa obsah zobrazí bez pohybu.
 *
 * Pre statické vstupy pri načítaní stránky preferuj CSS triedu
 * `animate-fade-up` (nevyžaduje client component) — tento wrapper je na
 * scroll-triggered a interaktívne prípady.
 */
export function FadeUp({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUpVariants}
      transition={{ delay: delayMs / 1000 }}
    >
      {children}
    </motion.div>
  );
}
