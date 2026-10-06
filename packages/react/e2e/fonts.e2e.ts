// Which face the browser really draws Stoa's text in, against the built
// stories: read from Chromium's own record of the fonts used for a node
// (CSS.getPlatformFontsForNode), not from the CSS that asks for them.
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

type PlatformFont = { familyName: string; isCustomFont: boolean; glyphCount: number };

/** The fonts drawn for each element that matches `selector`, with its
 * text. */
async function platformFonts(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });
  const out: { text: string; fonts: PlatformFont[] }[] = [];
  for (const nodeId of nodeIds) {
    const { fonts } = (await cdp.send("CSS.getPlatformFontsForNode", { nodeId })) as { fonts: PlatformFont[] };
    const { object } = await cdp.send("DOM.resolveNode", { nodeId });
    const text = await cdp.send("Runtime.callFunctionOn", { objectId: object.objectId!, functionDeclaration: "function () { return this.textContent; }", returnByValue: true });
    out.push({ text: String(text.result.value), fonts });
  }
  await cdp.detach();
  return out;
}

/** Opens a story as an application that loads Stoa's Latin faces and IBM
 * Plex Sans Arabic, but not Noto Sans Arabic. */
async function withoutNoto(page: Page, id: string, globals: string) {
  await page.route(/noto-sans-arabic/, (route) => route.abort());
  await page.goto(story(id, globals));
  await page.evaluate(() => document.fonts.ready);
}

const ARABIC = /[؀-ۿ]/;

for (const [name, id, selector] of [
  ["LogView's lines", "overlays-lists-and-content--log-arabic", ".stoa-code__line bdi"],
  ["ProgressBar's value text", "feedback-feedback-and-layout--progress-bytes", ".stoa-progress__value"],
  ["a NumberField's Arabic-Indic digits", "controls-form--number-field-steps", ".stoa-number__input"],
] as const) {
  test(`without Noto Sans Arabic, ${name} in Arabic are drawn in a loaded face, never a system fallback`, async ({ page }) => {
    await withoutNoto(page, id, "dir:rtl;lang:ar");
    await page.locator(selector).first().waitFor();
    const nodes = (await platformFonts(page, selector)).filter((n) => ARABIC.test(n.text) || n.text === "");
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.fonts.filter((f) => !f.isCustomFont).map((f) => f.familyName), node.text).toEqual([]);
    }
  });
}

test("words are set in the sans face: LogView's message, ProgressBar's value text, StatBar's labels", async ({ page }) => {
  const family = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);
  await page.goto(story("overlays-lists-and-content--log-mixed", "lang:ar;dir:rtl"));
  expect(await family(".stoa-code__message")).toMatch(/^"IBM Plex Sans"/);
  expect(await family(".stoa-code__time")).toMatch(/^"IBM Plex Mono"/);
  await page.goto(story("feedback-feedback-and-layout--progress-bytes", "lang:ar;dir:rtl"));
  expect(await family(".stoa-progress__value")).toMatch(/^"IBM Plex Sans"/);
  await page.goto(story("controls-playback--counters"));
  expect(await family(".stoa-statbar dt")).toMatch(/^"IBM Plex Sans"/);
  expect(await family(".stoa-statbar dd")).toMatch(/^"IBM Plex Mono"/);
});

test("Arabic text drawn before IBM Plex Sans Arabic arrives takes the same lines as after it, where a scaled fallback face is installed", async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/(ibm-plex-sans-arabic|noto-sans-arabic).*\.woff2?$/, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(story("layout-panel--arabic-page"));
  const paragraphs = page.locator(".stoa-panel p");
  await paragraphs.first().waitFor();
  const before = await platformFonts(page, ".stoa-panel p");
  const boxes = () => paragraphs.evaluateAll((ps) => ps.map((p) => Math.round(p.getBoundingClientRect().height)));
  const heights = await boxes();
  release();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => (await platformFonts(page, ".stoa-panel p"))[0]!.fonts.some((f) => f.familyName === "IBM Plex Sans Arabic")).toBe(true);
  // Only where the system has a face Stoa's fallbacks scale (Tahoma on
  // Windows and macOS, Geeza Pro on Apple systems); elsewhere the text
  // falls to the system's own face, which nothing scales.
  const scaled = before[0]!.fonts.some((f) => f.familyName === "Tahoma" || f.familyName === "Geeza Pro");
  if (scaled) expect(await boxes()).toEqual(heights);
});
