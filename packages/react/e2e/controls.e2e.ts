// Controls in a real browser, against the built stories: sizes as drawn.
import { expect, test, type Locator } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The left edge of where `part` is drawn in the text of an element's
 * first text node. */
function leftOf(element: Locator, part: string) {
  return element.evaluate((el, wanted) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode()!;
    const at = (node.textContent ?? "").indexOf(wanted);
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + wanted.length);
    return range.getBoundingClientRect().left;
  }, part);
}

test("a Select keeps each option in the order of its own text, in its button and in its list, in both directions of the page", async ({ page }) => {
  for (const globals of ["", "dir:rtl;lang:ar"]) {
    await page.goto(story("controls-playback--select-mixed-directions", globals));
    const value = page.locator(".stoa-select__value");
    await expect(value).toHaveText("1 day");
    expect(await leftOf(value, "1"), globals).toBeLessThan(await leftOf(value, "day"));
    await page.locator(".stoa-select__button").click();
    const week = page.getByRole("option", { name: "1 week" });
    await expect(week).toBeVisible();
    expect(await leftOf(week, "1"), globals).toBeLessThan(await leftOf(week, "week"));
    const months = page.getByRole("option", { name: "3 أشهر" });
    expect(await leftOf(months, "3"), globals).toBeGreaterThan(await leftOf(months, "أشهر"));
    // Every option is still aligned by the page: at the left, or at the
    // right in a right-to-left page.
    for (const option of [week, months]) {
      const box = (await option.boundingBox())!;
      const text = (await option.locator("[dir]").boundingBox())!;
      const fromStart = globals ? box.x + box.width - (text.x + text.width) : text.x - box.x;
      expect(fromStart, globals).toBeLessThan(box.width / 2);
    }
    await page.keyboard.press("Escape");
  }
});

for (const [mode, globals] of [["left to right", ""], ["right to left", "dir:rtl;lang:ar"]] as const) {
  test(`a small Button is as tall as the small ChoiceGroup, Select and FilterChip, and at least 24 px, ${mode}`, async ({ page }) => {
    await page.goto(story("controls-inputs--button-small", globals));
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
    const heights = await page.evaluate(() =>
      [".stoa-button--small", ".stoa-choice-group--small > .stoa-choice", ".stoa-select--small .stoa-select__button", ".stoa-filter-chip--small"].map(
        (selector) => Math.round(document.querySelector(selector)!.getBoundingClientRect().height * 10) / 10,
      ),
    );
    expect(new Set(heights).size, heights.join(", ")).toBe(1);
    expect(heights[0]).toBeGreaterThanOrEqual(24);
    const sizes = await page.evaluate(() =>
      [".stoa-button--small", ".stoa-choice-group--small > .stoa-choice"].map((selector) => getComputedStyle(document.querySelector(selector)!).fontSize),
    );
    expect(sizes[0]).toBe(sizes[1]);
  });
}

for (const [globals, forward, back] of [
  ["lang:en", "ArrowRight", "ArrowLeft"],
  ["dir:rtl;lang:ar", "ArrowLeft", "ArrowRight"],
] as const) {
  test(`a ChoiceGroup is one tab stop on its chosen option, and the arrows move and choose (${globals})`, async ({ page }) => {
    await page.goto(`/iframe.html?id=controls-playback--choices&viewMode=story&globals=${globals}`);
    const group = page.getByRole("radiogroup", { name: "Density" });
    const radio = (name: string) => group.getByRole("radio", { name });
    await expect(radio("regular")).toHaveAttribute("aria-checked", "true");
    // Tab lands on the chosen option, not the first.
    await page.keyboard.press("Tab");
    await expect(radio("regular")).toBeFocused();
    // An arrow moves and chooses, in the reading direction.
    await page.keyboard.press(forward);
    await expect(radio("comfortable")).toBeFocused();
    await expect(radio("comfortable")).toHaveAttribute("aria-checked", "true");
    await expect(radio("regular")).toHaveAttribute("aria-checked", "false");
    // Past the last option it wraps to the first, as a radio group does.
    await page.keyboard.press(forward);
    await expect(radio("compact")).toBeFocused();
    await expect(radio("compact")).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press(back);
    await expect(radio("comfortable")).toHaveAttribute("aria-checked", "true");
    // One tab stop: Tab leaves the group, Shift+Tab comes back to the chosen option.
    await page.keyboard.press("Tab");
    await expect(page.locator(".stoa-select__button")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(radio("comfortable")).toBeFocused();
    // Space on the chosen option keeps it chosen.
    await page.keyboard.press("Space");
    await expect(radio("comfortable")).toHaveAttribute("aria-checked", "true");
  });
}

for (const [globals, stop] of [
  ["lang:en", "Stop"],
  ["dir:rtl;lang:ar", "إيقاف"],
] as const) {
  test(`a Button's shortcut is drawn at the label's inline end, named by the label alone, and announced as aria-keyshortcuts (${globals})`, async ({ page }) => {
    await page.goto(story("controls-inputs--button-shortcuts", globals));
    const button = page.getByRole("button", { name: stop, exact: true });
    await expect(button).toHaveAttribute("aria-keyshortcuts", "S");
    await expect(button).toHaveAccessibleName(stop);
    const label = (await button.locator(".stoa-button__label").boundingBox())!;
    const hint = (await button.locator(".stoa-button__shortcut").boundingBox())!;
    if (globals.includes("rtl")) expect(hint.x + hint.width).toBeLessThanOrEqual(label.x);
    else expect(hint.x).toBeGreaterThanOrEqual(label.x + label.width);
    // Inside the button, which is still at least 24 px tall.
    const box = (await button.boundingBox())!;
    expect(hint.y).toBeGreaterThanOrEqual(box.y);
    expect(hint.y + hint.height).toBeLessThanOrEqual(box.y + box.height);
    expect(box.height).toBeGreaterThanOrEqual(24);
    await expect(page.getByRole("button", { name: /Search|بحث/ })).toHaveAttribute("aria-keyshortcuts", /^(Control|Meta)\+K$/);
  });
}
