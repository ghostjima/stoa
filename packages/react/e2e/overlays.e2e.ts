// Overlays in a real browser, against the built stories.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

for (const theme of ["light", "dark"]) {
  test(`a disabled shortcut's description has enough contrast over a long page, in ${theme}`, async ({ page }) => {
    await page.goto(story("overlays-lists-and-content--shortcuts-over-long-page", `theme:${theme}`));
    const line = page.getByRole("dialog").getByText("Export the view as CSV");
    await expect(line).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    });
    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).include(".stoa-shortcuts").analyze();
    expect(results.violations.map((v) => v.nodes.map((n) => n.target.join(" ")))).toEqual([]);
    // Every line, the disabled one too, was measured rather than left
    // incomplete (axe gives up on a background it cannot work out).
    const measured = results.passes.find((rule) => rule.id === "color-contrast")?.nodes.map((n) => n.target.join(" ")) ?? [];
    expect(measured.some((target) => target.includes("data-disabled"))).toBe(true);
  });
}
