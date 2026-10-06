// Mixed directions in a real browser, against the built stories: where
// the bidi algorithm actually draws each part of a line.
import { expect, test, type Locator } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The left edge of the drawn text of an element, in CSS pixels. */
const left = (element: Locator) => element.evaluate((el) => el.getBoundingClientRect().left);

test("LogView keeps an Arabic time and level at the left of their line, in that order, in a right-to-left page", async ({ page }) => {
  await page.goto(story("overlays-lists-and-content--log-arabic", "dir:rtl;lang:ar"));
  const lines = page.locator(".stoa-code__line");
  await expect(lines).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const line = lines.nth(i);
    const time = await left(line.locator(".stoa-code__time"));
    const level = await left(line.locator(".stoa-code__level"));
    const message = await left(line.locator("bdi").last());
    expect(time, `line ${i + 1}`).toBeLessThan(level);
    expect(level, `line ${i + 1}`).toBeLessThan(message);
  }
});

/** The left edges of the first occurrence of each substring in an
 * element's text, in CSS pixels. */
function lefts(element: Locator, parts: string[]) {
  return element.evaluate((el, wanted) => {
    const node = el.firstChild!;
    const text = node.textContent ?? "";
    return wanted.map((part) => {
      const range = document.createRange();
      const at = text.indexOf(part);
      range.setStart(node, at);
      range.setEnd(node, at + part.length);
      return range.getBoundingClientRect().left;
    });
  }, parts);
}

test("ProgressBar keeps an English value text in reading order in a right-to-left frame", async ({ page }) => {
  await page.goto(story("feedback-feedback-and-layout--progress-bytes", "dir:rtl;lang:en"));
  const value = page.locator(".stoa-progress__value");
  await expect(value).toHaveText("⁨1.8 MB⁩ of ⁨4.8 MB⁩");
  const [first, of, total] = await lefts(value, ["1.8 MB", "of", "4.8 MB"]);
  expect(first).toBeLessThan(of!);
  expect(of).toBeLessThan(total!);
});

test("ProgressBar keeps an Arabic value text right to left", async ({ page }) => {
  await page.goto(story("feedback-feedback-and-layout--progress-bytes", "dir:rtl;lang:ar"));
  const value = page.locator(".stoa-progress__value");
  const text = (await value.textContent()) ?? "";
  const [amount, total] = text.split(" من ");
  const [first, , last] = await lefts(value, [amount!.replace(/[\u2068\u2069]/g, ""), "من", total!.replace(/[\u2068\u2069]/g, "")]);
  expect(first).toBeGreaterThan(last!);
});

/** The left edges of the first occurrence of each substring in an
 * element's text, wherever the text node that holds it is nested. */
function leftsDeep(element: Locator, parts: string[]) {
  return element.evaluate((el, wanted) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
    return wanted.map((part) => {
      for (const node of nodes) {
        const at = node.data.indexOf(part);
        if (at < 0) continue;
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + part.length);
        return range.getBoundingClientRect().left;
      }
      throw new Error(`"${part}" not found in "${el.textContent}"`);
    });
  }, parts);
}

test("StatBar keeps a value's number before its unit in a right-to-left page", async ({ page }) => {
  await page.goto(story("controls-playback--counters", "dir:rtl;lang:ar"));
  const value = page.locator(".stoa-statbar dd").filter({ hasText: "16.9" });
  const [number, unit] = await leftsDeep(value, ["16.9", "ms"]);
  expect(number).toBeLessThan(unit!);
});

test("Metric keeps an Arabic-Indic number before a Latin unit in a right-to-left page", async ({ page }) => {
  await page.goto(story("overlays-lists-and-content--metrics", "dir:rtl;lang:ar"));
  const value = page.locator(".stoa-metric__value").first();
  await expect(value).toHaveText("١٦٫٩ ms");
  const [number, unit] = await leftsDeep(value, ["١٦٫٩", "ms"]);
  expect(number).toBeLessThan(unit!);
});

test("Table keeps a sign before its number and a unit after it in a right-to-left page", async ({ page }) => {
  await page.goto(story("data-table--signed-values", "dir:rtl;lang:en"));
  const falling = page.getByRole("cell", { name: "-0.42%" });
  const [sign, digits] = await leftsDeep(falling, ["-", "0.42"]);
  expect(sign).toBeLessThan(digits!);
  const latency = page.getByRole("cell", { name: "16.9 ms" });
  const [number, unit] = await leftsDeep(latency, ["16.9", "ms"]);
  expect(number).toBeLessThan(unit!);
});

test("DataGrid keeps a sign before its number and a unit after it in a right-to-left page", async ({ page }) => {
  await page.goto(story("data-datagrid--signed-values", "dir:rtl;lang:en"));
  const falling = page.getByRole("gridcell", { name: "-0.42%" });
  const [sign, digits] = await leftsDeep(falling, ["-", "0.42"]);
  expect(sign).toBeLessThan(digits!);
  const latency = page.getByRole("gridcell", { name: "16.9 ms" });
  const [number, unit] = await leftsDeep(latency, ["16.9", "ms"]);
  expect(number).toBeLessThan(unit!);
});

test("Ltr keeps a formula in order inside an Arabic sentence", async ({ page }) => {
  await page.goto(story("overlays-lists-and-content--inline-isolates", "dir:rtl;lang:ar"));
  const formula = page.locator(".stoa-ltr").first();
  await expect(formula).toHaveText("2 + 2 = 4");
  const [two, four] = await leftsDeep(formula, ["2", "4"]);
  expect(two).toBeLessThan(four!);
});
