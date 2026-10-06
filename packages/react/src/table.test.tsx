// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { I18nProvider, Table, type TableColumn } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Payment = { date: string; coupon: number; principal: number | null; event: string };

const PAYMENTS: Payment[] = [
  { date: "2027-01-15", coupon: 41.14, principal: null, event: "coupon" },
  { date: "2027-04-15", coupon: 40.69, principal: 250, event: "amortisation" },
];

const COLUMNS: TableColumn<Payment>[] = [
  { id: "date", header: "Date" },
  { id: "coupon", header: "Coupon", numeric: true, cell: (p) => p.coupon.toFixed(2) },
  { id: "principal", header: "Principal", align: "end", cell: (p) => (p.principal === null ? "none" : String(p.principal)) },
  { id: "event", header: "Event", align: "center" },
];

const renderTable = (props: Partial<Parameters<typeof Table<Payment>>[0]> = {}) =>
  render(<Table columns={COLUMNS} rows={PAYMENTS} rowKey={(p) => p.date} caption="Payments" emptyText="No payments." {...props} />);

describe("Table", () => {
  it("is a table named by its caption, with one column header per column", () => {
    renderTable();
    const table = screen.getByRole("table", { name: "Payments" });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual(["Date", "Coupon", "Principal", "Event"]);
    expect(headers.every((h) => h.getAttribute("scope") === "col")).toBe(true);
    expect(table.querySelector("caption")!.className).toBe("stoa-table__caption");
  });

  it("can hide its caption visually and keep it as the name", () => {
    renderTable({ hideCaption: true });
    expect(screen.getByRole("table", { name: "Payments" }).querySelector("caption")!.className).toBe("stoa-visually-hidden");
  });

  it("aligns number columns to the end with tabular figures, and others as asked", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: "Coupon" }).className).toBe("stoa-num");
    expect(screen.getByRole("cell", { name: "41.14" }).className).toBe("stoa-num");
    expect(screen.getByRole("cell", { name: "none" }).className).toBe("stoa-table__cell--end");
    expect(screen.getByRole("cell", { name: "amortisation" }).className).toBe("stoa-table__cell--center");
  });

  it("reads a cell from the row field named by the column id when no renderer is given", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <Table
          columns={[{ id: "n", header: "N", numeric: true }, { id: "word", header: "Word" }]}
          rows={[{ n: 1200, word: "ألف" }]}
          rowKey={(r) => r.word}
          caption="Numbers"
          emptyText="-"
        />
      </I18nProvider>,
    );
    expect(screen.getByRole("cell", { name: "١٢٠٠" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "ألف" })).toBeTruthy();
  });

  it("makes the row-header column's cells row headers", () => {
    renderTable({ rowHeader: "date" });
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders.map((h) => h.textContent)).toEqual(["2027-01-15", "2027-04-15"]);
    expect(rowHeaders.every((h) => h.tagName === "TH" && h.getAttribute("scope") === "row")).toBe(true);
    expect(screen.getAllByRole("cell")).toHaveLength(6);
  });

  it("says it is empty in one muted row spanning every column", () => {
    renderTable({ rows: [] });
    const cell = screen.getByRole("cell", { name: "No payments." });
    expect(cell.getAttribute("colspan")).toBe("4");
    expect(cell.parentElement!.className).toBe("stoa-table__empty");
  });

  it("keeps a row's element when the rows reorder, by its key", () => {
    const { rerender } = renderTable();
    const first = screen.getByRole("cell", { name: "2027-01-15" }).parentElement;
    rerender(<Table columns={COLUMNS} rows={[...PAYMENTS].reverse()} rowKey={(p) => p.date} caption="Payments" emptyText="No payments." />);
    expect(screen.getByRole("cell", { name: "2027-01-15" }).parentElement).toBe(first);
    expect(screen.getAllByRole("row").at(-1)).toBe(first);
  });

  it("marks sticky header and first column, and sets its density and maximum height", () => {
    const { container } = renderTable({ stickyHeader: true, stickyFirstColumn: true, density: "compact", maxHeight: 160, mono: true });
    const table = container.querySelector("table")!;
    expect(table.className.split(" ")).toEqual(["stoa-table", "stoa-table--numeric", "stoa-table--sticky-header", "stoa-table--sticky-first"]);
    const region = container.querySelector<HTMLElement>(".stoa-table-region")!;
    expect(region.dataset.density).toBe("compact");
    expect(region.style.maxBlockSize).toBe("160px");
  });

  it("takes its maximum height as a CSS length too, so it can be set in tokens", () => {
    const { container } = renderTable({ maxHeight: "calc(var(--stoa-space-12) * 6)" });
    expect(container.querySelector<HTMLElement>(".stoa-table-region")!.style.maxBlockSize).toBe("calc(var(--stoa-space-12) * 6)");
  });

  it("is not a tab stop or a landmark while it fits", () => {
    const { container } = renderTable({ maxHeight: 160 });
    const region = container.querySelector(".stoa-table-region")!;
    expect(region.getAttribute("role")).toBeNull();
    expect(region.hasAttribute("tabindex")).toBe(false);
  });

  it("becomes a focusable region named by the caption when it scrolls", () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(160);
    renderTable({ maxHeight: 160 });
    const region = screen.getByRole("region", { name: "Payments" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(within(region).getByRole("table")).toBeTruthy();
  });

  it("renders the bare table when it must not scroll itself", () => {
    const { container } = renderTable({ scrollable: false, density: "comfortable" });
    expect(container.firstElementChild!.tagName).toBe("TABLE");
    expect((container.firstElementChild as HTMLElement).dataset.density).toBe("comfortable");
  });
});
