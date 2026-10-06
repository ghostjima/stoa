// Screenshot the preview frames, for a pull request or a record of
// how a snapshot looked. Needs a dev server already running:
//
//   pnpm --filter playground dev
//   node apps/playground/scripts/screenshot.mjs [url] [out]
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://127.0.0.1:5173/";
const out = process.argv[3] ?? "apps/playground/docs/four-frames.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
await page.goto(url, { waitUntil: "networkidle" });
// One stream frame in every canvas, then hold the picture still.
await page.waitForSelector('[data-frame="dark-rtl"] .stoa-table tbody tr');
await page.getByRole("button", { name: "Pause" }).click();
const frames = page.locator(".pg-frames");
await frames.screenshot({ path: out });
await browser.close();
console.log(`${out}: written from ${url}`);
