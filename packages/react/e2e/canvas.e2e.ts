// The canvases in a real browser, against the built stories: their
// bitmap follows their box, including when the box changes size with
// nothing new to draw, at device pixel ratio 1 and 2; and the heatmap's
// time runs in the reading direction of the locale.
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The canvas's bitmap against its box times the device pixel ratio. */
const fit = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio;
    return {
      width: canvas.width,
      wanted: Math.round(canvas.clientWidth * dpr),
      height: canvas.height,
      wantedHeight: Math.round(canvas.clientHeight * dpr),
    };
  });

for (const dpr of [1, 2]) {
  test.describe(`at device pixel ratio ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });
    for (const [name, id, selector] of [
      ["Heatmap", "data-heatmap--liquidity", ".stoa-heatmap__canvas"],
      ["Ladder", "data-ladder--static", ".stoa-ladder__canvas"],
    ] as const) {
      test(`${name} refits its canvas when its box changes size, with nothing new to draw`, async ({ page }) => {
        await page.goto(story(id));
        await expect.poll(async () => {
          const f = await fit(page, selector);
          return f.width === f.wanted && f.height === f.wantedHeight;
        }).toBe(true);
        const before = await fit(page, selector);
        // The box narrows; the story draws nothing new.
        await page.locator("#storybook-root").evaluate((el) => {
          (el as HTMLElement).style.inlineSize = "320px";
        });
        await expect.poll(async () => (await fit(page, selector)).wanted).not.toBe(before.wanted);
        // Within a second: a Ladder redraws on its own once its throttled
        // text alternative catches up, five seconds later.
        await expect
          .poll(
            async () => {
              const f = await fit(page, selector);
              return f.width === f.wanted && f.height === f.wantedHeight;
            },
            { timeout: 1000 },
          )
          .toBe(true);
      });
    }
  });
}

/** Whether the canvas has ink (anything but the empty middle's colour) a
 * little in from its left and right edges, at mid height. */
const ink = (page: Page) =>
  page.locator(".stoa-heatmap__canvas").evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const y = Math.round(canvas.height / 2);
    const at = (x: number) => [...ctx.getImageData(Math.round(x), y, 1, 1).data].join(",");
    const empty = at(canvas.width / 2);
    return { left: at(canvas.width * 0.02) !== empty, right: at(canvas.width * 0.98) !== empty };
  });

test("Heatmap's newest column is at the right in a left-to-right locale", async ({ page }) => {
  await page.goto(story("data-heatmap--time-direction", "lang:en"));
  await expect.poll(() => ink(page)).toEqual({ left: false, right: true });
});

test("Heatmap's newest column is at the left in a right-to-left locale, as the TimeSlider's newest end is", async ({ page }) => {
  await page.goto(story("data-heatmap--time-direction", "dir:rtl;lang:ar"));
  await expect.poll(() => ink(page)).toEqual({ left: true, right: false });
});
