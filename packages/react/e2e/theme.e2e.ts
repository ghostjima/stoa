// The theme reaches what the browser draws itself: native controls and
// scrollbars follow color-scheme, in a real browser against the built
// stories.
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

const scheme = (page: Page, selector = ":root") => page.locator(selector).first().evaluate((el) => getComputedStyle(el).colorScheme);

test("color-scheme is the theme's: light, dark, a theme set on a part of the page, and the system's when none is chosen", async ({ page }) => {
  await page.goto(story("data-datagrid--editable", "theme:light"));
  expect(await scheme(page)).toBe("light");
  await page.goto(story("data-datagrid--editable", "theme:dark"));
  expect(await scheme(page)).toBe("dark");
  // A part of the page under the other theme (a preview frame, a panel).
  await page.evaluate(() => {
    const frame = document.createElement("div");
    frame.id = "light-part";
    frame.dataset.theme = "light";
    document.body.append(frame);
  });
  expect(await scheme(page, "#light-part")).toBe("light");
  // No theme chosen: the system's.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  expect(await scheme(page)).toBe("dark");
  await page.emulateMedia({ colorScheme: "light" });
  expect(await scheme(page)).toBe("light");
});

/** The mean lightness (0 to 255) of the middle of an element as drawn. */
async function middleLightness(page: Page, selector: string) {
  const box = (await page.locator(selector).first().boundingBox())!;
  const png = await page.screenshot({ clip: { x: box.x + box.width / 2 - 2, y: box.y + box.height / 2 - 2, width: 4, height: 4 } });
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) sum += (pixels[i]! + pixels[i + 1]! + pixels[i + 2]!) / 3;
    return sum / (pixels.length / 4);
  }, png.toString("base64"));
}

test("DataGrid's selection checkboxes are drawn dark in the dark theme, not as white squares", async ({ page }) => {
  await page.goto(story("data-datagrid--editable", "theme:dark"));
  const unchecked = ".stoa-data-grid__body .stoa-data-grid__checkbox:not(:checked)";
  await expect(page.locator(unchecked).first()).toBeVisible();
  expect(await middleLightness(page, unchecked)).toBeLessThan(100);
  expect(await middleLightness(page, ".stoa-data-grid__head .stoa-data-grid__checkbox")).toBeLessThan(100);
  await page.goto(story("data-datagrid--editable", "theme:light"));
  expect(await middleLightness(page, unchecked)).toBeGreaterThan(155);
});
