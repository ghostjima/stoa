import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocale } from "react-aria-components";
import { Chevron } from "./Chevron";
import { useStoaFormat, type StoaFormat } from "./locale";

export type DataGridValue = string | number;

export type DataGridOption = { id: string; label: string };

/** Returns the error to show and announce, or null when the value may be
 * saved. */
export type DataGridValidate<Row> = (value: string, row: Row) => string | null;

export type DataGridEditor<Row> =
  /** A choice from a list: the value is the option's id. */
  | { kind: "enum"; options: DataGridOption[]; validate?: DataGridValidate<Row> }
  /** Free text, checked by `validate` before it is saved. */
  | { kind: "text"; validate?: DataGridValidate<Row> };

export type DataGridColumn<Row> = {
  /** Stable id, reported in sort and edit events. */
  id: string;
  /** The column's name: drawn in the header, and the accessible name of
   * its editor. */
  header: string;
  /** The raw value, used to sort and, unless `format` is given, to show. */
  accessor: (row: Row) => DataGridValue;
  /** Width in CSS pixels. Columns are not resized by the grid, so it can
   * place any column without measuring the ones before it. */
  width: number;
  /** Keep the column at the start edge while the grid scrolls sideways.
   * Pinned columns come first, in the order given. */
  pinned?: boolean;
  sortable?: boolean;
  /** The cell's text. By default a number is written in the locale's
   * digits (a whole number with grouping, otherwise two decimals), an
   * enum editor's value as its option's label, and a string as it is. */
  format?: (value: DataGridValue, row: Row, locale: StoaFormat) => string;
  /** The cells in the numeric face (Plex Mono). On by default for a column
   * whose values are numbers, which are also aligned to the end with
   * tabular figures; turn it off for a number shown as words, such as a
   * date with its month's name, so the words are set in the sans face. */
  mono?: boolean;
  /** Makes the cell editable with Enter, F2 or a double click. */
  editor?: DataGridEditor<Row>;
};

export type DataGridSort = { column: string; direction: "ascending" | "descending" };

/** A position in the grid. `row` counts displayed rows from 0, with -1
 * for the header row; `column` counts the grid's columns from 0, the
 * selection column first when there is one (aria-colindex minus one). */
export type DataGridCell = { row: number; column: number };

/** The cell an editor opened on: its row, the row's key and the
 * column's id. */
export type DataGridEditTarget<Row> = { row: Row; rowKey: string; column: string };

export type DataGridEdit<Row> = DataGridEditTarget<Row> & { value: string };

export type DataGridProps<Row> = {
  /** The grid's accessible name. */
  label: string;
  rows: readonly Row[];
  columns: readonly DataGridColumn<Row>[];
  rowKey: (row: Row) => string;
  /** Controlled sort; null for none. Without it the grid keeps its own,
   * starting from `defaultSort`. */
  sort?: DataGridSort | null;
  defaultSort?: DataGridSort | null;
  onSortChange?: (sort: DataGridSort | null) => void;
  /** The rows arrive already in sort order (sorted on a server, for
   * example): the grid shows the sort but does not reorder. */
  manualSorting?: boolean;
  /** "multiple" adds a selection column of checkboxes. */
  selectionMode?: "none" | "multiple";
  selectedKeys?: ReadonlySet<string>;
  defaultSelectedKeys?: Iterable<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** The active cell, by position. When `rows` change under it, it
   * follows its row to the row's new position (reported through
   * `onActiveCellChange`), and keeps the focus if it had it. */
  activeCell?: DataGridCell;
  defaultActiveCell?: DataGridCell;
  onActiveCellChange?: (cell: DataGridCell) => void;
  /** A value saved from an editor, only when it differs from the current
   * one. The grid does not change `rows`; the caller does. */
  onEdit?: (edit: DataGridEdit<Row>) => void;
  /** An editor opened on a cell (Enter, F2 or a double click). An open
   * editor belongs to its row's key: rows inserted above or a new order
   * do not move it to another row. */
  onEditStart?: (target: DataGridEditTarget<Row>) => void;
  /** An editor closed without saving a change: Escape, leaving it with an
   * invalid value, saving the value it started with, or its row leaving
   * `rows`. Every editor that opens ends in exactly one `onEdit` or
   * `onEditCancel`. */
  onEditCancel?: (target: DataGridEditTarget<Row>) => void;
  /** Text to mark in every cell that contains it, ignoring case. */
  highlight?: string;
  /** Rows are on their way: skeleton lines, and the grid is busy. */
  loading?: boolean;
  /** What an empty grid says; the locale's "No rows to show." by default. */
  emptyState?: ReactNode;
  /** Size the grid with a class; by default it is fifteen rows tall. */
  className?: string;
};

type GridColumn<Row> = {
  data: DataGridColumn<Row> | null;
  width: number;
  pinned: boolean;
  /** Distance from the start edge of the row, in CSS pixels. */
  offset: number;
};

/** An open editor. It belongs to the row with `key`; `row` is where that
 * row was last seen, checked against the key on every render. `data` is
 * the row as it was when the editor opened. */
type Editing<Row> = { key: string; row: number; data: Row; col: number; draft: string; error: string | null; above: boolean };

type Window = { r0: number; r1: number; c0: number; c1: number; page: number };

const SELECT_WIDTH = 40;
const OVERSCAN_ROWS = 4;
/** Rows drawn before the grid has a size (on first render, or in a test
 * environment without layout). */
const FALLBACK_ROWS = 20;
/** The regular density's row height, until the header row is measured. */
const FALLBACK_ROW_HEIGHT = 28;

function useControllable<T>(value: T | undefined, initial: () => T, onChange?: (value: T) => void): [T, (value: T) => void] {
  const [own, setOwn] = useState(initial);
  const controlled = value !== undefined;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setOwn(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [controlled ? value : own, set];
}

function defaultText<Row>(column: DataGridColumn<Row>, value: DataGridValue, row: Row, locale: StoaFormat): string {
  if (column.format) return column.format(value, row, locale);
  if (typeof value === "number") return Number.isInteger(value) ? locale.integer(value) : locale.decimal(value, 2);
  if (column.editor?.kind === "enum") return column.editor.options.find((o) => o.id === value)?.label ?? value;
  return value;
}

/** Text with every case-insensitive occurrence of `query` marked. */
function marked(text: string, query: string): ReactNode {
  if (!query) return text;
  const haystack = text.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  // Lower-casing can change a string's length (a dotted capital I); the
  // offsets would not map back, so such text is left unmarked.
  if (haystack.length !== text.length || needle.length !== query.length) return text;
  const parts: ReactNode[] = [];
  let from = 0;
  let at = haystack.indexOf(needle);
  if (at < 0) return text;
  while (at >= 0) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="stoa-data-grid__mark">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
    at = haystack.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

/** Rows between the anchor and the new active row become selected; rows
 * that the previous range covered and the new one does not are released. */
function applyRange(selection: ReadonlySet<string>, anchor: number, from: number, to: number, keyAt: (row: number) => string): Set<string> {
  const next = new Set(selection);
  for (let r = Math.min(anchor, from); r <= Math.max(anchor, from); r++) next.delete(keyAt(r));
  for (let r = Math.min(anchor, to); r <= Math.max(anchor, to); r++) next.add(keyAt(r));
  return next;
}

/** The grid: an ARIA grid of div elements, virtualised in both directions.
 *
 * Only the rows and columns in view (plus a few rows of overscan) are in
 * the DOM; the active row and column are always kept there too, so focus
 * never lands on an element that has been recycled. Rows have the
 * density's row height (`--stoa-density-row-height`, measured from the
 * header row and re-measured when the density changes) and columns their
 * given widths, so the window is arithmetic, with no per-row measuring.
 * Why not React Aria's virtualised Table, and the numbers behind it:
 * docs/components/data-grid.md.
 *
 * Keyboard: the arrows move the active cell (left and right mirrored in a
 * right-to-left grid), ArrowUp from the first row reaches the header row,
 * Home and End go to the row's first and last cell, Ctrl or Cmd with Home
 * and End to the first and last cell of the grid, PageUp and PageDown by
 * a page of visible rows. Enter on a header sorts by its column (or, on
 * the selection column, selects every row); Enter or F2 on an editable
 * cell opens its editor, Enter saves and Escape cancels. With selection,
 * Space toggles the active row, Shift with ArrowUp or ArrowDown extends
 * a range, and Ctrl or Cmd with A selects every row. The row count and
 * the selected count are announced politely when they change, and so is
 * a new sort. */
export function DataGrid<Row>({
  label,
  rows,
  columns,
  rowKey,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSorting = false,
  selectionMode = "none",
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  activeCell,
  defaultActiveCell,
  onActiveCellChange,
  onEdit,
  onEditStart,
  onEditCancel,
  highlight = "",
  loading = false,
  emptyState,
  className,
}: DataGridProps<Row>) {
  const locale = useStoaFormat();
  const words = locale.messages;
  const { direction } = useLocale();
  const selectable = selectionMode === "multiple";

  const [sort, setSort] = useControllable(sortProp, () => defaultSort, onSortChange);
  // The grid only ever hands out sets it has just made, so a change is
  // reported as a plain Set.
  const [selected, setSelected] = useControllable<ReadonlySet<string>>(
    selectedKeys,
    () => new Set(defaultSelectedKeys ?? []),
    onSelectionChange && ((keys) => onSelectionChange(keys as Set<string>)),
  );
  const [activeRaw, setActiveRaw] = useControllable(activeCell, () => defaultActiveCell ?? { row: 0, column: 0 }, onActiveCellChange);
  const [editing, setEditing] = useState<Editing<Row> | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const scroller = useRef<HTMLDivElement>(null);
  const headRow = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const anchor = useRef<number | null>(null);
  const editorOpen = useRef(false);
  editorOpen.current = editing !== null;
  const emptyId = useId();
  const errorId = useId();

  // Columns: the selection column, then pinned columns, then the rest.
  const gridColumns = useMemo(() => {
    const ordered: GridColumn<Row>[] = [];
    if (selectable) ordered.push({ data: null, width: SELECT_WIDTH, pinned: true, offset: 0 });
    for (const c of columns) if (c.pinned) ordered.push({ data: c, width: c.width, pinned: true, offset: 0 });
    for (const c of columns) if (!c.pinned) ordered.push({ data: c, width: c.width, pinned: false, offset: 0 });
    let x = 0;
    for (const c of ordered) {
      c.offset = x;
      x += c.width;
    }
    return ordered;
  }, [columns, selectable]);
  const firstCenter = gridColumns.findIndex((c) => !c.pinned);
  const centerFrom = firstCenter < 0 ? gridColumns.length : firstCenter;
  const pinnedWidth = gridColumns.slice(0, centerFrom).reduce((s, c) => s + c.width, 0);
  const totalWidth = gridColumns.reduce((s, c) => s + c.width, 0);
  const colCount = gridColumns.length;
  const rowHeaderCol = gridColumns.findIndex((c) => c.data !== null);
  // A column of numbers, judged by its first row, aligns its header to the
  // end like its cells.
  const firstRow = rows[0];
  const numericHeader = gridColumns.map((c) => firstRow !== undefined && c.data !== null && typeof c.data.accessor(firstRow) === "number");

  // Display order: indices into `rows`.
  const order = useMemo(() => {
    const indices = Array.from(rows, (_, i) => i);
    const column = sort ? columns.find((c) => c.id === sort.column) : undefined;
    if (!column || manualSorting) return indices;
    const values = rows.map((row) => column.accessor(row));
    const collator = new Intl.Collator(locale.locale, { numeric: true });
    const sign = sort?.direction === "descending" ? -1 : 1;
    indices.sort((a, b) => {
      const va = values[a]!;
      const vb = values[b]!;
      const d = typeof va === "number" && typeof vb === "number" ? va - vb : collator.compare(String(va), String(vb));
      return d === 0 ? a - b : d * sign;
    });
    return indices;
  }, [rows, columns, sort, manualSorting, locale.locale]);

  const showRows = !loading && rows.length > 0;
  const empty = !loading && rows.length === 0;
  const editable = columns.some((c) => c.editor);
  const rowCount = showRows ? rows.length : 0;
  const rowAt = useCallback((r: number) => rows[order[r]!]!, [rows, order]);
  const keyAt = useCallback((r: number) => rowKey(rows[order[r]!]!), [rows, order, rowKey]);
  const allKeys = useMemo(() => new Set(rows.map(rowKey)), [rows, rowKey]);
  const selectedCount = useMemo(() => {
    let n = 0;
    if (selected.size > 0) for (const k of selected) if (allKeys.has(k)) n++;
    return n;
  }, [selected, allKeys]);
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  /** Where the row with `key` is shown now: at `hint` if it is still
   * there, else found by a scan; -1 when it is gone. */
  const indexOfKey = (key: string, hint: number) => {
    if (hint >= 0 && hint < rowCount && keyAt(hint) === key) return hint;
    for (let r = 0; r < rowCount; r++) if (keyAt(r) === key) return r;
    return -1;
  };

  // The active cell follows its row when the rows or their order change
  // under an active position that did not move itself.
  const tracked = useRef<{ rows: readonly Row[]; order: number[]; key: string | null; raw: number } | null>(null);
  let activeRow = rowCount === 0 ? -1 : Math.min(Math.max(activeRaw.row, -1), rowCount - 1);
  let followed = false;
  const last = tracked.current;
  if (last && last.key !== null && (last.rows !== rows || last.order !== order) && last.raw === activeRaw.row) {
    const moved = indexOfKey(last.key, activeRow);
    if (moved >= 0 && moved !== activeRow) {
      activeRow = moved;
      followed = true;
    }
  }
  const active: DataGridCell = { row: activeRow, column: Math.min(Math.max(activeRaw.column, 0), colCount - 1) };
  const editRow = editing ? indexOfKey(editing.key, editing.row) : -1;

  // Geometry and the visible window.
  const [rowHeight, setRowHeight] = useState(FALLBACK_ROW_HEIGHT);
  const geometry = useRef({ rowHeight, rowCount, centerFrom, pinnedWidth, gridColumns });
  geometry.current = { rowHeight, rowCount, centerFrom, pinnedWidth, gridColumns };

  const computeWindow = useCallback((): Window => {
    const g = geometry.current;
    const el = scroller.current;
    const height = el && el.clientHeight > 0 ? el.clientHeight : g.rowHeight * (FALLBACK_ROWS + 1);
    const width = el && el.clientWidth > 0 ? el.clientWidth : Infinity;
    const top = el?.scrollTop ?? 0;
    const left = Math.abs(el?.scrollLeft ?? 0);
    const r0 = Math.max(0, Math.floor(top / g.rowHeight) - OVERSCAN_ROWS);
    const r1 = Math.min(g.rowCount - 1, Math.ceil((top + height - g.rowHeight) / g.rowHeight) + OVERSCAN_ROWS);
    const cols = g.gridColumns;
    let c0 = g.centerFrom;
    let c1 = cols.length - 1;
    if (width !== Infinity) {
      const x0 = left + g.pinnedWidth;
      const x1 = left + width;
      while (c0 < cols.length - 1 && cols[c0]!.offset + cols[c0]!.width <= x0) c0++;
      c1 = c0;
      while (c1 < cols.length - 1 && cols[c1 + 1]!.offset < x1) c1++;
      c0 = Math.max(g.centerFrom, c0 - 1);
      c1 = Math.min(cols.length - 1, c1 + 1);
    }
    return { r0, r1, c0, c1, page: Math.max(1, Math.floor((height - g.rowHeight) / g.rowHeight)) };
  }, []);

  const [win, setWin] = useState<Window>(() => ({ r0: 0, r1: -1, c0: 0, c1: -1, page: FALLBACK_ROWS }));
  const refreshWindow = useCallback(() => {
    const next = computeWindow();
    setWin((prev) =>
      prev.r0 === next.r0 && prev.r1 === next.r1 && prev.c0 === next.c0 && prev.c1 === next.c1 && prev.page === next.page ? prev : next,
    );
  }, [computeWindow]);

  useLayoutEffect(refreshWindow, [refreshWindow, rowHeight, rowCount, gridColumns]);

  useLayoutEffect(() => {
    const el = scroller.current;
    const head = headRow.current;
    if (!el) return;
    const measure = () => {
      const h = head?.offsetHeight ?? 0;
      if (h > 0) setRowHeight(h);
      refreshWindow();
    };
    measure();
    el.addEventListener("scroll", refreshWindow, { passive: true });
    if (typeof ResizeObserver === "undefined") return () => el.removeEventListener("scroll", refreshWindow);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (head) observer.observe(head);
    return () => {
      el.removeEventListener("scroll", refreshWindow);
      observer.disconnect();
    };
  }, [refreshWindow]);

  // Whether the focus is in the grid. A row's element moved by a new
  // order, or removed, takes the focus with it without a focusout that
  // names where it went; the focus is put back on the active cell then.
  const hasFocus = useRef(false);
  const onFocus = () => {
    hasFocus.current = true;
  };
  const onBlur = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (to) {
      hasFocus.current = scroller.current?.contains(to) ?? false;
      return;
    }
    setTimeout(() => {
      const el = scroller.current;
      if (!el || !el.contains(el.ownerDocument.activeElement)) hasFocus.current = false;
    });
  };

  // Rows changed under the active cell or an open editor: the active cell
  // follows its row (reported, for a controlled grid), the editor stays
  // with its row or closes when the row is gone.
  useLayoutEffect(() => {
    if (followed) setActiveRaw(active);
    tracked.current = { rows, order, key: active.row >= 0 && showRows ? keyAt(active.row) : null, raw: followed ? active.row : activeRaw.row };
    if (editing && editRow !== editing.row) {
      if (editRow >= 0) {
        setEditing({ ...editing, row: editRow });
      } else {
        editorOpen.current = false;
        setEditing(null);
        const column = gridColumns[editing.col]?.data;
        if (column) onEditCancel?.({ row: editing.data, rowKey: editing.key, column: column.id });
      }
    }
  });

  // Focus follows a move made by the person, once the cell is rendered
  // (the active cell always is), and returns to the active cell when the
  // rows changed under the focused one.
  useLayoutEffect(() => {
    const el = scroller.current;
    const lost = hasFocus.current && !editing && el !== null && !el.contains(el.ownerDocument.activeElement);
    if (!pendingFocus.current && !lost) return;
    pendingFocus.current = false;
    el?.querySelector<HTMLElement>(`[data-cell="${active.row}:${active.column}"]`)?.focus({ preventScroll: true });
  });

  // Counts, announced when they change (not on first render).
  const counted = useRef(false);
  useEffect(() => {
    if (!counted.current) {
      counted.current = true;
      return;
    }
    if (loading) return;
    setAnnouncement(words.gridCounts(locale.integer(rows.length), selectable && selectedCount > 0 ? locale.integer(selectedCount) : null));
    // Only a change of count is news; words and digits follow the locale.
  }, [rows.length, selectedCount, loading]);
  useEffect(() => {
    if (loading) setAnnouncement(words.gridLoading);
  }, [loading, words]);

  const isRtl = () => {
    const el = scroller.current;
    const computed = el ? (el.ownerDocument.defaultView ?? window).getComputedStyle(el).direction : "";
    if (computed === "rtl" || computed === "ltr") return computed === "rtl";
    const attr = el?.closest("[dir]")?.getAttribute("dir");
    return attr ? attr === "rtl" : direction === "rtl";
  };

  /** Scrolls the least distance that brings the cell into view. */
  const reveal = (cell: DataGridCell) => {
    const el = scroller.current;
    if (!el || el.clientHeight === 0) return;
    const g = geometry.current;
    if (cell.row >= 0) {
      const top = cell.row * g.rowHeight;
      const bottom = (cell.row + 2) * g.rowHeight - el.clientHeight;
      if (el.scrollTop > top) el.scrollTop = top;
      else if (el.scrollTop < bottom) el.scrollTop = bottom;
    }
    const col = g.gridColumns[cell.column];
    if (col && !col.pinned) {
      const left = Math.abs(el.scrollLeft);
      const start = col.offset - g.pinnedWidth;
      const end = col.offset + col.width - el.clientWidth;
      const sign = isRtl() ? -1 : 1;
      if (left > start) el.scrollLeft = sign * start;
      else if (left < end) el.scrollLeft = sign * end;
    }
  };

  const move = (cell: DataGridCell, focus = true) => {
    reveal(cell);
    if (cell.row !== activeRaw.row || cell.column !== activeRaw.column) {
      // Focused once the new active cell is rendered.
      pendingFocus.current = focus;
      setActiveRaw(cell);
    } else if (focus) {
      // Already rendered: focused now. Nothing is left pending, or the
      // render that a double click's editor causes would take the focus
      // back to the cell and close the editor.
      scroller.current?.querySelector<HTMLElement>(`[data-cell="${cell.row}:${cell.column}"]`)?.focus({ preventScroll: true });
    }
  };

  const toggleRow = (r: number) => {
    const key = keyAt(r);
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    anchor.current = r;
    setSelected(next);
  };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allKeys));

  const toggleSort = (column: DataGridColumn<Row>) => {
    if (!column.sortable) return;
    let next: DataGridSort | null;
    if (sort?.column !== column.id) next = { column: column.id, direction: "ascending" };
    else if (sort.direction === "ascending") next = { column: column.id, direction: "descending" };
    else next = null;
    setSort(next);
    setAnnouncement(
      next === null
        ? words.gridSortCleared
        : next.direction === "ascending"
          ? words.gridSortedAscending(column.header)
          : words.gridSortedDescending(column.header),
    );
  };

  const startEdit = (cell: DataGridCell) => {
    const column = gridColumns[cell.column]?.data;
    if (!column?.editor || cell.row < 0) return;
    reveal(cell);
    const el = scroller.current;
    // Open a list editor above the row when the row is in the lower half
    // of the view, so the list stays inside the grid.
    const above = el ? (cell.row + 1) * rowHeight - el.scrollTop > el.clientHeight / 2 : false;
    if (cell.row !== activeRaw.row || cell.column !== activeRaw.column) setActiveRaw(cell);
    const row = rowAt(cell.row);
    const key = rowKey(row);
    setEditing({ key, row: cell.row, data: row, col: cell.column, draft: String(column.accessor(row)), error: null, above });
    onEditStart?.({ row, rowKey: key, column: column.id });
  };

  const target = (e: Editing<Row>): DataGridEditTarget<Row> | null => {
    const column = gridColumns[e.col]?.data;
    return column ? { row: editRow >= 0 ? rowAt(editRow) : e.data, rowKey: e.key, column: column.id } : null;
  };

  /** Closes the editor; one that saved no change is reported as a
   * cancel. */
  const closeEditor = (saved = false) => {
    editorOpen.current = false;
    if (editing && !saved) {
      const t = target(editing);
      if (t) onEditCancel?.(t);
    }
    setEditing(null);
    pendingFocus.current = true;
  };

  const commit = (value?: string) => {
    if (!editing || editRow < 0) return;
    const column = gridColumns[editing.col]?.data;
    if (!column?.editor) return;
    const row = rowAt(editRow);
    const draft = value ?? editing.draft;
    const error = column.editor.validate?.(draft, row) ?? null;
    if (error) {
      setEditing({ ...editing, draft, error });
      return;
    }
    const changed = draft !== String(column.accessor(row));
    closeEditor(changed);
    if (changed) onEdit?.({ row, rowKey: editing.key, column: column.id, value: draft });
  };

  /** Leaving the editor saves a valid value and drops an invalid one. */
  const blurEditor = (e: FocusEvent) => {
    if (!editorOpen.current || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    if (!editing) return;
    const column = gridColumns[editing.col]?.data;
    const row = editRow >= 0 ? rowAt(editRow) : editing.data;
    const error = column?.editor?.validate?.(editing.draft, row) ?? null;
    editorOpen.current = false;
    setEditing(null);
    if (!error && column && editing.draft !== String(column.accessor(row))) {
      onEdit?.({ row, rowKey: editing.key, column: column.id, value: editing.draft });
    } else if (column) {
      onEditCancel?.({ row, rowKey: editing.key, column: column.id });
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing || (e.target as HTMLElement).closest("[data-grid-editor]")) return;
    const { row, column } = active;
    const ctrl = e.ctrlKey || e.metaKey;
    const rtl = isRtl();
    const last = rowCount - 1;
    let next: DataGridCell | null = null;
    switch (e.key) {
      case "ArrowUp":
        next = { row: Math.max(-1, row - 1), column };
        break;
      case "ArrowDown":
        next = { row: Math.min(last, row + 1), column };
        break;
      case "ArrowLeft":
        next = { row, column: Math.min(colCount - 1, Math.max(0, column + (rtl ? 1 : -1))) };
        break;
      case "ArrowRight":
        next = { row, column: Math.min(colCount - 1, Math.max(0, column + (rtl ? -1 : 1))) };
        break;
      case "Home":
        next = ctrl ? { row: Math.min(0, last), column: 0 } : { row, column: 0 };
        break;
      case "End":
        next = ctrl ? { row: last, column: colCount - 1 } : { row, column: colCount - 1 };
        break;
      case "PageUp":
        next = { row: row < 0 ? row : Math.max(0, row - win.page), column };
        break;
      case "PageDown":
        next = { row: Math.min(last, Math.max(0, row + win.page)), column };
        break;
    }
    if (next) {
      e.preventDefault();
      if (selectable && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && row >= 0 && next.row >= 0) {
        const from = anchor.current ?? row;
        anchor.current = from;
        setSelected(applyRange(selected, from, row, next.row, keyAt));
      } else if (!e.shiftKey) {
        anchor.current = null;
      }
      move(next);
      return;
    }
    const column0 = gridColumns[column];
    if (e.key === " " && selectable) {
      e.preventDefault();
      if (row < 0) toggleAll();
      else toggleRow(row);
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      if (row < 0) {
        if (e.key !== "Enter") return;
        if (column0?.data) toggleSort(column0.data);
        else if (column0) toggleAll();
      } else {
        startEdit(active);
      }
    } else if (ctrl && e.key.toLowerCase() === "a" && selectable) {
      e.preventDefault();
      setSelected(new Set(allKeys));
    }
  };

  // What to render: the window, plus the active and edited rows and the
  // active column wherever they are.
  const renderedRows: number[] = [];
  if (showRows) {
    for (let r = win.r0; r <= Math.min(win.r1, rowCount - 1); r++) renderedRows.push(r);
    for (const extra of [active.row, editRow]) {
      if (extra >= 0 && extra < rowCount && !renderedRows.includes(extra)) renderedRows.push(extra);
    }
    renderedRows.sort((a, b) => a - b);
  }
  const renderedCols: number[] = [];
  for (let c = 0; c < centerFrom; c++) renderedCols.push(c);
  for (let c = Math.max(win.c0, centerFrom); c <= Math.min(win.c1, colCount - 1); c++) renderedCols.push(c);
  for (const extra of [active.column, editing?.col ?? -1]) {
    if (extra >= centerFrom && !renderedCols.includes(extra)) renderedCols.push(extra);
  }
  renderedCols.sort((a, b) => a - b);

  const cellStyle = (c: GridColumn<Row>): CSSProperties => ({ inlineSize: c.width, insetInlineStart: c.offset });
  const cellClass = (c: GridColumn<Row>, index: number, extra = "") =>
    [
      "stoa-data-grid__cell",
      c.pinned ? "stoa-data-grid__cell--pinned" : "stoa-data-grid__cell--center",
      index === centerFrom - 1 ? "stoa-data-grid__cell--pin-edge" : "",
      extra,
    ]
      .filter(Boolean)
      .join(" ");

  const header = renderedCols.map((c) => {
    const col = gridColumns[c]!;
    const isActive = active.row === -1 && active.column === c;
    const key = col.data?.id ?? "select";
    const common = {
      "aria-colindex": c + 1,
      "data-cell": `-1:${c}`,
      tabIndex: isActive ? 0 : -1,
      style: cellStyle(col),
    };
    if (!col.data) {
      return (
        <div key={key} {...common} role="columnheader" className={cellClass(col, c, "stoa-data-grid__cell--select")} onClick={() => move({ row: -1, column: c })}>
          <input
            type="checkbox"
            tabIndex={-1}
            className="stoa-data-grid__checkbox"
            aria-label={words.gridSelectAll}
            disabled={!showRows}
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = selectedCount > 0 && !allSelected;
            }}
            onChange={toggleAll}
          />
        </div>
      );
    }
    const data = col.data;
    const sorted = sort?.column === data.id ? sort.direction : null;
    return (
      <div
        key={key}
        {...common}
        role="columnheader"
        aria-sort={data.sortable ? (sorted ?? "none") : undefined}
        className={cellClass(col, c, `${data.sortable ? "stoa-data-grid__cell--sortable" : ""} ${numericHeader[c] ? "stoa-data-grid__cell--end" : ""}`.trim())}
        onClick={() => {
          move({ row: -1, column: c });
          toggleSort(data);
        }}
      >
        <span className="stoa-data-grid__text">{data.header}</span>
        {sorted && <Chevron className={`stoa-data-grid__sort stoa-data-grid__sort--${sorted}`} />}
      </div>
    );
  });

  const renderRow = (r: number) => {
    const row = rowAt(r);
    const key = rowKey(row);
    const isSelected = selectable && selected.has(key);
    const rowLabel = rowHeaderCol >= 0 ? defaultText(gridColumns[rowHeaderCol]!.data!, gridColumns[rowHeaderCol]!.data!.accessor(row), row, locale) : key;
    const isEditingRow = editing !== null && editRow === r;
    return (
      <div
        key={key}
        role="row"
        aria-rowindex={r + 2}
        aria-selected={selectable ? isSelected : undefined}
        data-selected={isSelected || undefined}
        data-editing={isEditingRow || undefined}
        className="stoa-data-grid__row"
        style={{ transform: `translateY(${r * rowHeight}px)`, inlineSize: totalWidth }}
      >
        {renderedCols.map((c) => {
          const col = gridColumns[c]!;
          const isActive = active.row === r && active.column === c;
          const cellKey = col.data?.id ?? "select";
          const common = {
            "aria-colindex": c + 1,
            "data-cell": `${r}:${c}`,
            tabIndex: isActive ? 0 : -1,
            style: cellStyle(col),
          };
          if (!col.data) {
            return (
              <div key={cellKey} {...common} role="gridcell" className={cellClass(col, c, "stoa-data-grid__cell--select")} onClick={() => move({ row: r, column: c })}>
                <input
                  type="checkbox"
                  tabIndex={-1}
                  className="stoa-data-grid__checkbox"
                  aria-label={words.gridSelectRow(rowLabel)}
                  checked={isSelected}
                  onChange={() => toggleRow(r)}
                />
              </div>
            );
          }
          const data = col.data;
          const value = data.accessor(row);
          const text = defaultText(data, value, row, locale);
          const isEditing = isEditingRow && editing?.col === c;
          const numeric = typeof value === "number";
          // A number's text takes the direction of its first letter, so
          // "-0.42%" and "16.9 ms" keep their order in a right-to-left grid;
          // the cell still aligns it to the end.
          let content: ReactNode = (
            <span className="stoa-data-grid__text" dir={numeric ? "auto" : undefined}>
              {marked(text, highlight)}
            </span>
          );
          if (isEditing && editing && data.editor) {
            content =
              data.editor.kind === "enum" ? (
                <EnumEditor
                  label={data.header}
                  options={data.editor.options}
                  value={editing.draft}
                  above={editing.above}
                  error={editing.error}
                  errorId={errorId}
                  onChange={(draft) => setEditing({ ...editing, draft, error: null })}
                  onCommit={commit}
                  onCancel={() => closeEditor()}
                  onBlur={blurEditor}
                />
              ) : (
                <TextEditor
                  label={data.header}
                  value={editing.draft}
                  error={editing.error}
                  errorId={errorId}
                  onChange={(draft) => setEditing({ ...editing, draft, error: null })}
                  onCommit={() => commit()}
                  onCancel={() => closeEditor()}
                  onBlur={blurEditor}
                />
              );
          }
          return (
            <div
              key={cellKey}
              {...common}
              role={c === rowHeaderCol ? "rowheader" : "gridcell"}
              aria-readonly={data.editor || !editable ? undefined : true}
              data-editing={isEditing || undefined}
              className={cellClass(col, c, numeric ? `stoa-data-grid__cell--num${data.mono === false ? "" : " stoa-data-grid__cell--mono"}` : data.mono ? "stoa-data-grid__cell--mono" : "")}
              onClick={() => {
                if (!isEditing) move({ row: r, column: c });
              }}
              onDoubleClick={() => startEdit({ row: r, column: c })}
            >
              {content}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`stoa-data-grid ${className ?? ""}`.trim()}>
      <div
        ref={scroller}
        role="grid"
        aria-label={label}
        aria-rowcount={rowCount + 1}
        aria-colcount={colCount}
        aria-multiselectable={selectable || undefined}
        aria-readonly={editable ? undefined : true}
        aria-busy={loading || undefined}
        aria-describedby={empty ? emptyId : undefined}
        className="stoa-data-grid__scroller"
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div role="rowgroup" className="stoa-data-grid__head" style={{ inlineSize: totalWidth }}>
          <div ref={headRow} role="row" aria-rowindex={1} className="stoa-data-grid__row stoa-data-grid__row--head">
            {header}
          </div>
        </div>
        {renderedRows.length > 0 && (
          <div role="rowgroup" className="stoa-data-grid__body" style={{ blockSize: rowCount * rowHeight, inlineSize: totalWidth }}>
            {renderedRows.map(renderRow)}
          </div>
        )}
      </div>
      {loading && (
        <div className="stoa-data-grid__overlay" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="stoa-data-grid__skeleton" />
          ))}
        </div>
      )}
      {empty && (
        <div id={emptyId} className="stoa-data-grid__overlay stoa-data-grid__empty">
          {emptyState ?? words.gridNoRows}
        </div>
      )}
      <div role="status" className="stoa-visually-hidden">
        {announcement}
      </div>
    </div>
  );
}

type EditorProps = {
  label: string;
  value: string;
  error: string | null;
  errorId: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onBlur: (e: FocusEvent) => void;
};

function EditorError({ id, error }: { id: string; error: string | null }) {
  if (!error) return null;
  return (
    <div id={id} role="alert" className="stoa-data-grid__error">
      {error}
    </div>
  );
}

/** A text input in the cell; Enter saves, Escape cancels. */
function TextEditor({ label, value, error, errorId, onChange, onCommit, onCancel, onBlur }: EditorProps & { onCommit: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <div className="stoa-data-grid__editor" data-grid-editor="" onBlur={onBlur}>
      <input
        ref={input}
        className="stoa-data-grid__input"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <EditorError id={errorId} error={error} />
    </div>
  );
}

/** A listbox of the column's options under (or above) the cell. The
 * arrows move through the options, Enter or Space saves the current one,
 * a click saves the clicked one, Escape cancels. Focus stays on the
 * listbox and the current option is its active descendant. */
function EnumEditor({
  label,
  options,
  value,
  above,
  error,
  errorId,
  onChange,
  onCommit,
  onCancel,
  onBlur,
}: EditorProps & { options: DataGridOption[]; above: boolean; onCommit: (value?: string) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  useLayoutEffect(() => {
    list.current?.focus();
  }, []);
  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    let next = index;
    if (e.key === "ArrowDown") next = Math.min(options.length - 1, index + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCommit();
      return;
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    } else return;
    e.preventDefault();
    const option = options[next];
    if (option) onChange(option.id);
  };
  return (
    <div className="stoa-data-grid__editor" data-grid-editor="" onBlur={onBlur}>
      <span className="stoa-data-grid__text">{options[index]?.label ?? value}</span>
      <div className="stoa-data-grid__popover" data-placement={above ? "above" : "below"}>
        {above && <EditorError id={errorId} error={error} />}
        <div
          ref={list}
          role="listbox"
          tabIndex={0}
          aria-label={label}
          aria-activedescendant={`${baseId}-${index}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="stoa-data-grid__listbox"
          onKeyDown={onKeyDown}
        >
          {options.map((o, i) => (
            <div
              key={o.id}
              id={`${baseId}-${i}`}
              role="option"
              aria-selected={i === index}
              className="stoa-data-grid__option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommit(o.id)}
            >
              {o.label}
            </div>
          ))}
        </div>
        {!above && <EditorError id={errorId} error={error} />}
      </div>
    </div>
  );
}
