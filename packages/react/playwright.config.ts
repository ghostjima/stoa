import { defineConfig } from "@playwright/test";

// Browser tests against a built Storybook (`pnpm exec storybook build`
// at the repository root writes storybook-static/). The build is served
// as static files; a server already listening on the port is reused, so
// a build served elsewhere can be pointed at with STORYBOOK_PORT.
// The files are named *.e2e.ts so that Vitest does not collect them.
const PORT = Number(process.env.STORYBOOK_PORT ?? 6105);
const DIR = process.env.STORYBOOK_DIR ?? "../../storybook-static";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: "chromium",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory ${DIR}`,
    url: `http://127.0.0.1:${PORT}/iframe.html`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
