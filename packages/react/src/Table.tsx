import { useEffect, useId, useRef, useState, type Key, type ReactNode, type RefObject } from "react";
import { useStoaFormat } from "./locale";

export type TableColumn<Row> = {
  /** Stable key of the column; also the field the default cell reads. */
  id: string;
  /** Header content: a node, so it can be translated. */
  header: ReactNode;
  /** Horizontal alignment, in logical terms: "end" is right in a
   * left-to-right page and left in a right-to-left one. */
  align?: "start" | "center" | "end";
  /** A number column: tabular figures, aligned to the end, and each value
   * isolated in the direction of its own first letter (`bdi`), so "-0.42%"
   * keeps its sign before the number in a right-to-left page. */
  numeric?: boolean;
  /** What a cell shows. Without it, the row's field named by `id`: a
   * string as it is, a number with the locale's digits. */
  cell?: (row: Row, index: number) => ReactNode;
};

export type TableProps<Row> = {
  columns: TableColumn<Row>[];
  rows: Row[];
  /** A stable key for each row. */
  rowKey: (row: Row, index: number) => Key;
  /** The table's name, shown above it or read only by assistive technology
   * (`hideCaption`). It also names the scroll region. */
  caption: ReactNode;
  hideCaption?: boolean;
  /** The id of the column whose cells are row headers (`th scope="row"`). */
  rowHeader?: string;
  /** What the table says while it has no rows: one muted row spanning every
   * column. */
  emptyText: ReactNode;
  /** The header row stays in view while the table scrolls inside its own
   * region (see `maxHeight`). */
  stickyHeader?: boolean;
  /** The first column stays in view while the table scrolls sideways. */
  stickyFirstColumn?: boolean;
  /** Highest the table may grow before it scrolls inside its own region:
   * a number of CSS pixels, or a CSS length, which can be written in
   * tokens ("calc(var(--stoa-space-12) * 6)"). */
  maxHeight?: number | string;
  /** Row height, cell padding and type size for this table; without it,
   * the density set on an ancestor (`data-density`) applies. */
  density?: "compact" | "regular" | "comfortable";
  /** Every cell in the numeric face (Plex Mono, tabular figures), as a
   * trades tape is. */
  mono?: boolean;
  /** Whether a table too large for its box scrolls inside its own region.
   * Turn it off when an ancestor scrolls instead, or when the table sits
   * in a visually hidden container, where a scroll region would be an
   * invisible tab stop. */
  scrollable?: boolean;
};

/** A table that is read, not edited: a caption, a header row, rows with
 * stable keys, an optional row-header column and an empty row. Numbers are
 * tabular and end-aligned; alignment uses logical properties, so a
 * right-to-left page needs no overrides. A table larger than its box
 * scrolls inside its own region, which then takes keyboard focus and is
 * named by the caption, so a keyboard user can scroll it too. Sorting,
 * selection, virtualisation and editing are out of scope. */
export function Table<Row>({
  columns,
  rows,
  rowKey,
  caption,
  hideCaption = false,
  rowHeader,
  emptyText,
  stickyHeader = false,
  stickyFirstColumn = false,
  maxHeight,
  density,
  mono = false,
  scrollable = true,
}: TableProps<Row>) {
  const locale = useStoaFormat();
  const captionId = useId();
  const region = useRef<HTMLDivElement>(null);
  const scrolls = useScrolls(region, scrollable);

  // Header and body cells of a column share one class. The class names are
  // written out in this JSX attribute, where the token map finds them. A
  // plain function rather than a component, so cells are not remounted on
  // every render.
  const cell = (column: TableColumn<Row>, scope: "col" | "row" | undefined, children: ReactNode) => {
    const Tag = scope ? "th" : "td";
    return (
      <Tag
        key={column.id}
        scope={scope}
        className={
          column.numeric
            ? "stoa-num"
            : column.align === "center"
              ? "stoa-table__cell--center"
              : column.align === "end"
                ? "stoa-table__cell--end"
                : undefined
        }
      >
        {children}
      </Tag>
    );
  };

  const value = (row: Row, column: TableColumn<Row>, index: number): ReactNode => {
    const content = own(row, column, index);
    return column.numeric ? <bdi>{content}</bdi> : content;
  };
  const own = (row: Row, column: TableColumn<Row>, index: number): ReactNode => {
    if (column.cell) return column.cell(row, index);
    const field = (row as Record<string, unknown>)[column.id];
    if (typeof field === "number") return locale.digits(String(field));
    if (typeof field === "string") return field;
    return null;
  };

  const table = (
    <table
      className={
        "stoa-table" +
        (mono ? " stoa-table--numeric" : "") +
        (stickyHeader ? " stoa-table--sticky-header" : "") +
        (stickyFirstColumn ? " stoa-table--sticky-first" : "")
      }
      data-density={scrollable ? undefined : density}
    >
      <caption id={captionId} className={hideCaption ? "stoa-visually-hidden" : "stoa-table__caption"}>
        {caption}
      </caption>
      <thead>
        <tr>
          {columns.map((column) => cell(column, "col", column.header))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr className="stoa-table__empty">
            <td colSpan={columns.length}>{emptyText}</td>
          </tr>
        )}
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)}>
            {columns.map((column) => cell(column, column.id === rowHeader ? "row" : undefined, value(row, column, index)))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!scrollable) return table;
  return (
    <div
      ref={region}
      className="stoa-table-region"
      data-density={density}
      style={maxHeight === undefined ? undefined : { maxBlockSize: maxHeight }}
      // Only a region that really scrolls is a landmark and a tab stop:
      // one that fits would be an empty stop on every keyboard walk.
      role={scrolls ? "region" : undefined}
      aria-labelledby={scrolls ? captionId : undefined}
      tabIndex={scrolls ? 0 : undefined}
    >
      {table}
    </div>
  );
}

/** Whether the element's content overflows its box in either direction,
 * kept current as the box or the content changes size. */
function useScrolls(el: RefObject<HTMLElement | null>, enabled: boolean): boolean {
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const node = el.current;
    if (!enabled || !node) return;
    const measure = () => setScrolls(node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth);
    measure();
    // jsdom has no ResizeObserver; the first measurement is all it gets.
    const View = node.ownerDocument.defaultView;
    if (!View || typeof View.ResizeObserver !== "function") return;
    const observer = new View.ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  });
  return scrolls;
}
