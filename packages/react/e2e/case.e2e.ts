// Timeline, DetailHeader, Letter, FindingsList and TextDiff in a real
// browser, against the built stories: layout right to left, the focus on
// opening a record and after Back, the copy on the clipboard, and changes
// and severities drawn with more than colour.
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The focused element's tag and id, or "BODY". */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "BODY";
    return `${el.tagName}#${el.id}`;
  });

/** A colour token's computed value. */
const token = (page: Page, name: string, property: "color" | "backgroundColor" = "color") =>
  page.evaluate(
    ([name, property]) => {
      const span = document.createElement("span");
      document.body.append(span);
      span.style[property] = `var(${name})`;
      const value = getComputedStyle(span)[property];
      span.remove();
      return value;
    },
    [name, property] as const,
  );

for (const globals of ["lang:en", "dir:rtl;lang:ar"]) {
  const rtl = globals.includes("rtl");

  test(`a timeline's days run oldest first, each time at the start of its entry, and an emphasised entry has a bar at its start edge (${globals})`, async ({ page }) => {
    await page.goto(story("case-timeline--case-history", globals));
    const list = page.locator(".stoa-timeline");
    await expect(list).toBeVisible();
    const layout = await list.evaluate((el) => {
      const days = [...el.querySelectorAll(".stoa-timeline__date time")].map((t) => t.getAttribute("datetime"));
      const entry = el.querySelector(".stoa-timeline__entry:has(.stoa-timeline__when time)")!;
      const when = entry.querySelector(".stoa-timeline__when")!.getBoundingClientRect();
      const what = entry.querySelector(".stoa-timeline__what")!.getBoundingClientRect();
      const due = getComputedStyle(el.querySelector(".stoa-timeline__entry--emphasis")!);
      return {
        days,
        whenFirst: document.documentElement.dir === "rtl" ? when.left > what.left : when.right < what.right,
        bar: document.documentElement.dir === "rtl" ? [due.borderRightWidth, due.borderRightColor] : [due.borderLeftWidth, due.borderLeftColor],
      };
    });
    expect(layout.days).toEqual(["2026-09-03", "2026-09-04", "2026-09-08", "2026-09-25"]);
    expect(layout.whenFirst).toBe(true);
    expect(parseFloat(layout.bar[0]!)).toBeGreaterThan(0);
    expect(layout.bar[1]).toBe(await token(page, "--stoa-color-accent"));
    // A time in a right-to-left page keeps its own order: the hour to the
    // left of the minutes.
    const time = page.locator(".stoa-timeline__when time").first();
    const order = await time.evaluate((el) => {
      const text = el.firstChild as Text;
      const range = document.createRange();
      const at = (from: number) => {
        range.setStart(text, from);
        range.setEnd(text, from + 1);
        return range.getBoundingClientRect().left;
      };
      // The hour's first digit, then the minutes' first: an Arabic time
      // ends in a word ("م") that stands to the left, so the run's last
      // letter tells nothing.
      return at(0) < at(text.data.indexOf(":") + 1);
    });
    expect(order).toBe(true);
  });

  test(`opening a case focuses its title, and Back returns the focus to the row it came from (${globals})`, async ({ page }) => {
    await page.goto(story("case-detailheader--back-to-the-row", globals));
    const row = page.locator("#story-row-Z-000107");
    await row.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => focused(page)).toBe("H2#story-case-title");
    const back = page.getByRole("button", { name: rtl ? "رجوع" : "Back" });
    await expect(back).toHaveAttribute("aria-keyshortcuts", "Q");
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#story-queue")).toBeVisible();
    await expect.poll(() => focused(page)).toBe("BUTTON#story-row-Z-000107");
  });

  test(`the Q key goes back too, and the focus lands on the row, not on the body (${globals})`, async ({ page }) => {
    await page.goto(story("case-detailheader--back-to-the-row", globals));
    await page.locator("#story-row-Z-000112").click();
    await expect.poll(() => focused(page)).toBe("H2#story-case-title");
    await page.keyboard.press("q");
    await expect.poll(() => focused(page)).toBe("BUTTON#story-row-Z-000112");
  });

  test(`a letter's Copy puts its lines on the clipboard as plain text, without direction marks (${globals})`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(story("case-letter--reply", globals));
    await expect(page.locator(".stoa-letter__text p")).toHaveCount(6);
    const lines = await page.locator(".stoa-letter__text p").allTextContents();
    await page.locator(".stoa-letter__bar button").click();
    await expect(page.locator(".stoa-letter__status")).toHaveText(rtl ? "تم النسخ" : "Copied");
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toBe(lines.join("\n"));
    expect(text).not.toMatch(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/);
    // The citation keeps its own order in a right-to-left list.
    const term = page.locator(".stoa-letter__grounds dt bdi");
    const order = await term.evaluate((el) => {
      const text = el.firstChild as Text;
      const range = document.createRange();
      const at = (word: string) => {
        const from = text.data.indexOf(word);
        range.setStart(text, from);
        range.setEnd(text, from + word.length);
        return range.getBoundingClientRect().left;
      };
      return at("161") < at("3.4");
    });
    expect(order).toBe(true);
  });

  test(`a diff strikes deletions through and underlines insertions, each on its wash over the surface (${globals})`, async ({ page }) => {
    await page.goto(story("case-textdiff--draft-and-signed", globals));
    await expect(page.locator(".stoa-diff__text")).toBeVisible();
    const marks = await page.locator(".stoa-diff__text").evaluate((el) =>
      [...el.querySelectorAll("del, ins")].map((m) => {
        const style = getComputedStyle(m);
        return { tag: m.tagName, line: style.textDecorationLine, fill: style.backgroundColor, colour: style.color };
      }),
    );
    const [up, down, text, surface] = await Promise.all([
      token(page, "--stoa-color-up-wash", "backgroundColor"),
      token(page, "--stoa-color-down-wash", "backgroundColor"),
      token(page, "--stoa-color-text"),
      token(page, "--stoa-color-surface", "backgroundColor"),
    ]);
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      expect(m).toEqual(m.tag === "DEL" ? { tag: "DEL", line: "line-through", fill: down, colour: text } : { tag: "INS", line: "underline", fill: up, colour: text });
    }
    expect(await page.locator(".stoa-diff__text").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(surface);
    // The list of changes opens from the keyboard.
    await page.locator(".stoa-diff summary").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".stoa-diff__change").first()).toBeVisible();
  });

  test(`each finding's symbol is in its severity's colour on a surface plate (${globals})`, async ({ page }) => {
    await page.goto(story("case-findingslist--by-severity", globals));
    await expect(page.locator(".stoa-finding")).toHaveCount(4);
    const symbols = await page.locator(".stoa-finding .stoa-findings__symbol").evaluateAll((els) =>
      els.map((el) => ({ severity: el.closest("li")!.getAttribute("data-severity"), symbol: el.textContent, colour: getComputedStyle(el).color, plate: getComputedStyle(el).backgroundColor })),
    );
    const [down, warning, accent, surface] = await Promise.all([
      token(page, "--stoa-color-down"),
      token(page, "--stoa-color-warning"),
      token(page, "--stoa-color-accent"),
      token(page, "--stoa-color-surface", "backgroundColor"),
    ]);
    expect(symbols).toEqual([
      { severity: "error", symbol: "✗", colour: down, plate: surface },
      { severity: "warning", symbol: "!", colour: warning, plate: surface },
      { severity: "warning", symbol: "!", colour: warning, plate: surface },
      { severity: "info", symbol: "◆", colour: accent, plate: surface },
    ]);
  });
}
