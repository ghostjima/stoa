// Toast width in a real browser, against the built stories: a toast fits
// the region at the end corner of the viewport on a phone, and keeps its
// width on a desktop.
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The drawn width of a toast on a desktop: 384 px of content, 12 px of
 * padding on each side, a 1 px border at the end and a 4 px tone bar at
 * the start. */
const DESKTOP_WIDTH = 413;

for (const mode of [
  { name: "left to right", globals: "" },
  { name: "right to left", globals: "dir:rtl;lang:ar" },
]) {
  for (const width of [375, 1280]) {
    test(`at ${width} px every toast fits inside its region and the viewport (${mode.name})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(story("feedback-feedback-and-layout--toast-tones", mode.globals));
      const toasts = page.locator(".stoa-toast");
      await expect(toasts).toHaveCount(4);
      const boxes = await page.evaluate(() => {
        const region = document.querySelector(".stoa-toast-region")!.getBoundingClientRect();
        return {
          viewport: document.documentElement.clientWidth,
          region: { left: region.left, right: region.right, width: region.width },
          toasts: [...document.querySelectorAll(".stoa-toast")].map((el) => {
            const box = el.getBoundingClientRect();
            return { left: box.left, right: box.right, width: box.width };
          }),
        };
      });
      for (const toast of boxes.toasts) {
        expect(toast.left).toBeGreaterThanOrEqual(boxes.region.left - 0.5);
        expect(toast.right).toBeLessThanOrEqual(boxes.region.right + 0.5);
        expect(toast.left).toBeGreaterThanOrEqual(0);
        expect(toast.right).toBeLessThanOrEqual(boxes.viewport);
      }
      if (width === 375) {
        // On a phone the toast takes the region's width: the viewport less
        // a 16 px margin on each side.
        expect(boxes.region.width).toBe(375 - 2 * 16);
        for (const toast of boxes.toasts) expect(Math.abs(toast.width - boxes.region.width)).toBeLessThanOrEqual(0.5);
      } else {
        for (const toast of boxes.toasts) expect(Math.abs(toast.width - DESKTOP_WIDTH)).toBeLessThanOrEqual(0.5);
      }
      // Nothing scrolls the page sideways.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
}
