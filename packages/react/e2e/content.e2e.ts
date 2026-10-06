// Tooltip, DescriptionList and RecordList in a real browser, against the
// built stories: the keyboard, a touch screen, and right to left.
import { expect, test, type Locator } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=overlays-lists-and-content--${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

test("a tooltip opens on keyboard focus, describes its term, and closes on Escape", async ({ page }) => {
  await page.goto(story("tooltip-closed"));
  const term = page.getByRole("button", { name: "YTM" });
  // Start from the paragraph before the term, as a reader would.
  await page.getByText("of this bond").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("Tab");
  await expect(term).toBeFocused();
  const tip = page.getByRole("tooltip");
  await expect(tip).toHaveText(/Yield to maturity/);
  await expect(term).toHaveAccessibleDescription(/Yield to maturity/);
  await page.keyboard.press("Escape");
  await expect(tip).toHaveCount(0);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });
  test("a tooltip opens on a tap on its term and closes on a tap elsewhere", async ({ page }) => {
    await page.goto(story("tooltip-closed"));
    await page.getByRole("button", { name: "YTM" }).tap();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.getByText("of this bond").tap({ position: { x: 1, y: 1 } });
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });
});

test("an open tooltip sits below its term, inside the window, in both directions", async ({ page }) => {
  for (const globals of ["", "dir:rtl;lang:ar"]) {
    await page.goto(story("tooltip-open", globals));
    const term = (await page.getByRole("button", { name: "day count" }).boundingBox())!;
    const tip = (await page.getByRole("tooltip").boundingBox())!;
    expect(tip.y, globals).toBeGreaterThanOrEqual(term.y + term.height);
    expect(tip.x, globals).toBeGreaterThanOrEqual(0);
  }
});

test("a tooltip's arrow sits between the tooltip and its term and points at the term, on every side, in both directions", async ({ page }) => {
  for (const [globals, rtl] of [["", false], ["dir:rtl;lang:ar", true]] as const) {
    await page.goto(story("tooltip-placements", globals));
    for (const side of ["top", "bottom", "start", "end"] as const) {
      const term = (await page.getByRole("button", { name: side, exact: true }).boundingBox())!;
      const tooltip = page.getByRole("tooltip").filter({ hasText: side === "top" ? "above" : side === "bottom" ? "below" : `the ${side}` });
      const tip = (await tooltip.boundingBox())!;
      // The drawn triangle, after its turn, and its point: the vertex
      // furthest from the tooltip.
      const arrow = await tooltip.locator(".stoa-tooltip__arrow path").evaluate((path) => {
        const box = path.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
      });
      const where = `${side} ${globals}`;
      // Start and end are the left and the right, swapped in right to left.
      const physical = side === "start" ? (rtl ? "right" : "left") : side === "end" ? (rtl ? "left" : "right") : side;
      if (physical === "top" || physical === "bottom") {
        // Centred on the term, across the gap between the two.
        expect(Math.abs(arrow.cx - (term.x + term.width / 2)), where).toBeLessThan(2);
        // The base of the triangle on the tooltip's edge, its point
        // towards the term.
        if (physical === "top") {
          expect(Math.abs(arrow.top - (tip.y + tip.height)), where).toBeLessThan(2);
          expect(arrow.bottom, where).toBeLessThanOrEqual(term.y);
        } else {
          expect(Math.abs(arrow.bottom - tip.y), where).toBeLessThan(2);
          expect(arrow.top, where).toBeGreaterThanOrEqual(term.y + term.height);
        }
        expect(arrow.right - arrow.left, where).toBeGreaterThan(arrow.bottom - arrow.top);
      } else {
        expect(Math.abs(arrow.cy - (term.y + term.height / 2)), where).toBeLessThan(2);
        if (physical === "left") {
          expect(tip.x + tip.width, where).toBeLessThanOrEqual(term.x);
          expect(Math.abs(arrow.left - (tip.x + tip.width)), where).toBeLessThan(2);
          expect(arrow.right, where).toBeLessThanOrEqual(term.x);
        } else {
          expect(tip.x, where).toBeGreaterThanOrEqual(term.x + term.width);
          expect(Math.abs(arrow.right - tip.x), where).toBeLessThan(2);
          expect(arrow.left, where).toBeGreaterThanOrEqual(term.x + term.width);
        }
        expect(arrow.bottom - arrow.top, where).toBeGreaterThan(arrow.right - arrow.left);
      }
    }
  }
});

test("a description list puts its terms at the start edge: left, and right in a right-to-left page", async ({ page }) => {
  for (const [globals, termFirst] of [["", true], ["dir:rtl;lang:ar", false]] as const) {
    await page.goto(story("description-columns", globals));
    const term = (await page.getByRole("term").first().boundingBox())!;
    const value = (await page.getByRole("definition").first().boundingBox())!;
    expect(term.x < value.x, globals).toBe(termFirst);
    expect(Math.abs(term.y - value.y), globals).toBeLessThan(2);
  }
});

/** The left edge of where `part` is drawn in an element's text. */
function leftOf(element: Locator, part: string) {
  return element.evaluate((el, wanted) => {
    const node = el.firstChild!;
    const at = (node.textContent ?? "").indexOf(wanted);
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + wanted.length);
    return range.getBoundingClientRect().left;
  }, part);
}

test("a description list value keeps its own direction and stays beside its term, in both directions of the page", async ({ page }) => {
  for (const [globals, rtl] of [["", false], ["dir:rtl;lang:ar", true]] as const) {
    await page.goto(story("description-mixed-directions", globals));
    const date = page.getByRole("definition").filter({ hasText: "4 Sep 2027" });
    const issuer = page.getByRole("definition").filter({ hasText: "Gazprom" });
    // The date reads left to right in either page: "4" first, "2027" last.
    expect(await leftOf(date, "4 "), globals).toBeLessThan(await leftOf(date, "Sep"));
    expect(await leftOf(date, "Sep"), globals).toBeLessThan(await leftOf(date, "2027"));
    // The Arabic issuer reads right to left in either page: its first
    // word at the right of the Latin name.
    expect(await leftOf(issuer, "شركة"), globals).toBeGreaterThan(await leftOf(issuer, "Gazprom"));
    // Both are aligned at the list's start edge, next to the terms.
    for (const value of [date, issuer]) {
      const box = (await value.boundingBox())!;
      const text = await value.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rect = range.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      if (rtl) expect(Math.abs(box.x + box.width - text.right), globals).toBeLessThan(1);
      else expect(Math.abs(text.left - box.x), globals).toBeLessThan(1);
    }
  }
});

test("a record list picks with the keyboard and shows the pick in the detail", async ({ page }) => {
  await page.goto(story("record-list-with-detail", "dir:rtl;lang:ar"));
  const list = page.getByRole("listbox", { name: "Bonds" });
  await list.getByRole("option", { name: "RU000A1001" }).click();
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("option", { name: "RU000A1002" })).toBeFocused();
  // The disabled record is skipped.
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("option", { name: "XS0000004" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(list.getByRole("option", { name: "XS0000004" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "XS0000004" })).toBeVisible();
  // The bar marks the picked row at its start edge: the right in right to left.
  const bar = await list.getByRole("option", { name: "XS0000004" }).evaluate((el) => {
    const style = getComputedStyle(el);
    return { right: style.borderRightWidth, left: style.borderLeftWidth };
  });
  expect(parseFloat(bar.right)).toBeGreaterThan(parseFloat(bar.left));
});
