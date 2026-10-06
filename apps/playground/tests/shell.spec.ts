// The page around the frames: the header stays at the top while the page
// scrolls in PageShell's region under it, and every scrollbar is Stoa's,
// thin and in the scrollbar tokens of its own box's theme.
import { expect, test, type Locator, type Page } from "@playwright/test";

const region = (page: Page) => page.locator(".stoa-page-shell__scroll");

test("the header stays put while the page scrolls in the region under it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const header = page.locator(".stoa-app-header");
  await expect(header).toBeVisible();
  const before = (await header.boundingBox())!;

  // The page is taller than the window, and it is the region that scrolls.
  const sizes = await region(page).evaluate((element) => ({ scroll: element.scrollHeight, client: element.clientHeight }));
  expect(sizes.scroll).toBeGreaterThan(sizes.client);
  await region(page).evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => region(page).evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  const after = (await header.boundingBox())!;
  expect(after.y).toBe(before.y);
  expect(after.height).toBe(before.height);

  // The document itself never scrolls.
  const documentSizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    client: document.documentElement.clientHeight,
    top: document.scrollingElement?.scrollTop ?? 0,
  }));
  expect(documentSizes.scroll).toBeLessThanOrEqual(documentSizes.client);
  expect(documentSizes.top).toBe(0);

  // The region, and with it its scrollbar, starts at the header's bottom
  // edge or below it, and keeps the scrollbar's lane whether or not it
  // overflows.
  const box = (await region(page).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(after.y + after.height - 0.5);
  await expect(region(page)).toHaveCSS("scrollbar-gutter", "stable");
  await expect(page.locator(".pg-side")).toHaveCSS("scrollbar-gutter", "stable");
});

test("the side panel fits the region under the header, not the window", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const side = page.locator(".pg-side");
  await region(page).evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  const area = (await region(page).boundingBox())!;
  const panel = (await side.boundingBox())!;
  // Sticky inside the region: still wholly inside it after a scroll.
  expect(panel.y).toBeGreaterThanOrEqual(area.y);
  expect(panel.y + panel.height).toBeLessThanOrEqual(area.y + area.height + 0.5);
});

/** The scrollbar colours a box resolves to, and the scrollbar tokens of
 * that box's theme as custom properties on the same box. */
async function scrollbarOf(box: Locator) {
  return box.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.scrollbarColor,
      width: style.scrollbarWidth,
      tokens: `${style.getPropertyValue("--stoa-color-scrollbar-thumb").trim()} ${style.getPropertyValue("--stoa-color-scrollbar-track").trim()}`,
    };
  });
}

test("every scrollbar is thin and in the scrollbar tokens of its own theme", async ({ page }) => {
  await page.goto("/");
  const darkFrame = page.locator('[data-frame="dark-rtl"]');
  const boxes = {
    page: region(page),
    side: page.locator(".pg-side"),
    darkFrame,
    // A scrolling box inside the dark frame: the trades tape's region.
    insideDarkFrame: darkFrame.locator(".stoa-table-region").first(),
  };
  const found: Record<string, Awaited<ReturnType<typeof scrollbarOf>>> = {};
  for (const [name, box] of Object.entries(boxes)) {
    found[name] = await scrollbarOf(box);
    expect(found[name]!.width, name).toBe("thin");
    expect(found[name]!.color, name).toBe(found[name]!.tokens);
  }
  // The chrome follows the system here (light): the dark frame draws its
  // own, darker thumb, not the page's.
  expect(found.insideDarkFrame!.color).not.toBe(found.page!.color);
  expect(found.side!.color).toBe(found.page!.color);

  // With the chrome set to dark, the page's scrollbars take the dark
  // tokens, the same ones the dark frame resolves to.
  await page.getByRole("radiogroup", { name: "Playground theme" }).getByRole("radio", { name: "Dark" }).click();
  await expect.poll(async () => (await scrollbarOf(region(page))).color).toBe(found.darkFrame!.color);
  expect((await scrollbarOf(page.locator(".pg-side"))).color).toBe(found.darkFrame!.color);
  await page.getByRole("radiogroup", { name: "Playground theme" }).getByRole("radio", { name: "System" }).click();
});
