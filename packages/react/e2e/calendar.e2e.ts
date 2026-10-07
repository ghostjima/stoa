// EventCalendar in a real browser, against the built stories: the
// keyboard of the ARIA date grid, the week laid out from the reading
// direction's start, each kind's symbol on a surface plate, and the list
// a phone gets.
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

const day = (date: string) => `[data-date="${date}"]`;

test("Tab lands on the chosen day; the keys move through days, weeks and months; Enter chooses", async ({ page }) => {
  await page.goto(story("data-eventcalendar--month"));
  const grid = page.getByRole("grid", { name: "Events of Severo-Zapad Leasing 001P-03 October 2026" });
  await expect(grid).toBeVisible();
  // Previous month, then the grid: the grid is one stop, on the chosen day.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(day("2026-10-15"))).toBeFocused();
  // The focus ring is drawn.
  expect(await page.locator(day("2026-10-15")).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(day("2026-10-14"))).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(day("2026-10-07"))).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(page.locator(day("2026-11-07"))).toBeFocused();
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.locator(day("2026-11-07"))).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(day("2026-11-26"))).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(day("2026-11-19"))).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(day("2026-11-19"))).toHaveAttribute("aria-selected", "true");
  const chosen = page.locator(".stoa-calendar__chosen");
  await expect(chosen.getByRole("heading")).toHaveText("Thursday, November 19, 2026");
  await expect(chosen.locator(".stoa-calendar__kind")).toHaveText(["Default"]);
  // Tab leaves the grid.
  await page.keyboard.press("Tab");
  await expect(page.locator("[data-date]:focus")).toHaveCount(0);
});

test("right to left, the week runs from the right, starting on Saturday, and the left arrow goes forward", async ({ page }) => {
  await page.goto(story("data-eventcalendar--month", "dir:rtl;lang:ar"));
  const heads = page.getByRole("columnheader");
  await expect(heads.first()).toHaveAttribute("abbr", "السبت");
  const [first, last] = [await heads.first().boundingBox(), await heads.last().boundingBox()];
  expect(first!.x).toBeGreaterThan(last!.x);
  await page.locator(day("2026-10-15")).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(day("2026-10-16"))).toBeFocused();
  // Arabic-Indic day numbers.
  await expect(page.locator(`${day("2026-10-16")} .stoa-calendar__number`)).toHaveText("١٦");
});

test("each kind is its own symbol, in its colour on a surface plate, named in the key", async ({ page }) => {
  await page.goto(story("data-eventcalendar--all-kinds"));
  const key = page.locator(".stoa-calendar__key-item");
  await expect(key).toHaveText(["●Coupon", "◐Amortisation", "◆Offer", "■Maturity", "↕Rating change", "✗Default"]);
  const plates = await page.locator(`${day("2026-11-30")} .stoa-calendar__symbol`).evaluateAll((els) =>
    els.map((el) => ({ text: el.textContent, colour: getComputedStyle(el).color, plate: getComputedStyle(el).backgroundColor })),
  );
  expect(plates.map((p) => p.text)).toEqual(["◐", "◆", "■", "↕"]);
  const surface = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--stoa-color-surface)";
    document.body.append(probe);
    const colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return colour;
  });
  for (const plate of plates) expect(plate.plate).toBe(surface);
  // The colours differ between kinds that share no shape.
  expect(new Set(plates.map((p) => p.colour)).size).toBeGreaterThan(2);
  // A day is at least the minimum target.
  const box = await page.locator(day("2026-11-30")).boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(24);
  expect(box!.height).toBeGreaterThanOrEqual(24);
});

test("Previous and Next change the month and keep the focus on the button", async ({ page }) => {
  await page.goto(story("data-eventcalendar--all-kinds"));
  const next = page.getByRole("button", { name: "Next month: December 2026" });
  await next.click();
  await expect(page.getByRole("heading", { name: "December 2026" })).toBeVisible();
  await expect(page.getByText("December 2026: no events.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next month: January 2027" })).toBeFocused();
});

for (const mode of [
  { name: "left to right", globals: "", today: "Wednesday, October 7, 2026 · today" },
  { name: "right to left", globals: "dir:rtl;lang:ar", today: null },
]) {
  test(`at 375 px the calendar is a list of the month's days with events, with no sideways scroll (${mode.name})`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(story("data-eventcalendar--month", mode.globals));
    await expect(page.locator(".stoa-calendar--list")).toBeVisible();
    await expect(page.getByRole("grid")).toHaveCount(0);
    const headings = page.locator(".stoa-calendar__days .stoa-calendar__date");
    await expect(headings).toHaveCount(3);
    if (mode.today) await expect(headings.first()).toHaveText(mode.today);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // Wider again: the grid comes back.
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.getByRole("grid")).toBeVisible();
  });
}
