// LogView in a real browser, against the built stories: it follows new
// lines while the reader is at the end, stops when the reader scrolls up
// and offers a way back; long lines wrap, so an Arabic line is never cut
// at its start.
import { expect, test, type Locator } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

const atEnd = (region: Locator) => region.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight < 2);

for (const [globals, add, jump] of [
  ["lang:en", "Add a line", "Jump to latest"],
  ["dir:rtl;lang:ar", "أضف سطرًا", "الانتقال إلى الأحدث"],
] as const) {
  test(`a log follows new lines at its end, stops when scrolled up, and jumps back (${globals})`, async ({ page }) => {
    await page.goto(story("overlays-lists-and-content--log-follow", globals));
    const region = page.locator(".stoa-code__scroll");
    const lines = page.locator(".stoa-code__line");
    await expect(lines).toHaveCount(30);
    // It opens at its newest line, and keeps the newest in view.
    await expect.poll(() => atEnd(region)).toBe(true);
    await page.getByRole("button", { name: add }).click();
    await expect(lines).toHaveCount(31);
    await expect.poll(() => atEnd(region)).toBe(true);
    await expect(page.getByRole("button", { name: jump })).toHaveCount(0);
    // Scrolled up, it stays where the reader is, and offers the way back.
    await region.evaluate((el) => el.scrollTo({ top: 0 }));
    await expect(page.getByRole("button", { name: jump })).toBeVisible();
    await page.getByRole("button", { name: add }).click();
    await expect(lines).toHaveCount(32);
    expect(await region.evaluate((el) => el.scrollTop)).toBe(0);
    // The way back scrolls to the end and gives focus to the log, as the
    // control that had it goes away.
    await page.getByRole("button", { name: jump }).click();
    await expect.poll(() => atEnd(region)).toBe(true);
    await expect(page.getByRole("button", { name: jump })).toHaveCount(0);
    await expect(region).toBeFocused();
    // Back at the end, it follows again.
    await page.getByRole("button", { name: add }).click();
    await expect(lines).toHaveCount(33);
    await expect.poll(() => atEnd(region)).toBe(true);
  });
}

for (const globals of ["lang:en", "dir:rtl;lang:ar"]) {
  test(`long lines wrap inside the log, and an Arabic message shows its first word (${globals})`, async ({ page }) => {
    await page.goto(story("overlays-lists-and-content--log-long-lines", globals));
    const region = page.locator(".stoa-code__scroll");
    await expect(page.locator(".stoa-code__line")).toHaveCount(3);
    // Nothing runs off the side.
    expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    // The first word of the Arabic message is drawn inside the log's box.
    const box = (await region.boundingBox())!;
    const first = await page.locator(".stoa-code__message").nth(1).evaluate((el) => {
      const text = el.firstChild as Text;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, text.data.indexOf(" "));
      const r = range.getBoundingClientRect();
      return { left: r.left, right: r.right };
    });
    expect(first.left).toBeGreaterThanOrEqual(box.x);
    expect(first.right).toBeLessThanOrEqual(box.x + box.width);
  });
}
