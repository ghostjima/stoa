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
  await expect(key).toHaveText(["●Coupon", "◐Amortisation", "⚑Deadline", "◆Offer", "■Maturity", "↕Rating change", "✗Default"]);
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

for (const mode of [
  { name: "English", globals: "", deadline: "Deadline", projected: "Coupon (projected)", synthetic: "Rating change (synthetic)" },
  { name: "Russian", globals: "lang:ru", deadline: "Крайний срок", projected: "Купон (прогноз)", synthetic: "Изменение рейтинга (синтетическое)" },
  { name: "Arabic, right to left", globals: "dir:rtl;lang:ar", deadline: "آخر موعد", projected: "كوبون (متوقَّع)", synthetic: "تغيّر التصنيف (اصطناعي)" },
]) {
  test(`a deadline is its own kind and symbol, and a projected or synthetic entry says so beside its kind (${mode.name})`, async ({ page }) => {
    await page.goto(story("data-eventcalendar--deadlines-and-marks", mode.globals));
    const grid = page.locator(".stoa-calendar--grid");
    // The chosen deadline's day: its symbol in the warning colour on a
    // surface plate, its word in the list under the grid.
    const symbol = grid.locator(`${day("2026-10-09")} .stoa-calendar__symbol`);
    await expect(symbol).toHaveText("⚑");
    const [colour, plate, warning, surface] = await symbol.evaluate((el) => {
      const probe = document.createElement("span");
      document.body.append(probe);
      probe.style.color = "var(--stoa-color-warning)";
      probe.style.backgroundColor = "var(--stoa-color-surface)";
      const out = [getComputedStyle(el).color, getComputedStyle(el).backgroundColor, getComputedStyle(probe).color, getComputedStyle(probe).backgroundColor];
      probe.remove();
      return out;
    });
    expect([colour, plate]).toEqual([warning, surface]);
    await expect(grid.locator(".stoa-calendar__chosen .stoa-calendar__kind")).toHaveText([mode.deadline]);
    // The list: each mark beside its kind's word.
    const list = page.locator(".stoa-calendar--list");
    const heads = list.locator(".stoa-calendar__event-head");
    await expect(heads).toHaveCount(4);
    expect(await heads.nth(2).evaluate((p) => `${p.querySelector(".stoa-calendar__kind")!.textContent} ${p.querySelector(".stoa-calendar__mark")!.textContent}`)).toBe(mode.projected);
    expect(await heads.nth(3).evaluate((p) => `${p.querySelector(".stoa-calendar__kind")!.textContent} ${p.querySelector(".stoa-calendar__mark")!.textContent}`)).toBe(mode.synthetic);
    // The grid's cells read the mark with the kind.
    await expect(grid.locator(`${day("2026-10-21")} .stoa-visually-hidden`)).toContainText(mode.projected);
  });
}

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
