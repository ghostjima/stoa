// @vitest-environment jsdom
// DataGrid: ARIA on the rendered window, the key map, selection, sort,
// editing and validation, right-to-left arrows, and the locale. jsdom has
// no layout, so the grid draws its fallback window: the first 20 rows of
// view and 4 of overscan, and every column.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DataGrid, I18nProvider, type DataGridColumn, type DataGridProps } from "./index";
import { sampleOrderColumns, sampleOrders, type SampleOrder } from "./gridFixtures";

afterEach(cleanup);

type Item = { id: string; name: string; qty: number; status: string; note: string };

const STATUS = [
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
  { id: "void", label: "Void" },
];

const items = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `k${i}`,
    name: `Item ${String(i).padStart(4, "0")}`,
    qty: (i * 7919) % 1000,
    status: STATUS[i % 3]!.id,
    note: "",
  }));

const COLUMNS: DataGridColumn<Item>[] = [
  { id: "name", header: "Name", accessor: (r) => r.name, width: 120, pinned: true, sortable: true },
  { id: "qty", header: "Quantity", accessor: (r) => r.qty, width: 100, sortable: true },
  {
    id: "status",
    header: "Status",
    accessor: (r) => r.status,
    width: 100,
    editor: { kind: "enum", options: STATUS, validate: (v, row) => (v === "void" && row.note === "" ? "A void item needs a note." : null) },
  },
  {
    id: "note",
    header: "Note",
    accessor: (r) => r.note,
    width: 160,
    editor: { kind: "text", validate: (v) => (v.length > 5 ? `At most 5 characters, not ${v.length}.` : null) },
  },
];

function setup(props: Partial<DataGridProps<Item>> = {}, count = 1000) {
  const utils = render(<DataGrid label="Items" rows={items(count)} columns={COLUMNS} rowKey={(r) => r.id} {...props} />);
  const grid = screen.getByRole("grid", { name: "Items" });
  return { ...utils, grid };
}

const cell = (grid: HTMLElement, row: number, column: number) => {
  const el = grid.querySelector<HTMLElement>(`[data-cell="${row}:${column}"]`);
  if (!el) throw new Error(`no cell ${row}:${column}`);
  return el;
};
const focused = () => document.activeElement as HTMLElement;
const key = (k: string, init: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(focused(), { key: k, ...init });
const position = () => focused().getAttribute("data-cell");
const status = () => screen.getAllByRole("status").map((s) => s.textContent).join(" ");

describe("DataGrid ARIA", () => {
  it("names counts and positions on the rendered window only", () => {
    const { grid } = setup({ selectionMode: "multiple" });
    expect(grid.getAttribute("aria-rowcount")).toBe("1001");
    expect(grid.getAttribute("aria-colcount")).toBe("5");
    expect(grid.getAttribute("aria-multiselectable")).toBe("true");
    const rows = within(grid).getAllByRole("row");
    // The header row and the fallback window, not a thousand rows.
    expect(rows.length).toBe(1 + 25);
    expect(rows[0]!.getAttribute("aria-rowindex")).toBe("1");
    expect(rows[1]!.getAttribute("aria-rowindex")).toBe("2");
    expect(rows[25]!.getAttribute("aria-rowindex")).toBe("26");
    const headers = within(grid).getAllByRole("columnheader");
    expect(headers.map((h) => h.getAttribute("aria-colindex"))).toEqual(["1", "2", "3", "4", "5"]);
    expect(headers[2]!.getAttribute("aria-sort")).toBe("none");
    expect(headers[3]!.hasAttribute("aria-sort")).toBe(false);
    const first = rows[1]!;
    expect(first.getAttribute("aria-selected")).toBe("false");
    expect(within(first).getByRole("rowheader").textContent).toBe("Item 0000");
    expect(within(first).getAllByRole("gridcell").map((c) => c.getAttribute("aria-colindex"))).toEqual(["1", "3", "4", "5"]);
    // Only the editable columns lack aria-readonly.
    expect(within(first).getAllByRole("gridcell")[1]!.getAttribute("aria-readonly")).toBe("true");
    expect(within(first).getAllByRole("gridcell")[2]!.hasAttribute("aria-readonly")).toBe(false);
  });

  it("has exactly one tab stop, the active cell", () => {
    const { grid } = setup();
    const stops = grid.querySelectorAll('[tabindex="0"]');
    expect(stops.length).toBe(1);
    expect(stops[0]!.getAttribute("data-cell")).toBe("0:0");
  });

  it("is read-only and not multiselectable without editors or selection", () => {
    render(<DataGrid label="Plain" rows={items(3)} columns={COLUMNS.slice(0, 2)} rowKey={(r) => r.id} />);
    const grid = screen.getByRole("grid", { name: "Plain" });
    expect(grid.getAttribute("aria-readonly")).toBe("true");
    expect(grid.hasAttribute("aria-multiselectable")).toBe(false);
    expect(within(grid).getAllByRole("row")[1]!.hasAttribute("aria-selected")).toBe(false);
  });
});

describe("DataGrid key map", () => {
  it("moves with the arrows, Home and End, and reaches the header row with ArrowUp", () => {
    const { grid } = setup();
    fireEvent.click(cell(grid, 0, 0));
    expect(position()).toBe("0:0");
    key("ArrowDown");
    expect(position()).toBe("1:0");
    key("ArrowRight");
    expect(position()).toBe("1:1");
    key("End");
    expect(position()).toBe("1:3");
    key("Home");
    expect(position()).toBe("1:0");
    key("ArrowUp");
    key("ArrowUp");
    expect(position()).toBe("-1:0");
    expect(focused().getAttribute("role")).toBe("columnheader");
    key("ArrowUp");
    expect(position()).toBe("-1:0");
    key("ArrowDown");
    expect(position()).toBe("0:0");
  });

  it("jumps to the grid's corners with Ctrl or Cmd and Home or End, keeping the far row in the DOM", () => {
    const { grid } = setup();
    fireEvent.click(cell(grid, 3, 1));
    key("End", { ctrlKey: true });
    expect(position()).toBe("999:3");
    expect(focused().closest('[role="row"]')!.getAttribute("aria-rowindex")).toBe("1001");
    key("Home", { metaKey: true });
    expect(position()).toBe("0:0");
  });

  it("pages by the rows in view", () => {
    const { grid } = setup();
    fireEvent.click(cell(grid, 0, 1));
    key("PageDown");
    expect(position()).toBe("20:1");
    key("PageDown");
    expect(position()).toBe("40:1");
    key("PageUp");
    expect(position()).toBe("20:1");
  });

  it("mirrors the left and right arrows in a right-to-left grid", () => {
    render(
      <div dir="rtl">
        <DataGrid label="Items" rows={items(5)} columns={COLUMNS} rowKey={(r) => r.id} />
      </div>,
    );
    const grid = screen.getByRole("grid");
    fireEvent.click(cell(grid, 1, 1));
    key("ArrowLeft");
    expect(position()).toBe("1:2");
    key("ArrowRight");
    key("ArrowRight");
    expect(position()).toBe("1:0");
  });

  it("reports the active cell and follows a controlled one", () => {
    const onActiveCellChange = vi.fn();
    const { grid, rerender } = setup({ activeCell: { row: 2, column: 1 }, onActiveCellChange });
    expect(grid.querySelector('[tabindex="0"]')!.getAttribute("data-cell")).toBe("2:1");
    act(() => cell(grid, 2, 1).focus());
    key("ArrowDown");
    expect(onActiveCellChange).toHaveBeenLastCalledWith({ row: 3, column: 1 });
    // Still controlled: the parent has not moved it.
    expect(grid.querySelector('[tabindex="0"]')!.getAttribute("data-cell")).toBe("2:1");
    rerender(<DataGrid label="Items" rows={items(1000)} columns={COLUMNS} rowKey={(r) => r.id} activeCell={{ row: 3, column: 1 }} />);
    expect(grid.querySelector('[tabindex="0"]')!.getAttribute("data-cell")).toBe("3:1");
  });
});

describe("DataGrid sort", () => {
  const names = (grid: HTMLElement) =>
    within(grid)
      .getAllByRole("rowheader")
      .slice(0, 3)
      .map((c) => c.textContent);

  it("sorts from the header with Enter, cycling ascending, descending and none, and announces it", () => {
    const onSortChange = vi.fn();
    const { grid } = setup({ onSortChange }, 30);
    fireEvent.click(cell(grid, 0, 1));
    key("ArrowUp");
    const header = within(grid).getByRole("columnheader", { name: "Quantity" });
    expect(focused()).toBe(header);
    key("Enter");
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(onSortChange).toHaveBeenLastCalledWith({ column: "qty", direction: "ascending" });
    expect(status()).toContain("Sorted by Quantity, ascending");
    const quantities = within(grid)
      .getAllByRole("row")
      .slice(1)
      .map((r) => Number(within(r).getAllByRole("gridcell")[0]!.textContent));
    expect(quantities).toEqual([...quantities].sort((a, b) => a - b));
    key("Enter");
    expect(header.getAttribute("aria-sort")).toBe("descending");
    expect(status()).toContain("Sorted by Quantity, descending");
    key("Enter");
    expect(header.getAttribute("aria-sort")).toBe("none");
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    expect(names(grid)).toEqual(["Item 0000", "Item 0001", "Item 0002"]);
  });

  it("shows a controlled sort without reordering when the rows come sorted", () => {
    const { grid } = setup({ sort: { column: "name", direction: "descending" }, manualSorting: true }, 5);
    expect(within(grid).getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort")).toBe("descending");
    expect(names(grid)).toEqual(["Item 0000", "Item 0001", "Item 0002"]);
  });

  it("does not sort a column that is not sortable", () => {
    const { grid } = setup({}, 5);
    fireEvent.click(within(grid).getByRole("columnheader", { name: "Status" }));
    expect(within(grid).getByRole("columnheader", { name: "Status" }).hasAttribute("aria-sort")).toBe(false);
    expect(names(grid)).toEqual(["Item 0000", "Item 0001", "Item 0002"]);
  });
});

describe("DataGrid selection", () => {
  const rowOf = (grid: HTMLElement, index: number) => grid.querySelector<HTMLElement>(`[role="row"][aria-rowindex="${index + 2}"]`)!;

  it("toggles a row with Space, extends a range with Shift and an arrow, and selects all with Ctrl+A", () => {
    const onSelectionChange = vi.fn();
    const { grid } = setup({ selectionMode: "multiple", onSelectionChange }, 50);
    fireEvent.click(cell(grid, 2, 1));
    key(" ");
    expect(rowOf(grid, 2).getAttribute("aria-selected")).toBe("true");
    expect([...onSelectionChange.mock.lastCall![0]]).toEqual(["k2"]);
    key("ArrowDown", { shiftKey: true });
    key("ArrowDown", { shiftKey: true });
    expect([...onSelectionChange.mock.lastCall![0]].sort()).toEqual(["k2", "k3", "k4"]);
    key("ArrowUp", { shiftKey: true });
    expect([...onSelectionChange.mock.lastCall![0]].sort()).toEqual(["k2", "k3"]);
    expect(rowOf(grid, 4).getAttribute("aria-selected")).toBe("false");
    expect(status()).toContain("50 rows, 2 selected.");
    key("a", { ctrlKey: true });
    expect(onSelectionChange.mock.lastCall![0].size).toBe(50);
    expect(status()).toContain("50 rows, 50 selected.");
  });

  it("draws the select-all box checked, unchecked or indeterminate, and toggles every row from it", () => {
    const { grid } = setup({ selectionMode: "multiple", defaultSelectedKeys: ["k1"] }, 10);
    const all = within(grid).getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
    fireEvent.click(all);
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    expect(within(grid).getAllByRole("row").slice(1).every((r) => r.getAttribute("aria-selected") === "true")).toBe(true);
    fireEvent.click(all);
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(false);
  });

  it("selects every row with Space or Enter on the selection column's header", () => {
    const { grid } = setup({ selectionMode: "multiple" }, 10);
    fireEvent.click(cell(grid, 0, 0));
    key("ArrowUp");
    expect(position()).toBe("-1:0");
    key("Enter");
    expect((within(grid).getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement).checked).toBe(true);
    key(" ");
    expect((within(grid).getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement).checked).toBe(false);
  });

  it("names each row's checkbox by the row's first value", () => {
    const { grid } = setup({ selectionMode: "multiple" }, 3);
    const box = within(grid).getByRole("checkbox", { name: "Select row Item 0001" });
    fireEvent.click(box);
    expect(rowOf(grid, 1).getAttribute("aria-selected")).toBe("true");
  });

  it("follows controlled selected keys", () => {
    const { grid } = setup({ selectionMode: "multiple", selectedKeys: new Set(["k0"]) }, 3);
    fireEvent.click(cell(grid, 1, 1));
    key(" ");
    expect(rowOf(grid, 1).getAttribute("aria-selected")).toBe("false");
    expect(rowOf(grid, 0).getAttribute("aria-selected")).toBe("true");
  });
});

describe("DataGrid editing", () => {
  it("edits an enum in a listbox: Enter opens, the arrows choose, Enter saves", () => {
    const onEdit = vi.fn();
    const { grid } = setup({ onEdit }, 10);
    fireEvent.click(cell(grid, 0, 2));
    key("Enter");
    const list = screen.getByRole("listbox", { name: "Status" });
    expect(focused()).toBe(list);
    expect(within(list).getByRole("option", { name: "Open" }).getAttribute("aria-selected")).toBe("true");
    key("ArrowDown");
    const done = within(list).getByRole("option", { name: "Done" });
    expect(list.getAttribute("aria-activedescendant")).toBe(done.id);
    key("Enter");
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ rowKey: "k0", column: "status", value: "done" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(position()).toBe("0:2");
  });

  it("cancels with Escape and returns focus to the cell", () => {
    const onEdit = vi.fn();
    const { grid } = setup({ onEdit }, 10);
    fireEvent.click(cell(grid, 1, 3));
    key("F2");
    const input = screen.getByRole("textbox", { name: "Note" });
    expect(focused()).toBe(input);
    fireEvent.change(input, { target: { value: "hi" } });
    key("Escape");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
    expect(position()).toBe("1:3");
  });

  it("opens the editor on a double click as a mouse makes it: two clicks, then the double click", () => {
    const { grid } = setup({}, 10);
    const target = cell(grid, 2, 3);
    fireEvent.click(target);
    fireEvent.click(target);
    fireEvent.doubleClick(target);
    const input = screen.getByRole("textbox", { name: "Note" });
    expect(focused()).toBe(input);
  });

  it("refuses an invalid text, says why in an alert tied to the input, and saves once it is fixed", () => {
    const onEdit = vi.fn();
    const { grid } = setup({ onEdit }, 10);
    fireEvent.doubleClick(cell(grid, 2, 3));
    const input = screen.getByRole("textbox", { name: "Note" });
    fireEvent.change(input, { target: { value: "far too long" } });
    key("Enter");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("At most 5 characters, not 12.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
    expect(onEdit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "short" } });
    expect(screen.queryByRole("alert")).toBeNull();
    key("Enter");
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ rowKey: "k2", column: "note", value: "short" }));
  });

  it("validates an enum choice against the row", () => {
    const onEdit = vi.fn();
    const { grid } = setup({ onEdit }, 10);
    fireEvent.click(cell(grid, 0, 2));
    key("Enter");
    key("End");
    key("Enter");
    const list = screen.getByRole("listbox");
    expect(screen.getByRole("alert").textContent).toBe("A void item needs a note.");
    expect(list.getAttribute("aria-invalid")).toBe("true");
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("does not open an editor on a read-only cell", () => {
    const { grid } = setup({}, 5);
    fireEvent.click(cell(grid, 0, 1));
    key("Enter");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("DataGrid states and locale", () => {
  it("says it is empty, and the grid is described by the sentence", () => {
    const { grid } = setup({}, 0);
    expect(grid.getAttribute("aria-rowcount")).toBe("1");
    const message = screen.getByText("No rows to show.");
    expect(grid.getAttribute("aria-describedby")).toBe(message.id);
    expect(grid.querySelector('[tabindex="0"]')!.getAttribute("role")).toBe("columnheader");
  });

  it("is busy while loading, draws skeleton lines and announces the loading", () => {
    const { grid, container } = setup({ loading: true }, 10);
    expect(grid.getAttribute("aria-busy")).toBe("true");
    expect(within(grid).getAllByRole("row").length).toBe(1);
    expect(container.querySelectorAll(".stoa-data-grid__skeleton").length).toBeGreaterThan(0);
    expect(status()).toBe("Loading rows");
  });

  it("marks search matches", () => {
    const { grid } = setup({ highlight: "item 000" }, 12);
    const marks = grid.querySelectorAll("mark");
    expect(marks.length).toBe(10);
    expect(marks[0]!.textContent).toBe("Item 000");
  });

  it("takes words and digits from the locale", () => {
    const rows: SampleOrder[] = sampleOrders(3);
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <DataGrid label="الأوامر" rows={rows} columns={sampleOrderColumns("ar")} rowKey={(o) => o.id} selectionMode="multiple" />
      </I18nProvider>,
    );
    const grid = screen.getByRole("grid", { name: "الأوامر" });
    expect(within(grid).getByRole("checkbox", { name: "تحديد كل الصفوف" })).toBeTruthy();
    const quantity = within(grid).getAllByRole("row")[1]!.querySelector('[aria-colindex="9"]')!;
    expect(quantity.textContent).toMatch(/^[٠-٩٬]+$/);
  });
});

describe("DataGrid when rows change under it", () => {
  const withNew = (rows: Item[], ...ids: string[]) => [
    ...ids.map((id) => ({ id, name: `New ${id}`, qty: 1, status: "open", note: "" })),
    ...rows,
  ];

  function Live(props: Partial<DataGridProps<Item>> & { rows: Item[] }) {
    return <DataGrid label="Items" columns={COLUMNS} rowKey={(r) => r.id} {...props} />;
  }

  it("reports when an edit starts, and when it ends without a change", () => {
    const onEditStart = vi.fn();
    const onEditCancel = vi.fn();
    const onEdit = vi.fn();
    const { grid } = setup({ onEditStart, onEditCancel, onEdit }, 10);
    fireEvent.click(cell(grid, 1, 3));
    key("F2");
    expect(onEditStart).toHaveBeenCalledWith(expect.objectContaining({ rowKey: "k1", column: "note" }));
    expect(onEditStart.mock.calls[0]![0].row.id).toBe("k1");
    // Escape: cancelled.
    key("Escape");
    expect(onEditCancel).toHaveBeenCalledTimes(1);
    expect(onEditCancel).toHaveBeenLastCalledWith(expect.objectContaining({ rowKey: "k1", column: "note" }));
    // Enter on the value it started with: nothing changed, so cancelled too.
    key("Enter");
    key("Enter");
    expect(onEditCancel).toHaveBeenCalledTimes(2);
    // A saved change is an edit, not a cancel.
    key("Enter");
    fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "ok" } });
    key("Enter");
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onEditCancel).toHaveBeenCalledTimes(2);
    expect(onEditStart).toHaveBeenCalledTimes(3);
    // Leaving with an invalid value drops it: cancelled.
    key("Enter");
    fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "far too long" } });
    fireEvent.blur(screen.getByRole("textbox", { name: "Note" }), { relatedTarget: document.body });
    expect(onEditCancel).toHaveBeenCalledTimes(3);
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("keeps an open editor on its row when rows are inserted above it", () => {
    const onEdit = vi.fn();
    const rows = items(10);
    const { rerender } = render(<Live rows={rows} onEdit={onEdit} />);
    const grid = screen.getByRole("grid");
    fireEvent.click(cell(grid, 2, 3));
    key("F2");
    const input = screen.getByRole("textbox", { name: "Note" });
    fireEvent.change(input, { target: { value: "mine" } });
    rerender(<Live rows={withNew(rows, "n1", "n2")} onEdit={onEdit} />);
    const still = screen.getByRole("textbox", { name: "Note" });
    expect(still).toBe(input);
    expect(still.closest("[role=row]")!.getAttribute("aria-rowindex")).toBe("6");
    expect(document.activeElement).toBe(still);
    key("Enter");
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ rowKey: "k2", column: "note", value: "mine" }));
  });

  it("closes the editor and reports a cancel when its row goes away", () => {
    const onEditCancel = vi.fn();
    const rows = items(10);
    const { rerender } = render(<Live rows={rows} onEditCancel={onEditCancel} />);
    fireEvent.click(cell(screen.getByRole("grid"), 2, 3));
    key("F2");
    rerender(<Live rows={rows.filter((r) => r.id !== "k2")} onEditCancel={onEditCancel} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onEditCancel).toHaveBeenCalledWith(expect.objectContaining({ rowKey: "k2", column: "note" }));
  });

  it("keeps the active cell, and the focus, on its row when rows are inserted above or the order changes", () => {
    const onActiveCellChange = vi.fn();
    const rows = items(10);
    const { rerender } = render(<Live rows={rows} onActiveCellChange={onActiveCellChange} />);
    const grid = screen.getByRole("grid");
    fireEvent.click(cell(grid, 3, 1));
    expect(focused().closest("[role=row]")!.textContent).toContain("Item 0003");
    rerender(<Live rows={withNew(rows, "n1")} onActiveCellChange={onActiveCellChange} />);
    expect(onActiveCellChange).toHaveBeenLastCalledWith({ row: 4, column: 1 });
    expect(position()).toBe("4:1");
    expect(focused().closest("[role=row]")!.textContent).toContain("Item 0003");
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    // A new order moves the row's element in the DOM; focus stays on it.
    rerender(<Live rows={[...withNew(rows, "n1")].reverse()} onActiveCellChange={onActiveCellChange} />);
    expect(position()).toBe("6:1");
    expect(focused().closest("[role=row]")!.textContent).toContain("Item 0003");
    // The row gone: the position stays.
    rerender(<Live rows={rows.filter((r) => r.id !== "k3")} onActiveCellChange={onActiveCellChange} />);
    expect(grid.querySelector('[tabindex="0"]')!.getAttribute("data-cell")).toBe("6:1");
  });

  it("does not take the focus back when it was outside the grid", () => {
    const rows = items(10);
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        <Live rows={rows} />
      </>,
    );
    fireEvent.click(cell(screen.getByRole("grid"), 3, 1));
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    act(() => elsewhere.focus());
    rerender(
      <>
        <button type="button">Elsewhere</button>
        <Live rows={[...rows].reverse()} />
      </>,
    );
    expect(document.activeElement).toBe(elsewhere);
  });
});
