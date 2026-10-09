// The page frame and the scrollbars in a real browser, against the built
// stories: a fixed header that never moves, the page scrolling under it
// with the scrollbar below the header, and one scrollbar style everywhere.
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;
const LONG_PAGE = "feedback-feedback-and-layout--page-shell-long-page";

async function openLongPage(page: Page, globals = "") {
  await page.goto(story(LONG_PAGE, globals));
  await expect(page.getByRole("banner")).toBeVisible();
  return page.locator(".stoa-page-shell__scroll");
}

test("the header stays at the top while the page scrolls under it", async ({ page }) => {
  const scroll = await openLongPage(page);
  const banner = page.getByRole("banner");
  const before = await banner.boundingBox();
  await scroll.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await expect(page.getByRole("contentinfo")).toBeInViewport();
  expect(await banner.boundingBox()).toEqual(before);
  // The document itself never scrolls: only the region under the header.
  const documentScrolls = await page.evaluate(() => document.scrollingElement!.scrollHeight > window.innerHeight);
  expect(documentScrolls).toBe(false);
});

test("the scrollbar starts below the header and has its own lane", async ({ page }) => {
  const scroll = await openLongPage(page);
  const header = (await page.getByRole("banner").boundingBox())!;
  const region = (await scroll.boundingBox())!;
  expect(region.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  // The lane is reserved by the style; it has a width only where the system
  // draws scrollbars that take space (Linux, Windows, a Mac set to always
  // show them). With macOS's default overlay scrollbars there is no lane to
  // measure, and the reserved gutter is the whole guarantee.
  expect(await scroll.evaluate((el) => getComputedStyle(el).scrollbarGutter)).toBe("stable");
  const scrollbarsTakeSpace = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;inline-size:100px;block-size:100px;overflow:scroll";
    document.body.append(probe);
    const width = probe.offsetWidth - probe.clientWidth;
    probe.remove();
    return width > 0;
  });
  if (scrollbarsTakeSpace) {
    const lane = await scroll.evaluate((el) => (el as HTMLElement).offsetWidth - el.clientWidth);
    expect(lane).toBeGreaterThan(0);
  }
});

test("the keyboard scrolls the page from the skip link", async ({ page }) => {
  const scroll = await openLongPage(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

for (const theme of ["light", "dark"]) {
  test(`every scrollbar uses the scrollbar tokens, thin, in ${theme}`, async ({ page }) => {
    const pages = [
      { id: LONG_PAGE, selector: ".stoa-page-shell__scroll" },
      { id: "layout-panel--scrolling", selector: ".stoa-scroll-area" },
      { id: "data-table--sticky-first-column", selector: ".stoa-table-region" },
      { id: "data-datagrid--fifty-thousand-rows", selector: ".stoa-data-grid__scroller" },
    ];
    for (const { id, selector } of pages) {
      await page.goto(story(id, `theme:${theme}`));
      const box = page.locator(selector).first();
      await expect(box).toBeVisible();
      const style = await box.evaluate((el) => {
        const probe = (name: string) => {
          const span = document.createElement("span");
          span.style.color = `var(${name})`;
          el.appendChild(span);
          const value = getComputedStyle(span).color;
          span.remove();
          return value;
        };
        const own = getComputedStyle(el);
        return {
          width: own.scrollbarWidth,
          color: own.scrollbarColor,
          expected: `${probe("--stoa-color-scrollbar-thumb")} ${probe("--stoa-color-scrollbar-track")}`,
        };
      });
      expect(style.width, id).toBe("thin");
      expect(style.color, id).toBe(style.expected);
    }
  });
}

test("the scroll keys scroll the page on load, with nothing focused", async ({ page }) => {
  const scroll = await openLongPage(page);
  await page.keyboard.press("PageDown");
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("End");
  await expect(page.getByRole("contentinfo")).toBeInViewport();
  // Focus did not move: the keys scrolled the region, nothing took focus.
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test("a key an application claims does not scroll the page", async ({ page }) => {
  const scroll = await openLongPage(page);
  await page.evaluate(() =>
    document.addEventListener("keydown", (e) => {
      if (e.key === " ") e.preventDefault();
    }),
  );
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  expect(await scroll.evaluate((el) => el.scrollTop)).toBe(0);
  await page.keyboard.press("PageDown");
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test("a long page with nothing to focus makes the region a Tab stop, and a control in it removes the stop", async ({ page }) => {
  const scroll = await openLongPage(page);
  await expect(scroll).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("Tab"); // the skip link
  await page.keyboard.press("Tab"); // the header's button
  await expect(page.getByRole("button", { name: "Settings" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(scroll).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.textContent = "Open session";
    document.querySelector("main")!.prepend(button);
  });
  await expect(scroll).not.toHaveAttribute("tabindex");
});

test("the page keys scroll the page while a control in the header has focus", async ({ page }) => {
  const scroll = await openLongPage(page);
  await page.getByRole("button", { name: "Settings" }).focus();
  await page.keyboard.press("PageDown");
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("Home");
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(0);
  await expect(page.getByRole("button", { name: "Settings" })).toBeFocused();
});

test("a short page gets no extra Tab stop", async ({ page }) => {
  await page.goto(story("feedback-feedback-and-layout--page-shell-frame"));
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.locator(".stoa-page-shell__scroll")).not.toHaveAttribute("tabindex");
});

for (const name of ["Details", "Filters"]) {
  test(`the page under the header does not scroll behind an open modal (${name}), and the modal stays in view`, async ({ page }) => {
    await page.goto(story("feedback-feedback-and-layout--page-shell-with-overlays"));
    const scroll = page.locator(".stoa-page-shell__scroll");
    await page.getByRole("button", { name }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const before = (await dialog.boundingBox())!;
    // The wheel over the backdrop and over the dialog, then the keys.
    await page.mouse.move(20, 400);
    await page.mouse.wheel(0, 600);
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.wheel(0, 600);
    await page.keyboard.press("PageDown");
    await page.keyboard.press("End");
    await page.waitForTimeout(300);
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(0);
    expect(await dialog.boundingBox()).toEqual(before);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    // Closed, the page scrolls again.
    await page.mouse.move(20, 400);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });
}

for (const globals of ["lang:en", "dir:rtl;lang:ar"]) {
  test(`a table with wrapping headers fits a phone's width: phrases wrap, amounts stay on one line (${globals})`, async ({ page }) => {
    await page.goto(story("data-table--wrap-headers", globals));
    const table = page.locator(".stoa-table");
    await expect(table).toBeVisible();
    const layout = await table.evaluate((el) => {
      /** The lines a cell's text takes. */
      const lines = (cell: Element) => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      };
      const region = el.closest(".stoa-table-region")!;
      return {
        overflows: region.scrollWidth > region.clientWidth,
        rowHeaderLines: [...el.querySelectorAll('th[scope="row"]')].map(lines),
        amountLines: [...el.querySelectorAll("td.stoa-num")].map(lines),
      };
    });
    expect(layout.overflows).toBe(false);
    expect(Math.max(...layout.rowHeaderLines)).toBeGreaterThan(1);
    expect(layout.amountLines.every((n) => n === 1)).toBe(true);
  });
}

test("a record list draws its rows in the first frame it is in, never a frame of its empty state, on first load and when it comes back", async ({ page }) => {
  // Before any script of the page: the first animation frame in which the
  // list is in the document says how many rows it draws, and whether it
  // says it is empty.
  await page.addInitScript(() => {
    const w = window as unknown as { firstFrameRows: number | null; watchList: () => void };
    w.watchList = () => {
      w.firstFrameRows = null;
      const tick = () => {
        const list = document.querySelector('[role="listbox"]');
        if (list) w.firstFrameRows = list.querySelector(".stoa-record-list__empty") ? -1 : list.querySelectorAll(".stoa-record-list__row").length;
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    w.watchList();
  });
  const firstFrameRows = () => page.evaluate(() => (window as unknown as { firstFrameRows: number | null }).firstFrameRows);
  // Whether the first frame comes before the rows depends on timing; five
  // loads make a late frame all but certain to show.
  for (let load = 0; load < 5; load++) {
    await page.goto(story("overlays-lists-and-content--record-list-replaced-by-detail"));
    await expect.poll(firstFrameRows).not.toBeNull();
    expect(await firstFrameRows(), `load ${load + 1}`).toBe(4);
  }
  await page.getByRole("option", { name: /RU000A1001/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { watchList: () => void }).watchList());
  await page.getByRole("button", { name: "Back" }).click();
  await expect.poll(firstFrameRows).not.toBeNull();
  expect(await firstFrameRows()).toBe(4);
});

for (const globals of ["lang:en", "dir:rtl;lang:ar"]) {
  // A line at line-height: normal takes the height of the face that draws
  // it, so it changes height when the web fonts take the fallback's place.
  // Every story, so that a component added later is checked too.
  test(`no text in any story takes its line height from the face (${globals})`, async ({ page }) => {
    test.setTimeout(10 * 60_000);
    const response = await page.request.get("/index.json");
    expect(response.ok(), "index.json of the built Storybook").toBe(true);
    const index = (await response.json()) as { entries: Record<string, { id: string; type: string }> };
    const ids = Object.values(index.entries)
      .filter((e) => e.type === "story")
      .map((e) => e.id);
    const normal: string[] = [];
    let checked = 0;
    for (const id of ids) {
      await page.goto(story(id, globals));
      await expect(page.locator("#storybook-root > *").first()).toBeAttached();
      const found = await page.evaluate(() => {
        const withText = [...document.querySelectorAll("#storybook-root *")].filter(
          (el) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "") && el.getBoundingClientRect().height > 0,
        );
        return {
          count: withText.length,
          normal: withText.filter((el) => getComputedStyle(el).lineHeight === "normal").map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`),
        };
      });
      checked += found.count;
      for (const name of new Set(found.normal)) normal.push(`${id}: ${name}`);
    }
    expect(checked).toBeGreaterThan(0);
    expect(normal).toEqual([]);
  });
}

for (const [width, height] of [
  [1280, 800],
  [375, 812],
] as const) {
  test(`AppHeader keeps its height when the web fonts arrive (${width} px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(/\.woff2?$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(story("layout-panel--header"), { waitUntil: "commit" });
    const header = page.locator(".stoa-app-header");
    await expect(header).toBeVisible();
    // Drawn in the fallback face: no web font has arrived.
    expect(await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded" && !/Fallback/.test(f.family)).length)).toBe(0);
    const before = await header.evaluate((el) => el.getBoundingClientRect().height);
    release();
    await page.waitForFunction(() => [...document.fonts].some((f) => f.family === "IBM Plex Sans" && f.status === "loaded"));
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loading").length)).toBe(0);
    expect(await header.evaluate((el) => el.getBoundingClientRect().height)).toBe(before);
  });
}
