import { defineConfig } from "vitest/config";

// Unit tests only, in the app and in its dev-server plugin; tests/ holds the
// Playwright smoke test, which needs a browser and a dev server and runs
// from `playwright test` (`pnpm test:e2e`).
export default defineConfig({
  test: { include: ["src/**/*.test.ts", "server/**/*.test.ts"] },
});
