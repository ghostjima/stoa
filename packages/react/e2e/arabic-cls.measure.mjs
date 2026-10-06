// Measures how far a page of Arabic text moves when its font arrives
// late, in Chromium, against a Storybook build: the layout shift of the
// "Layout/Panel > Arabic page" story. Serve a Storybook build first, then,
// from packages/react:
//
//   node e2e/arabic-cls.measure.mjs [base-url] [runs] [delay-ms]
//
// base-url defaults to http://127.0.0.1:6105, runs to 7, delay to 800.
// Each run is a fresh browser context (no cache) at 1280 by 800, device
// pixel ratio 1. The responses for IBM Plex Sans Arabic and Noto Sans
// Arabic are held back by `delay` ms, so the text is first drawn in
// whatever the stacks fall back to and then swapped (Fontsource's faces
// are font-display: swap); the Latin faces arrive at once. What it
// reports, per run and as the median and range over the runs:
// - cls: the largest session window of layout-shift entries without
//   recent input (the web-vitals definition of Cumulative Layout Shift:
//   shifts less than 1 s apart, a window at most 5 s long), over the load
//   and until 1.5 s after every font has loaded.
// - shifts: how many layout-shift entries there were.
// - fallback: the face Chromium drew the first paragraph in before the
//   swap (CSS.getPlatformFontsForNode), to name what was measured.
// It does not measure the Latin faces' swap, a page's own images or
// scripts, or another browser.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:6105";
const RUNS = Number(process.argv[3] ?? 7);
const DELAY = Number(process.argv[4] ?? 800);
const url = `${base}/iframe.html?id=layout-panel--arabic-page&viewMode=story`;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const r4 = (x) => Math.round(x * 10000) / 10000;

const browser = await chromium.launch();
const runs = [];
for (let run = 0; run < RUNS; run++) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route(/(ibm-plex-sans-arabic|noto-sans-arabic).*\.woff2?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, DELAY));
    await route.continue();
  });
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shifts.push({ value: entry.value, at: entry.startTime });
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(url);
  await page.locator(".stoa-panel p").first().waitFor();
  // The face before the swap.
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".stoa-panel p" });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  const fallback = fonts.map((f) => f.familyName).join(" + ");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const shifts = await page.evaluate(() => window.__shifts);
  // Session windows: a gap of 1 s or more, or 5 s of window, starts a new one.
  let best = 0;
  let window = 0;
  let first = -Infinity;
  let last = -Infinity;
  for (const s of shifts) {
    if (s.at - last >= 1000 || s.at - first >= 5000) {
      window = 0;
      first = s.at;
    }
    window += s.value;
    last = s.at;
    best = Math.max(best, window);
  }
  runs.push({ cls: r4(best), shifts: shifts.length, fallback });
  await context.close();
}
await browser.close();
const cls = runs.map((r) => r.cls);
console.log(JSON.stringify({ url, chromium: browser.version(), delayMs: DELAY, runs, median: median(cls), min: Math.min(...cls), max: Math.max(...cls) }, null, 2));
