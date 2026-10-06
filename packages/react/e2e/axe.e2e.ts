// axe-core over every story in the built Storybook, in light and dark and
// left to right (English) and right to left (Arabic). The list of stories
// is the build's own index.json, so a new story is swept without being
// named here. A serious or critical violation fails the test; moderate
// and minor ones are the story frame's (no main landmark, no first-level
// heading) and are not counted. Each test records how many stories it
// swept as an annotation, which scripts/badges.mjs reads from the report.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type Entry = { id: string; type: string };

const MODES = [
  { theme: "light", dir: "ltr", lang: "en" },
  { theme: "dark", dir: "ltr", lang: "en" },
  { theme: "light", dir: "rtl", lang: "ar" },
  { theme: "dark", dir: "rtl", lang: "ar" },
] as const;

async function storyIds(page: Page) {
  const response = await page.request.get("/index.json");
  expect(response.ok(), "index.json of the built Storybook").toBe(true);
  const index = (await response.json()) as { entries: Record<string, Entry> };
  return Object.values(index.entries)
    .filter((e) => e.type === "story")
    .map((e) => e.id);
}

for (const mode of MODES) {
  const globals = `theme:${mode.theme};dir:${mode.dir};lang:${mode.lang}`;
  test(`no serious or critical axe violations in any story (${mode.theme}, ${mode.dir})`, async ({ page }) => {
    test.setTimeout(15 * 60_000);
    const ids = await storyIds(page);
    expect(ids.length).toBeGreaterThan(0);
    const found: string[] = [];
    for (const id of ids) {
      await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=${globals}`);
      await expect(page.locator("#storybook-root > *").first()).toBeAttached();
      // The decorator applies the globals to the root element; a story that
      // threw shows Storybook's error display instead of itself.
      const root = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
        error: document.body.classList.contains("sb-show-errordisplay"),
      }));
      expect(root, id).toEqual({ theme: mode.theme, dir: mode.dir, lang: mode.lang, error: false });
      // Colours are read once the entrance animations (a sheet sliding in, a
      // toast fading in) have finished: halfway through a fade the text is
      // still translucent. Endless ones, such as a spinner, are not waited for.
      await page.evaluate(async () => {
        await document.fonts.ready;
        const finite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
        await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
      });
      const results = await new AxeBuilder({ page }).analyze();
      for (const v of results.violations) {
        if (v.impact === "serious" || v.impact === "critical") found.push(`${id}: ${v.id} (${v.impact}, ${v.nodes.length} node(s))`);
      }
    }
    test.info().annotations.push({ type: "axe-sweep", description: JSON.stringify({ ...mode, stories: ids.length, serious: found.length }) });
    expect(found).toEqual([]);
  });
}
