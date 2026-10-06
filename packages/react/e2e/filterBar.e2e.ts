// FilterBar in a real browser, against the built stories: on a phone the
// chip groups fold into a Filters button that opens them in a sheet, and
// the focus comes back to it; on a wider screen the groups are in view
// and Clear all leaves the focus in the search box.
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=controls-filterbar--${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

for (const [globals, words] of [
  ["lang:en", { filters: "Filters", fixed: /^Fixed/, show: /^Show results/, results: "Bonds" }],
  ["dir:rtl;lang:ar", { filters: "عوامل التصفية", fixed: /^ثابتة/, show: /^عرض النتائج/, results: "السندات" }],
] as const) {
  test(`on a phone the groups fold into a Filters button that opens them in a sheet, and the focus comes back to it (${globals})`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto(story("default", globals));
    const bar = page.getByRole("search");
    await expect(bar.getByRole("searchbox")).toBeVisible();
    // The inline groups are out of the page; the button stands in for them.
    await expect(bar.getByRole("toolbar")).toHaveCount(0);
    const open = bar.getByRole("button", { name: words.filters, exact: true });
    await expect(open).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await open.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: words.filters });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("toolbar")).toHaveCount(3);
    await sheet.getByRole("button", { name: words.fixed }).click();
    await expect(sheet.getByRole("button", { name: words.fixed })).toHaveAttribute("aria-pressed", "true");
    // The button now says one chip is on.
    await sheet.getByRole("button", { name: words.show }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("button", { name: new RegExp(`^${words.filters}`) })).toBeFocused();
    await expect(page.getByRole("listbox", { name: words.results })).toBeVisible();
  });
}

test("on a wider screen the groups are in view, and Clear all from the keyboard leaves the focus in the search box", async ({ page }) => {
  await page.goto(story("active"));
  const bar = page.getByRole("search", { name: "Bond filters" });
  await expect(bar.getByRole("toolbar")).toHaveCount(3);
  await expect(bar.getByRole("button", { name: /^Filters/ })).toBeHidden();
  const clear = bar.getByRole("button", { name: "Clear all" });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(clear).toHaveCount(0);
  await expect(bar.getByRole("searchbox", { name: "Find a bond" })).toBeFocused();
  await expect(bar.getByRole("searchbox", { name: "Find a bond" })).toHaveValue("");
  await expect(bar.getByRole("button", { pressed: true })).toHaveCount(0);
});

test("when nothing matches, the empty state takes the results' place, and its Clear all brings them back", async ({ page }) => {
  await page.goto(story("no-matches"));
  await expect(page.getByText("Nothing matches the filters.")).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  const clear = page.locator(".stoa-empty-state").getByRole("button", { name: "Clear all" });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox", { name: "Bonds" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Find a bond" })).toBeFocused();
  await expect(page.locator(".stoa-filter-bar__count")).toHaveText("6 of 6 shown");
});
