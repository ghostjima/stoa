import { defineConfig } from "@playwright/test";

// The tests drive the real dev server, because the endpoints under test
// are the dev server's. The port is the tests' own, apart from the
// playground's and the demos' dev servers, so a session running any of
// them is not disturbed and a test never reuses another app's server.
// PLAYGROUND_E2E_PORT moves it.
//
// One test file is about the build instead: csp.spec.ts checks the
// Content Security Policy that only the built page carries, so it runs
// against `vite preview` of a fresh build, on the next port
// (PLAYGROUND_PREVIEW_PORT moves it).
const PORT = Number(process.env.PLAYGROUND_E2E_PORT ?? 5190);
const PREVIEW_PORT = Number(process.env.PLAYGROUND_PREVIEW_PORT ?? PORT + 1);
const BUILD_TESTS = "csp.spec.ts";

// The host is stated, not left to `localhost`: on a runner where
// localhost resolves to ::1 first, the server binds there and the check,
// which is IPv4, never reaches it. The output is piped so that a server
// that fails to start says why in the test log. A dev server already on
// the port is reused outside CI; a preview never is, because it would
// serve whatever build it was started on.
const server = (command: string, port: number, reuseExistingServer: boolean) => ({
  command,
  url: `http://127.0.0.1:${port}`,
  reuseExistingServer,
  timeout: 120_000,
  stdout: "pipe" as const,
  stderr: "pipe" as const,
});

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  timeout: 120_000,
  use: {
    browserName: "chromium",
    // Wide enough for the two frames to sit side by side beside the panel.
    viewport: { width: 1800, height: 1200 },
  },
  projects: [
    { name: "dev", testIgnore: BUILD_TESTS, use: { baseURL: `http://127.0.0.1:${PORT}` } },
    { name: "build", testMatch: BUILD_TESTS, use: { baseURL: `http://127.0.0.1:${PREVIEW_PORT}` } },
  ],
  webServer: [
    server(`pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`, PORT, !process.env.CI),
    server(`pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`, PREVIEW_PORT, false),
  ],
});
