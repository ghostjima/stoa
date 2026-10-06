import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { I18nProvider } from "react-aria-components";
import { DataGrid, type DataGridColumn, type DataGridSort } from "./DataGrid";
import { TextField } from "./Form";
import { Panel } from "./Panel";
import { useShortcuts } from "./Shortcuts";
import { useStoaFormat } from "./locale";
import { sampleOrderColumns, sampleOrders, type SampleOrder } from "./gridFixtures";

const meta: Meta = { title: "Data/DataGrid" };
export default meta;

const orderKey = (o: SampleOrder) => o.id;

// Built once per page, so a story's first render measures the grid, not
// the data.
let fiftyThousand: SampleOrder[] | null = null;
const largeRows = () => (fiftyThousand ??= sampleOrders(50_000));

/** 50,000 orders by 30 columns. Only the rows and columns in view are in
 * the DOM; order and account stay pinned while the grid scrolls sideways.
 * Sort from a header (click, or Enter on it), select with Space, Shift
 * with an arrow, or Ctrl or Cmd with A; type in the search field to mark
 * matches. packages/react/e2e/data-grid.measure.mjs measures this story. */
export const FiftyThousandRows: StoryObj = {
  render: () => {
    const rows = largeRows();
    const columns = useMemo(() => sampleOrderColumns(), []);
    const [search, setSearch] = useState("");
    // Read by packages/react/e2e/data-grid.measure.mjs: the time from this
    // render to the first painted frame with cells.
    if (typeof performance !== "undefined") performance.mark("stoa-data-grid-render");
    return (
      <Panel title="Orders">
        <div style={{ display: "grid", gap: "var(--stoa-space-3)" }}>
          <div style={{ maxInlineSize: 320 }}>
            <TextField label="Mark matches" value={search} onChange={setSearch} />
          </div>
          <DataGrid label="Orders" rows={rows} columns={columns} rowKey={orderKey} selectionMode="multiple" highlight={search} />
        </div>
      </Panel>
    );
  },
};

/** Status and note are editable: Enter or F2 opens the editor, Enter
 * saves, Escape cancels. A note longer than 40 characters is refused, and
 * so is a rejected status without a note; the error is announced. Sort
 * and selection are controlled by the story. */
export const Editable: StoryObj = {
  render: () => {
    const [rows, setRows] = useState(() => sampleOrders(200, 5));
    const columns = useMemo(() => sampleOrderColumns(), []);
    const [sort, setSort] = useState<DataGridSort | null>({ column: "id", direction: "ascending" });
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    return (
      <Panel title="Orders">
        <DataGrid
          label="Orders, editable"
          rows={rows}
          columns={columns}
          rowKey={orderKey}
          selectionMode="multiple"
          sort={sort}
          onSortChange={setSort}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          onEdit={({ rowKey, column, value }) =>
            setRows((previous) => previous.map((o) => (o.id === rowKey ? { ...o, [column]: value } : o)))
          }
        />
      </Panel>
    );
  },
};

/** Rows that change while the grid is in use, as a live blotter's do:
 * press I to insert an order at the top, R to reverse the order, D to
 * delete the first five. The active cell and an open editor stay with
 * their row, and the focus stays on the active cell, at the same position
 * when its row was deleted. The line under the grid says when an edit starts
 * and when one ends without a change. */
export const LiveRows: StoryObj = {
  render: () => {
    const [rows, setRows] = useState(() => sampleOrders(100, 7));
    const [count, setCount] = useState(0);
    const [edit, setEdit] = useState("No edit yet.");
    const columns = useMemo(() => sampleOrderColumns(), []);
    useShortcuts([
      {
        key: "i",
        description: "Insert an order at the top",
        onTrigger: () => {
          const [fresh] = sampleOrders(1, 100 + count);
          setRows((previous) => [{ ...fresh!, id: `NEW-${String(count + 1).padStart(3, "0")}` }, ...previous]);
          setCount((n) => n + 1);
        },
      },
      { key: "r", description: "Reverse the order", onTrigger: () => setRows((previous) => [...previous].reverse()) },
      { key: "d", description: "Delete the first five orders", onTrigger: () => setRows((previous) => previous.slice(5)) },
    ]);
    return (
      <Panel title="Orders">
        <div style={{ display: "grid", gap: "var(--stoa-space-3)" }}>
          <DataGrid
            label="Live orders"
            rows={rows}
            columns={columns}
            rowKey={orderKey}
            onEditStart={({ rowKey }) => setEdit(`Editing ${rowKey}.`)}
            onEditCancel={({ rowKey }) => setEdit(`Edit of ${rowKey} cancelled.`)}
            onEdit={({ rowKey, column, value }) => {
              setEdit(`${rowKey} saved.`);
              setRows((previous) => previous.map((o) => (o.id === rowKey ? { ...o, [column]: value } : o)));
            }}
          />
          <p>{edit}</p>
        </div>
      </Panel>
    );
  },
};

/** No rows: the header stays, with the locale's sentence under it. */
export const Empty: StoryObj = {
  render: () => (
    <Panel title="Orders">
      <DataGrid label="Orders" rows={[]} columns={sampleOrderColumns()} rowKey={orderKey} selectionMode="multiple" />
    </Panel>
  ),
};

/** Rows on their way: skeleton lines under the header, the grid busy, and
 * the loading announced. */
export const Loading: StoryObj = {
  render: () => (
    <Panel title="Orders">
      <DataGrid label="Orders" rows={[]} columns={sampleOrderColumns()} rowKey={orderKey} selectionMode="multiple" loading />
    </Panel>
  ),
};

/** Arabic, right to left, whatever the toolbar says: pinned columns at
 * the right edge, the arrows mirrored, Arabic words and Arabic-Indic
 * digits. */
export const RightToLeft: StoryObj = {
  render: () => {
    const rows = useMemo(() => sampleOrders(5_000, 3), []);
    const columns = useMemo(() => sampleOrderColumns("ar"), []);
    return (
      <div dir="rtl" lang="ar">
        <I18nProvider locale="ar-u-nu-arab">
          <Panel title="الأوامر">
            <DataGrid label="الأوامر" rows={rows} columns={columns} rowKey={orderKey} selectionMode="multiple" />
          </Panel>
        </I18nProvider>
      </div>
    );
  },
};

type Move = { id: string; change: number; latency: number };

const MOVES: Move[] = [
  { id: "OFZ 26238", change: 1.25, latency: 4.2 },
  { id: "OFZ 26240", change: -0.42, latency: 16.9 },
  { id: "OFZ 26243", change: 0, latency: 0.5 },
];

/** Values with a sign or a unit in number columns: each cell's text is
 * isolated in the direction of its own first letter, so "-0.42%" keeps
 * its sign before the number and "16.9 ms" its unit after it in a
 * right-to-left page, while the column stays aligned to the end. */
export const SignedValues: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const h = arabic ? { id: "الإصدار", change: "التغير", latency: "زمن التسعير" } : { id: "Issue", change: "Change", latency: "Quote latency" };
    const columns = useMemo<DataGridColumn<Move>[]>(
      () => [
        { id: "id", header: h.id, accessor: (m) => m.id, width: 120, pinned: true },
        { id: "change", header: h.change, accessor: (m) => m.change, width: 112, format: (v, _, locale) => `${locale.decimal(Number(v), 2)}%` },
        { id: "latency", header: h.latency, accessor: (m) => m.latency, width: 128, format: (v, _, locale) => `${locale.decimal(Number(v), 1)} ms` },
      ],
      [arabic],
    );
    return (
      <Panel title={arabic ? "التحركات" : "Moves"}>
        <DataGrid label={arabic ? "التحركات منذ الافتتاح" : "Moves since the open"} rows={MOVES} columns={columns} rowKey={(m) => m.id} />
      </Panel>
    );
  },
};
