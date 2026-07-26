import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Vitest — testovací rámec (ROADMAP.md Part C, layer 1).
 * Testujeme LOGIKU, ktorú je drahé pokaziť (hash dedup, expirácia,
 * parsovanie), nie všetko. `@/` alias musí sedieť s tsconfig.
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
});
