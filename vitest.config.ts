import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Vitest — testovací rámec (ROADMAP.md Part C, layer 1).
 * Testujeme LOGIKU, ktorú je drahé pokaziť (hash dedup, expirácia,
 * parsovanie), nie všetko. `@/` alias musí sedieť s tsconfig.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // "server-only" je iba strážca pre Next.js bundler; v testoch ho
      // nahradíme prázdnym modulom, aby sa serverové moduly dali testovať.
      "server-only": resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
});
