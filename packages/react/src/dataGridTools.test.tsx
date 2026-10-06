// @vitest-environment jsdom
// DataGrid's cell tone and column order, DataGridColumnChooser and
// DataGridSelectionBar: what they draw, what they report, and where the
// focus goes when the selection bar closes.
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DataGrid, DataGridColumnChooser, DataGridSelectionBar, I18nProvider, type DataGridColumn } from "./index";

afterEach(cleanup);

type Row = { id: string; name: string; status: string; qty: number };
const ROWS: Row[] = [
  { id: "a", name: "First", status: "late", qty: 3 },
  { id: "b", name: "Second", status: "due", qty: -2 },
  { id: "c", name: "Third", status: "done", qty: 0 },
];
const COLUMNS: DataGridColumn<Row>[] = [
  { id: "name", header: "Name", accessor: (r) => r.name, width: 120 },
  {
    id: "status",
    header: "Status",
    accessor: (r) => r.status,
    width: 100,
    tone: (v) => (v === "late" ? "negative" : v === "due" ? "warning" : v === "done" ? "positive" : null),
  },
  { id: "qty", header: "Quantity", accessor: (r) => r.qty, width: 100, tone: (v) => (Number(v) < 0 ? "negative" : null) },
];

// Hidden too: an open sheet hides the page behind it from assistive technology.
const headers = () => screen.getAllByRole("columnheader", { hidden: true }).map((h) => h.textContent);

describe("DataGrid: cell tone", () => {
  it("draws the tone's symbol before the value, hidden from assistive technology, and nothing without a tone", () => {
    render(<DataGrid label="Tasks" rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);
    const late = screen.getByRole("gridcell", { name: "late" });
    const symbol = late.querySelector(".stoa-data-grid__tone")!;
    expect([symbol.textContent, symbol.getAttribute("aria-hidden"), symbol.className]).toEqual(["✗", "true", "stoa-data-grid__tone stoa-data-grid__tone--negative"]);
    expect(screen.getByRole("gridcell", { name: "due" }).querySelector(".stoa-data-grid__tone")?.textContent).toBe("!");
    expect(screen.getByRole("gridcell", { name: "done" }).querySelector(".stoa-data-grid__tone")?.textContent).toBe("✓");
    // A number column: the symbol before the number, none for a value without a tone.
    const qty = screen.getAllByRole("gridcell").filter((c) => c.getAttribute("aria-colindex") === "3");
    expect(qty.map((c) => c.querySelector(".stoa-data-grid__tone")?.textContent ?? null)).toEqual([null, "✗", null]);
  });
});

describe("DataGrid: column order and hidden columns", () => {
  it("shows the columns in the order asked for, without the hidden ones, and the rest after them", () => {
    const { rerender } = render(<DataGrid label="Tasks" rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} columnOrder={["qty", "name"]} />);
    expect(headers()).toEqual(["Quantity", "Name", "Status"]);
    rerender(<DataGrid label="Tasks" rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} columnOrder={["qty", "name"]} hiddenColumns={["name"]} />);
    expect(headers()).toEqual(["Quantity", "Status"]);
    expect(screen.getByRole("grid").getAttribute("aria-colcount")).toBe("2");
  });

  it("keeps pinned columns first, whatever the order", () => {
    const pinned = COLUMNS.map((c) => (c.id === "name" ? { ...c, pinned: true } : c));
    render(<DataGrid label="Tasks" rows={ROWS} columns={pinned} rowKey={(r) => r.id} columnOrder={["status", "qty", "name"]} />);
    expect(headers()).toEqual(["Name", "Status", "Quantity"]);
  });
});

function Chooser({ initialHidden = [] as string[] }) {
  const [order, setOrder] = useState(COLUMNS.map((c) => c.id));
  const [hidden, setHidden] = useState(initialHidden);
  return (
    <>
      <DataGridColumnChooser columns={COLUMNS} order={order} hidden={hidden} onOrderChange={setOrder} onHiddenChange={setHidden} />
      <DataGrid label="Tasks" rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} columnOrder={order} hiddenColumns={hidden} />
    </>
  );
}

describe("DataGridColumnChooser", () => {
  it("opens a sheet listing every column in order, each with a check box and move buttons named after it", () => {
    render(<Chooser initialHidden={["qty"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const sheet = screen.getByRole("dialog", { name: "Columns" });
    const list = within(sheet).getByRole("grid", { name: "Columns: shown when checked, in this order" });
    expect(within(list).getAllByRole("checkbox").map((c) => [c.closest("label")?.textContent, (c as HTMLInputElement).checked])).toEqual([
      ["Name", true],
      ["Status", true],
      ["Quantity", false],
    ]);
    expect(within(list).getByRole("button", { name: "Move up: Quantity" })).toBeTruthy();
  });

  it("hides and shows a column with its check box, and moves it with its buttons, and the grid follows", () => {
    render(<Chooser />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const sheet = screen.getByRole("dialog", { name: "Columns" });
    fireEvent.click(within(sheet).getByRole("checkbox", { name: "Status" }));
    expect(headers()).toEqual(["Name", "Quantity"]);
    fireEvent.click(within(sheet).getByRole("button", { name: "Move up: Quantity" }));
    fireEvent.click(within(sheet).getByRole("button", { name: "Move up: Quantity" }));
    expect(headers()).toEqual(["Quantity", "Name"]);
    fireEvent.click(within(sheet).getByRole("checkbox", { name: "Status" }));
    expect(headers()).toEqual(["Quantity", "Name", "Status"]);
  });

  it("does not let the last column shown be hidden", () => {
    render(<Chooser initialHidden={["name", "qty"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const status = within(screen.getByRole("dialog")).getByRole("checkbox", { name: "Status" }) as HTMLInputElement;
    expect(status.disabled).toBe(true);
  });

  it("speaks Russian under a Russian locale", () => {
    render(
      <I18nProvider locale="ru-RU">
        <Chooser />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Столбцы" }));
    expect(screen.getByRole("grid", { name: "Столбцы: отмеченные показаны в этом порядке" })).toBeTruthy();
  });
});

describe("DataGridSelectionBar", () => {
  it("is not drawn while nothing is selected", () => {
    const { container } = render(<DataGridSelectionBar count={0} actions={[]} onClear={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("is a toolbar named Selection with the count, the actions and Clear selection", () => {
    const onExport = vi.fn();
    const onClear = vi.fn();
    render(<DataGridSelectionBar count={1200} actions={[{ id: "export", label: "Export", onPress: onExport }]} onClear={onClear} />);
    const bar = screen.getByRole("toolbar", { name: "Selection" });
    expect(bar.textContent).toContain("1,200 selected");
    fireEvent.click(within(bar).getByRole("button", { name: "Export" }));
    expect(onExport).toHaveBeenCalledOnce();
    fireEvent.click(within(bar).getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("leaves the focus on the tab stop where it was once an action ends the selection", async () => {
    function Bar() {
      const [count, setCount] = useState(2);
      return (
        <div>
          <DataGridSelectionBar count={count} actions={[{ id: "done", label: "Mark done", onPress: () => setCount(0) }]} onClear={() => setCount(0)} />
          <button type="button">The grid's active cell</button>
        </div>
      );
    }
    render(<Bar />);
    const done = screen.getByRole("button", { name: "Mark done" });
    act(() => done.focus());
    fireEvent.click(done);
    expect(screen.queryByRole("toolbar")).toBeNull();
    await waitFor(() => expect(document.activeElement?.textContent).toBe("The grid's active cell"));
  });

  it("speaks Russian and writes the count in the locale's digits", () => {
    render(
      <I18nProvider locale="ru-RU">
        <DataGridSelectionBar count={1200} actions={[]} onClear={() => {}} />
      </I18nProvider>,
    );
    const bar = screen.getByRole("toolbar", { name: "Выбор" });
    expect(bar.textContent).toContain("Выбрано: 1 200");
    expect(within(bar).getByRole("button", { name: "Снять выбор" })).toBeTruthy();
  });
});
