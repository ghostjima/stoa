import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { I18nProvider } from "react-aria-components";
import { Button } from "./Controls";
import { AlertDialog } from "./Dialog";
import { DataGrid, type DataGridColumn, type DataGridEdit, type DataGridSort } from "./DataGrid";
import { DataGridColumnChooser, DataGridSelectionBar } from "./DataGridTools";
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

/** A change of status asks for confirmation first: the editor closes, a
 * confirmation opens, and when it closes, by its own buttons or Escape,
 * the focus goes back to the edited cell, not to Export after the grid. */
export const EditWithConfirmation: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const [rows, setRows] = useState(() => sampleOrders(20, 5));
    const columns = useMemo(() => sampleOrderColumns(arabic ? "ar" : "en"), [arabic]);
    const [pending, setPending] = useState<DataGridEdit<SampleOrder> | null>(null);
    const save = ({ rowKey, column, value }: DataGridEdit<SampleOrder>) =>
      setRows((previous) => previous.map((o) => (o.id === rowKey ? { ...o, [column]: value } : o)));
    return (
      <Panel title={arabic ? "الأوامر" : "Orders"}>
        <div style={{ display: "grid", gap: "var(--stoa-space-3)" }}>
          <DataGrid
            label={arabic ? "الأوامر، قابلة للتعديل" : "Orders, editable"}
            rows={rows}
            columns={columns}
            rowKey={orderKey}
            onEdit={(edit) => (edit.column === "status" ? setPending(edit) : save(edit))}
          />
          <div>
            <Button>{arabic ? "تصدير" : "Export"}</Button>
          </div>
        </div>
        <AlertDialog
          isOpen={pending !== null}
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          title={arabic ? "تغيير الحالة؟" : "Change the status?"}
          confirmLabel={arabic ? "تغيير الحالة" : "Change status"}
          onConfirm={() => {
            if (pending) save(pending);
          }}
        >
          {pending && (arabic ? `سيتغير الأمر ${pending.rowKey}.` : `Order ${pending.rowKey} will change.`)}
        </AlertDialog>
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

const TONE_OF_STATUS = { filled: "positive", rejected: "negative", working: "warning", new: "neutral" } as const;

/** Columns in the locale's words, with the status column's tone: a symbol
 * in the tone's colour before each status, filled with a tick, rejected
 * with a cross, working with an exclamation mark, new with a dot; the
 * status's word still says it. */
function useToneColumns() {
  const arabic = useStoaFormat().locale.startsWith("ar");
  return useMemo(
    () =>
      sampleOrderColumns(arabic ? "ar" : "en").map((c) =>
        c.id === "status" ? { ...c, tone: (v: string | number) => TONE_OF_STATUS[v as keyof typeof TONE_OF_STATUS] ?? null } : c,
      ),
    [arabic],
  );
}

/** Per-cell tone: the status column marks each status with a symbol in
 * its colour, never the colour alone. A selected row keeps the symbol on
 * its own surface plate. */
export const CellTone: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const rows = useMemo(() => sampleOrders(40, 5), []);
    const columns = useToneColumns();
    return (
      <Panel title={arabic ? "الأوامر" : "Orders"}>
        <DataGrid label={arabic ? "الأوامر" : "Orders"} rows={rows} columns={columns} rowKey={orderKey} selectionMode="multiple" defaultSelectedKeys={rows.filter((o) => o.status in TONE_OF_STATUS).slice(0, 2).map((o) => o.id)} />
      </Panel>
    );
  },
};

/** A column chooser: the Columns button opens a sheet where each column
 * can be hidden with its check box and moved with its buttons; the grid
 * follows. */
export const ColumnChooser: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const rows = useMemo(() => sampleOrders(40, 5), []);
    const columns = useToneColumns();
    const [order, setOrder] = useState<string[]>(() => columns.map((c) => c.id));
    const [hidden, setHidden] = useState<string[]>(["note"]);
    return (
      <Panel title={arabic ? "الأوامر" : "Orders"}>
        <div style={{ display: "grid", gap: "var(--stoa-space-3)" }}>
          <div>
            <DataGridColumnChooser columns={columns} order={order} hidden={hidden} onOrderChange={setOrder} onHiddenChange={setHidden} />
          </div>
          <DataGrid label={arabic ? "الأوامر" : "Orders"} rows={rows} columns={columns} rowKey={orderKey} columnOrder={order} hiddenColumns={hidden} />
        </div>
      </Panel>
    );
  },
};

/** A bulk action bar over the selection, just before the grid: Mark
 * filled changes the selected orders and ends the selection, Export
 * keeps it, Clear selection ends it. When the bar goes, the focus goes to
 * the grid's active cell, the tab stop where the bar was. */
export const SelectionBar: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const [rows, setRows] = useState(() => sampleOrders(40, 5));
    const columns = useToneColumns();
    const [selected, setSelected] = useState<Set<string>>(() => new Set([rows[0]!.id, rows[2]!.id]));
    const [exported, setExported] = useState(0);
    return (
      <Panel title={arabic ? "الأوامر" : "Orders"}>
        <div style={{ display: "grid", gap: "var(--stoa-space-3)" }}>
          <DataGridSelectionBar
            count={selected.size}
            onClear={() => setSelected(new Set())}
            actions={[
              {
                id: "fill",
                label: arabic ? "تعليم كمنفذ" : "Mark filled",
                onPress: () => {
                  setRows((previous) => previous.map((o) => (selected.has(o.id) ? { ...o, status: "filled" } : o)));
                  setSelected(new Set());
                },
              },
              { id: "export", label: arabic ? "تصدير" : "Export", onPress: () => setExported((n) => n + 1) },
            ]}
          />
          <DataGrid
            label={arabic ? "الأوامر" : "Orders"}
            rows={rows}
            columns={columns}
            rowKey={orderKey}
            selectionMode="multiple"
            selectedKeys={selected}
            onSelectionChange={setSelected}
          />
          <p>{arabic ? `مرات التصدير: ${exported}` : `Exported ${exported} times.`}</p>
        </div>
      </Panel>
    );
  },
};
