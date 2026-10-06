// Measures the DataGrid's 50,000-row story in Chromium; the numbers in
// docs/components/data-grid.md come from it. Serve a Storybook build
// first, then, from packages/react:
//
//   node e2e/data-grid.measure.mjs [base-url] [runs]
//
// base-url defaults to http://127.0.0.1:6105, runs to 3. What it reports:
// - firstRenderMs: from the story's render (its performance mark) to the
//   first animation frame with grid cells in the DOM; median, min, max.
// - domNodesInGrid: elements inside the grid element after the first
//   render and after the scroll below.
// - scrollFrameMs: intervals between animation frames while the grid is
//   scrolled 56 px down per frame for 300 frames, then 24 px sideways per
//   frame for 120 frames; percentiles over every run's intervals pooled.
//   At 60 Hz an interval above 16.7 ms is a late frame.
// - move1000: ArrowDown pressed 1,000 times from row 1, column 4, each
//   press dispatched after the previous one's frame; syncPerKeyMs is the
//   time from dispatch until the next task (the handler, React's render
//   and commit, and focus), pooled; landedRowIndex is the focused row's
//   aria-rowindex at the end, per run (1,002 is right).
// - burst1000: the same 1,000 presses with only a task between them, no
//   frame: total time, and how far focus moved.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:6105";
const RUNS = Number(process.argv[3] ?? 3);
const url = `${base}/iframe.html?id=data-datagrid--fifty-thousand-rows&viewMode=story`;
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
const r1 = (x) => Math.round(x * 10) / 10;

const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
const version = browser.version();
const runs = [];
for (let run = 0; run < RUNS; run++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    const tick = () => {
      if (document.querySelector('[role="grid"] [role="gridcell"]')) requestAnimationFrame(() => (window.__firstFrame = performance.now()));
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__firstFrame !== undefined, null, { timeout: 120_000 });
  const first = await page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]');
    const mark = performance.getEntriesByName("stoa-data-grid-render")[0];
    return {
      ms: window.__firstFrame - mark.startTime,
      nodes: grid.querySelectorAll("*").length + 1,
      heapMiB: performance.memory ? performance.memory.usedJSHeapSize / 2 ** 20 : NaN,
      size: `${grid.clientWidth}x${grid.clientHeight}`,
    };
  });
  const scroll = await page.evaluate(async () => {
    const grid = document.querySelector('[role="grid"]');
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    await frame();
    const deltas = [];
    let last = performance.now();
    const step = async (apply) => {
      apply();
      await frame();
      const now = performance.now();
      deltas.push(now - last);
      last = now;
    };
    for (let i = 0; i < 300; i++) await step(() => (grid.scrollTop += 56));
    for (let i = 0; i < 120; i++) await step(() => (grid.scrollLeft += 24));
    await frame();
    return { deltas, nodes: grid.querySelectorAll("*").length + 1, rows: grid.querySelectorAll('[role="row"]').length };
  });
  const move = await page.evaluate(async () => {
    const grid = document.querySelector('[role="grid"]');
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const channel = new MessageChannel();
    const task = () => new Promise((r) => { channel.port1.onmessage = () => r(); channel.port2.postMessage(0); });
    const press = () => {
      document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      document.activeElement.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowDown", bubbles: true, cancelable: true }));
    };
    const rowOfFocus = () => Number(document.activeElement.closest('[role="row"]')?.getAttribute("aria-rowindex"));
    grid.scrollTop = 0;
    grid.scrollLeft = 0;
    await frame();
    await frame();
    grid.querySelector('[role="row"][aria-rowindex="2"]').querySelectorAll('[role="gridcell"], [role="rowheader"]')[3].click();
    await frame();
    const sync = [];
    for (let i = 0; i < 1000; i++) {
      const t = performance.now();
      press();
      await task();
      sync.push(performance.now() - t);
      await frame();
    }
    await frame();
    const landed = rowOfFocus();
    const start = rowOfFocus();
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      press();
      await task();
    }
    const burstMs = performance.now() - t0;
    await frame();
    await frame();
    return { sync, landed, burstMs, burstMoved: rowOfFocus() - start };
  });
  runs.push({ first, scroll, move });
  await page.close();
}
await browser.close();

const deltas = runs.flatMap((r) => r.scroll.deltas);
const sync = runs.flatMap((r) => r.move.sync);
const firsts = runs.map((r) => r.first.ms);
console.log(
  JSON.stringify(
    {
      url,
      runs: RUNS,
      chromium: version,
      gridSize: runs[0].first.size,
      firstRenderMs: { median: r1(pct(firsts, 50)), min: r1(Math.min(...firsts)), max: r1(Math.max(...firsts)) },
      domNodesInGrid: { firstRender: pct(runs.map((r) => r.first.nodes), 50), afterScroll: pct(runs.map((r) => r.scroll.nodes), 50) },
      rowsInDomAfterScroll: pct(runs.map((r) => r.scroll.rows), 50),
      jsHeapMiB: r1(pct(runs.map((r) => r.first.heapMiB), 50)),
      scrollFrameMs: {
        frames: deltas.length,
        p50: r1(pct(deltas, 50)),
        p95: r1(pct(deltas, 95)),
        p99: r1(pct(deltas, 99)),
        max: r1(Math.max(...deltas)),
        over20ms: deltas.filter((d) => d > 20).length,
      },
      move1000: {
        syncPerKeyMs: { p50: r1(pct(sync, 50)), p95: r1(pct(sync, 95)), max: r1(Math.max(...sync)) },
        syncTotalMsMedian: r1(pct(runs.map((r) => r.move.sync.reduce((a, b) => a + b, 0)), 50)),
        landedRowIndex: runs.map((r) => r.move.landed),
      },
      burst1000: { totalMsMedian: r1(pct(runs.map((r) => r.move.burstMs), 50)), rowsMoved: runs.map((r) => r.move.burstMoved) },
    },
    null,
    1,
  ),
);
