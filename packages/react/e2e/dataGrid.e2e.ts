// DataGrid virtualisation in a real browser, against the built stories:
// only the rows and columns in view are in the DOM, positions stay right
// after a long scroll, and the pinned columns and the header stick.
import { expect, test, type Locator, type Page } from "@playwright/test";

const story = (id: string) => `/iframe.html?id=data-datagrid--${id}&viewMode=story`;

async function openGrid(page: Page, id: string, name: string) {
  await page.goto(story(id));
  const grid = page.getByRole("grid", { name });
  await expect(grid.getByRole("columnheader").first()).toBeVisible();
  return grid;
}

const rowIndices = (grid: Locator) =>
  grid.locator('[role="row"]').evaluateAll((rows) => rows.map((r) => Number(r.getAttribute("aria-rowindex"))));

test("of 50,000 rows and 31 columns, only those in view are in the DOM", async ({ page }) => {
  const grid = await openGrid(page, "fifty-thousand-rows", "Orders");
  await expect(grid).toHaveAttribute("aria-rowcount", "50001");
  await expect(grid).toHaveAttribute("aria-colcount", "31");
  const { visible, rows } = await grid.evaluate((el) => ({
    visible: Math.ceil(el.clientHeight / (el.querySelector('[role="row"]') as HTMLElement).offsetHeight),
    rows: el.querySelectorAll('[role="row"]').length,
  }));
  // The rows in view, four of overscan on each side at most, the header.
  expect(rows).toBeGreaterThanOrEqual(visible);
  expect(rows).toBeLessThanOrEqual(visible + 9);
  const cellsInFirstRow = await grid.locator('[role="row"][aria-rowindex="2"] > *').count();
  expect(cellsInFirstRow).toBeLessThan(31);
  expect(await rowIndices(grid)).toEqual(Array.from({ length: rows }, (_, i) => i + 1));
});

test("after scrolling to row 40,000 the rendered rows carry the right aria-rowindex", async ({ page }) => {
  const grid = await openGrid(page, "fifty-thousand-rows", "Orders");
  const rowHeight = await grid.evaluate((el) => (el.querySelector('[role="row"]') as HTMLElement).offsetHeight);
  // Row 40,000 (index 39,999) at the top of the body.
  await grid.evaluate((el, top) => (el.scrollTop = top), 39_999 * rowHeight);
  const target = grid.locator('[role="row"][aria-rowindex="40001"]');
  await expect(target).toBeVisible();
  await expect(target.getByRole("rowheader")).toHaveText("ORD-040000");
  const indices = await rowIndices(grid);
  expect(indices[0]).toBe(1);
  // The active cell's row (the first row, index 2) stays in the DOM while
  // it is scrolled away, so focus is never lost; the rest is one run.
  expect(indices[1]).toBe(2);
  const body = indices.slice(2);
  expect(body).toContain(40001);
  expect(body).toEqual(Array.from({ length: body.length }, (_, i) => body[0]! + i));
  expect(indices.length).toBeLessThan(40);
  // Each rendered row's index matches its order id: index n is ORD n - 1.
  const pairs = await grid.locator('[role="row"]:not([aria-rowindex="1"])').evaluateAll((rows) =>
    rows.map((r) => [Number(r.getAttribute("aria-rowindex")), r.querySelector('[role="rowheader"]')?.textContent]),
  );
  for (const [index, id] of pairs) expect(id).toBe(`ORD-${String(Number(index) - 1).padStart(6, "0")}`);
});

test("the keyboard reaches the last row and the far row stays in the DOM", async ({ page }) => {
  const grid = await openGrid(page, "fifty-thousand-rows", "Orders");
  await grid.locator('[data-cell="0:1"]').click();
  await page.keyboard.press("ControlOrMeta+End");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("data-cell", "49999:30");
  await expect(focused.locator("xpath=..")).toHaveAttribute("aria-rowindex", "50001");
  await expect(focused).toBeInViewport();
  await page.keyboard.press("ControlOrMeta+Home");
  await expect(page.locator(":focus")).toHaveAttribute("data-cell", "0:0");
  expect((await rowIndices(grid)).length).toBeLessThan(40);
});

test("the header and the pinned columns stick while the grid scrolls", async ({ page }) => {
  const grid = await openGrid(page, "fifty-thousand-rows", "Orders");
  await grid.evaluate((el) => {
    el.scrollTop = 3000;
    el.scrollLeft = 1500;
  });
  const box = (await grid.boundingBox())!;
  const header = (await grid.getByRole("columnheader", { name: "Order" }).boundingBox())!;
  expect(Math.round(header.y)).toBe(Math.round(box.y));
  const firstRowHeader = grid.getByRole("rowheader").first();
  const pinned = (await firstRowHeader.boundingBox())!;
  // The selection column (40 px) and then the order column, at the start edge.
  expect(Math.round(pinned.x - box.x)).toBe(40);
});

test("in a right-to-left grid the pinned columns stick to the right edge", async ({ page }) => {
  const grid = await openGrid(page, "right-to-left", "الأوامر");
  await grid.evaluate((el) => (el.scrollLeft = -1200));
  await expect.poll(() => grid.evaluate((el) => el.scrollLeft)).toBeLessThan(-1000);
  const box = (await grid.boundingBox())!;
  const pinned = (await grid.getByRole("rowheader").first().boundingBox())!;
  expect(Math.round(box.x + box.width - (pinned.x + pinned.width))).toBe(40);
});

test("the focus stays on the active cell's row when rows are inserted above it or reordered", async ({ page }) => {
  const grid = await openGrid(page, "live-rows", "Live orders");
  const rowOf = (cell: Locator) => cell.evaluate((el) => el.closest('[role="row"]')!.querySelector('[role="rowheader"]')!.textContent);
  await grid.locator('[data-cell="3:2"]').click();
  const focused = page.locator(":focus");
  const order = await rowOf(focused);
  await page.keyboard.press("i");
  await expect(grid).toHaveAttribute("aria-rowcount", "102");
  await expect(focused).toHaveAttribute("data-cell", "4:2");
  // The focused cell is the grid's one tab stop, the active cell.
  await expect(focused).toHaveAttribute("tabindex", "0");
  expect(await rowOf(focused)).toBe(order);
  await page.keyboard.press("r");
  await expect(focused).toHaveAttribute("data-cell", "96:2");
  expect(await rowOf(focused)).toBe(order);
  // The arrows go on from there.
  await page.keyboard.press("ArrowDown");
  await expect(focused).toHaveAttribute("data-cell", "97:2");
});

test("the focus stays in the grid, at the same position, when the focused row is deleted", async ({ page }) => {
  const grid = await openGrid(page, "live-rows", "Live orders");
  await grid.locator('[data-cell="2:2"]').click();
  await page.keyboard.press("d");
  await expect(grid).toHaveAttribute("aria-rowcount", "96");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("data-cell", "2:2");
  await page.keyboard.press("ArrowDown");
  await expect(focused).toHaveAttribute("data-cell", "3:2");
});

for (const [name, column, editor] of [
  ["a list editor", "Status", "listbox"],
  ["a text editor", "Note", "textbox"],
] as const) {
  test(`a double click on an editable cell opens ${name}, on a cell that was active and on one that was not`, async ({ page }) => {
    const grid = await openGrid(page, "editable", "Orders, editable");
    const columnIndex = await grid.getByRole("columnheader").evaluateAll((heads, wanted) => heads.findIndex((h) => h.textContent?.trim() === wanted), column);
    const cell = (row: number) => grid.locator(`[data-cell="${row}:${columnIndex}"]`);
    // A cell that was not active.
    await cell(2).dblclick();
    await expect(grid.getByRole(editor)).toBeVisible();
    await expect(grid.getByRole(editor)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(grid.getByRole(editor)).toHaveCount(0);
    await expect(cell(2)).toBeFocused();
    // The cell that is active now, clicked once before.
    await cell(2).click();
    await cell(2).dblclick();
    await expect(grid.getByRole(editor)).toBeVisible();
    await expect(grid.getByRole(editor)).toBeFocused();
    await page.keyboard.press("Escape");
    // The keyboard still opens it as before.
    await cell(3).click();
    await page.keyboard.press("Enter");
    await expect(grid.getByRole(editor)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(cell(3)).toBeFocused();
  });
}

test("the column chooser works from the keyboard: hide a column, move one, and the focus returns to its button", async ({ page }) => {
  const grid = await openGrid(page, "column-chooser", "Orders");
  const header = (name: string) => grid.getByRole("columnheader", { name, exact: true });
  /** The focused element's role (or tag) and name. */
  const focusedControl = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return `${el?.getAttribute("role") ?? el?.tagName.toLowerCase()}:${el?.getAttribute("aria-label") ?? el?.closest("label")?.textContent ?? ""}`;
    });
  await expect(header("Note")).toHaveCount(0);
  const open = page.getByRole("button", { name: "Columns", exact: true });
  await open.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Columns" });
  await expect(sheet).toBeVisible();
  // The sheet takes the focus as it opens; from there, Tab reaches the
  // list (after the close button), which is one tab stop.
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') != null)).toBe(true);
  for (let i = 0; i < 4 && (await focusedControl()) !== "row:Order"; i++) await page.keyboard.press("Tab");
  await expect.poll(focusedControl).toBe("row:Order");
  // Down to Status, right to its check box, Space hides it.
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect.poll(focusedControl).toBe("row:Status");
  await page.keyboard.press("ArrowRight");
  await expect.poll(focusedControl).toBe("input:Status");
  await page.keyboard.press("Space");
  await expect(sheet.getByRole("checkbox", { name: "Status" })).not.toBeChecked();
  // Up to Symbol, right past its check box to Move up, Enter moves it.
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect.poll(focusedControl).toBe("row:Symbol");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(focusedControl).toBe("button:Move up: Symbol");
  await page.keyboard.press("Enter");
  await expect(sheet.getByRole("status")).toHaveText("Symbol moved to position 2 of 30.");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(header("Status")).toHaveCount(0);
  // Order is pinned and stays first; Symbol now comes before Account, which is pinned too.
  const names = await grid.getByRole("columnheader").evaluateAll((els) => els.slice(0, 4).map((el) => el.textContent));
  expect(names).toEqual(["Order", "Account", "Symbol", "Side"]);
});

test("the selection bar acts on the selected rows, and when its action ends the selection the focus goes to the grid's active cell", async ({ page }) => {
  const grid = await openGrid(page, "selection-bar", "Orders");
  const bar = page.getByRole("toolbar", { name: "Selection" });
  await expect(bar).toContainText("2 selected");
  // Export keeps the selection, and the focus on its button.
  await bar.getByRole("button", { name: "Export" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Exported 1 times.")).toBeVisible();
  await expect(bar.getByRole("button", { name: "Export" })).toBeFocused();
  // Mark filled ends it: the bar goes, the focus lands in the grid.
  await page.keyboard.press("ArrowLeft");
  await expect(bar.getByRole("button", { name: "Mark filled" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(bar).toHaveCount(0);
  await expect(page.locator(":focus")).toHaveAttribute("data-cell", "0:0");
  // Select again from the keyboard: Space on the active row brings the bar back.
  await page.keyboard.press("Space");
  await expect(page.getByRole("toolbar", { name: "Selection" })).toContainText("1 selected");
});

test("a cell's tone is a symbol in the tone's colour, kept on its own plate in a selected row", async ({ page }) => {
  const grid = await openGrid(page, "cell-tone", "Orders");
  const symbols = grid.locator(".stoa-data-grid__tone");
  await expect(symbols.first()).toBeVisible();
  const colours = await symbols.evaluateAll((els) =>
    els.map((el) => ({ tone: el.className.replace(/.*--/, ""), colour: getComputedStyle(el).color, plate: getComputedStyle(el).backgroundColor, cell: getComputedStyle(el.parentElement!).backgroundColor })),
  );
  const probe = await page.evaluate(() => {
    const span = document.createElement("span");
    document.body.append(span);
    const read = (name: string) => {
      span.style.color = `var(${name})`;
      return getComputedStyle(span).color;
    };
    const out = { up: read("--stoa-color-up"), down: read("--stoa-color-down"), warning: read("--stoa-color-warning"), muted: read("--stoa-color-text-muted"), surface: read("--stoa-color-surface") };
    span.remove();
    return out;
  });
  const expected = { positive: probe.up, negative: probe.down, warning: probe.warning, neutral: probe.muted } as Record<string, string>;
  for (const c of colours) {
    expect(c.colour).toBe(expected[c.tone]);
    expect(c.plate).toBe(probe.surface);
  }
  // The selected row's cells take another fill; the symbol's plate does not.
  expect(colours.some((c) => c.cell !== probe.surface)).toBe(true);
});
for (const [how, close] of [
  ["Escape", ["Escape"]],
  ["its safe action", ["Enter"]],
  ["its primary action, which saves the change", ["Tab", "Enter"]],
] as const) {
  test(`after a confirmation opened from an editor closes with ${how}, the focus is back on the edited cell`, async ({ page }) => {
    await page.goto("/iframe.html?id=data-datagrid--edit-with-confirmation&viewMode=story");
    const grid = page.getByRole("grid", { name: "Orders, editable" });
    // The status cell of the first row: its column is the fifth.
    await grid.locator('[data-cell="0:4"]').click();
    await page.keyboard.press("Enter");
    await expect(grid.getByRole("listbox")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("alertdialog", { name: "Change the status?" });
    await expect(dialog).toBeVisible();
    // The safe action has the focus when the confirmation opens.
    for (const key of close) await page.keyboard.press(key);
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(":focus")).toHaveAttribute("data-cell", "0:4");
  });
}

test("drawn cells: the arrows go cell to cell, Enter reaches a case's link and follows it, Escape returns, and Tab leaves without visiting the links", async ({ page }) => {
  const grid = await openGrid(page, "drawn-cells", "Complaints");
  const focused = page.locator(":focus");
  // The selection column, the case (pinned), the client, the time left.
  await grid.locator('[data-cell="0:2"]').click();
  await page.keyboard.press("ArrowLeft");
  await expect(focused).toHaveAttribute("data-cell", "0:1");
  await expect(focused).toHaveAccessibleName("CMP-1001");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(focused).toHaveAttribute("data-cell", "0:3");
  await expect(focused).toHaveAccessibleName("3 working days overdue");
  await expect(focused.locator(".stoa-countdown")).toHaveAttribute("data-state", "overdue");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(grid.getByRole("link", { name: "CMP-1001" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Opened CMP-1001.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(focused).toHaveAttribute("data-cell", "0:1");
  await page.keyboard.press("ArrowDown");
  await expect(focused).toHaveAttribute("data-cell", "1:1");
  // One tab stop: Tab goes past every link in the grid.
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest('[role="grid"]') ?? null)).toBeNull();
});

test("right to left, a drawn cell is named by its text in Arabic and the arrows still mirror", async ({ page }) => {
  await page.goto(`${story("drawn-cells")}&globals=dir:rtl;lang:ar`);
  const grid = page.getByRole("grid", { name: "الشكاوى" });
  await expect(grid.getByRole("columnheader").first()).toBeVisible();
  const names = await grid.locator('[data-cell$=":3"]:not([data-cell^="-1"])').evaluateAll((cells) =>
    cells.map((c) => [c.getAttribute("aria-label"), c.querySelector(".stoa-countdown__text")?.textContent]),
  );
  expect(names.length).toBeGreaterThan(5);
  for (const [label, text] of names) expect(label).toBe(text);
  // The client's cell; the case's centre is its link, which a click would focus.
  await grid.locator('[data-cell="0:2"]').click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).toHaveAttribute("data-cell", "0:1");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(":focus")).toHaveAttribute("data-cell", "0:2");
  // The case column, pinned, stays at the right edge, after the selection column.
  const box = (await grid.boundingBox())!;
  const pinned = (await grid.locator('[data-cell="0:1"]').boundingBox())!;
  expect(Math.round(box.x + box.width - (pinned.x + pinned.width))).toBe(40);
});
