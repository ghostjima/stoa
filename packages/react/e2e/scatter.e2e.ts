// ScatterChart in a real browser, against the built stories: the canvas
// draws its points, the x axis is mirrored in a right-to-left locale, the
// keyboard walks the points and the live region reads them, the pointer
// picks the point under it, and the points grow with the density.
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=data-scatterchart--${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The canvas's coloured ink: pixels whose channels differ by more than
 * 60 of 255, which the toned points are and the grey grid, ticks and
 * neutral points are not; their count and their centre, in CSS pixels
 * from the canvas's top left. */
const ink = (page: Page) =>
  page.locator(".stoa-scatter__canvas").evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 60) {
        count++;
        sx += (i / 4) % canvas.width;
        sy += Math.floor(i / 4 / canvas.width);
      }
    }
    const dpr = canvas.width / canvas.clientWidth;
    return { count, x: count ? sx / count / dpr : 0, y: count ? sy / count / dpr : 0, width: canvas.clientWidth };
  });

const status = (page: Page) => page.locator(".stoa-scatter").getByRole("status");

test("draws the peer map's points on a canvas that fits its box", async ({ page }) => {
  await page.goto(story("peer-map"));
  await expect.poll(async () => (await ink(page)).count).toBeGreaterThan(50);
  const fit = await page.locator(".stoa-scatter__canvas").evaluate((el) => {
    const c = el as HTMLCanvasElement;
    return [c.width, Math.round(c.clientWidth * devicePixelRatio), c.height, Math.round(c.clientHeight * devicePixelRatio)];
  });
  expect(fit[0]).toBe(fit[1]);
  expect(fit[2]).toBe(fit[3]);
});

test("puts the far end of the x axis on the right left to right, and on the left right to left", async ({ page }) => {
  await page.goto(story("x-direction", "lang:en"));
  await expect.poll(async () => (await ink(page)).count).toBeGreaterThan(0);
  const ltr = await ink(page);
  expect(ltr.x).toBeGreaterThan(ltr.width * 0.75);
  await page.goto(story("x-direction", "dir:rtl;lang:ar"));
  await expect.poll(async () => (await ink(page)).count).toBeGreaterThan(0);
  const rtl = await ink(page);
  expect(rtl.x).toBeLessThan(rtl.width * 0.25);
});

for (const [name, globals] of [
  ["left to right", "lang:en"],
  ["right to left", "dir:rtl;lang:ar"],
] as const) {
  test(`picks the point under the pointer and reads it, ${name}`, async ({ page }) => {
    await page.goto(story("x-direction", globals));
    await expect.poll(async () => (await ink(page)).count).toBeGreaterThan(0);
    const point = await ink(page);
    const box = (await page.locator(".stoa-scatter__canvas").boundingBox())!;
    await page.mouse.move(box.x + point.x + 2, box.y + point.y - 2);
    await expect(status(page)).toContainText("RU000A1F3");
    // Away from every point, the reading clears.
    await page.mouse.move(box.x + box.width / 2, box.y + 4);
    await expect(status(page)).toHaveText("");
  });
}

test("walks the points with the keyboard, reads each one, and keeps the focus on the chart", async ({ page }) => {
  await page.goto(story("peer-map"));
  const chart = page.getByRole("application", { name: "Peers by rating and duration" });
  await expect.poll(async () => (await ink(page)).count).toBeGreaterThan(0);
  const before = await page.locator(".stoa-scatter__canvas").evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await chart.focus();
  await page.keyboard.press("Home");
  await expect(status(page)).toHaveText(/^RU000A\w+ · [AB+-]+ · 0\.\d\d years \(Other issue\), point 1 of \d+$/);
  const first = await status(page).textContent();
  // The total is the story's count of points, as the summary gives it.
  const total = /of (\d+)$/.exec(first!)![1];
  await expect(page.locator(".stoa-scatter figcaption")).toContainText(`Points: ${total};`);
  // The active point is drawn with its ring and label.
  expect(await page.locator(".stoa-scatter__canvas").evaluate((el) => (el as HTMLCanvasElement).toDataURL())).not.toBe(before);
  await page.keyboard.press("ArrowRight");
  await expect(status(page)).toHaveText(new RegExp(`point 2 of ${total}$`));
  await page.keyboard.press("ArrowLeft");
  await expect(status(page)).toHaveText(first!);
  await page.keyboard.press("End");
  await expect(status(page)).toHaveText(new RegExp(`point ${total} of ${total}$`));
  await page.keyboard.press("ArrowUp");
  await expect(status(page)).not.toHaveText(new RegExp(`point ${total} of ${total}$`));
  await page.keyboard.press("Escape");
  await expect(status(page)).toHaveText("");
  expect(await chart.evaluate((el) => el === document.activeElement)).toBe(true);
});

test("is one tab stop: Tab reaches the chart and leaves it for the data table's disclosure", async ({ page }) => {
  await page.goto(story("peer-map"));
  // Start from the axis name just before the drawing, as a reader would.
  await page.locator(".stoa-scatter .stoa-chart__axis-label").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("application")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Tab");
  await expect(page.locator(".stoa-chart__data summary")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("application")).toBeFocused();
});

test("draws larger points in a roomier density, and redraws when the density changes", async ({ page }) => {
  await page.goto(story("many-points", "density:compact"));
  await expect.poll(async () => (await ink(page)).count).toBeGreaterThan(0);
  const compact = (await ink(page)).count;
  await page.evaluate(() => {
    document.documentElement.dataset.density = "comfortable";
  });
  // A radius about 1.5 times as large covers about twice the area.
  await expect.poll(async () => (await ink(page)).count).toBeGreaterThan(compact * 1.5);
});

test("an empty chart says so and is not a tab stop", async ({ page }) => {
  await page.goto(story("empty"));
  await expect(page.locator(".stoa-scatter figcaption")).toHaveText("No data to show.");
  await expect(page.getByRole("application")).toHaveCount(0);
});

// The data table on a phone: its column and row headers take more lines
// rather than widen the table, so at 375 px it fits its box, needs no
// sideways scroll and is not a scroll region, in both directions.
for (const [name, globals] of [
  ["left to right", "lang:en"],
  ["right to left", "dir:rtl;lang:ar"],
] as const)
  test(`the data table fits a 375 px phone without scrolling sideways, ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(story("peer-map", globals));
    await page.locator(".stoa-chart__data summary").click();
    const region = page.locator(".stoa-chart__data .stoa-table-region");
    await expect(region.locator("tbody tr").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const fit = await region.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(fit.scroll, `table ${fit.scroll} px in a box of ${fit.client} px`).toBeLessThanOrEqual(fit.client);
    await expect(region).not.toHaveAttribute("role", "region");
    await expect(region).not.toHaveAttribute("tabindex", "0");
    // It fits because headers wrap: some header's text takes two lines.
    const lines = await region.locator("th").evaluateAll((ths) =>
      Math.max(
        ...ths.map((th) => {
          const range = document.createRange();
          range.selectNodeContents(th);
          return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
        }),
      ),
    );
    expect(lines).toBeGreaterThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
