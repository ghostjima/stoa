// @vitest-environment jsdom
// Which face Stoa asks for: numbers in the numeric face, words in the sans
// face, so running Arabic text is never set in the monospace face. What
// the browser then draws is checked in e2e/fonts.e2e.ts.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DataGrid, LogView, type DataGridColumn } from "./index";
import { drawEmpty, readCanvasTokens, type CanvasTokens } from "./tokens";

afterEach(cleanup);

describe("canvas tokens", () => {
  it("read a numeric font and a word font, at the density's size", () => {
    const el = document.createElement("div");
    el.style.setProperty("--stoa-density-font-size", "13px");
    el.style.setProperty("--stoa-font-family-mono", "'IBM Plex Mono', monospace");
    el.style.setProperty("--stoa-font-family-sans", "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif");
    document.body.append(el);
    const t = readCanvasTokens(el);
    expect(t.font).toBe("13px 'IBM Plex Mono', monospace");
    expect(t.wordFont).toBe("13px 'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif");
    el.remove();
  });

  it("draw an empty state, which is a sentence, in the word font", () => {
    const ctx = { font: "", fillStyle: "", textAlign: "", textBaseline: "", fillText() {} } as unknown as CanvasRenderingContext2D;
    drawEmpty(ctx, { font: "12px mono", wordFont: "12px sans", muted: "grey" } as CanvasTokens, "لا سيولة لعرضها.", 100, 40);
    expect(ctx.font).toBe("12px sans");
  });
});

describe("LogView", () => {
  it("marks a line's message as words, apart from its time and level", () => {
    render(<LogView label="Log" lines={[{ time: "10:00:01", level: "INFO", text: "تم تحميل السجل." }]} />);
    expect(screen.getByText("تم تحميل السجل.").className).toBe("stoa-code__message");
    expect(screen.getByText("10:00:01").className).toBe("stoa-code__time");
  });
});

describe("DataGrid", () => {
  type Row = { id: string; at: number; amount: number; name: string };
  const rows: Row[] = [{ id: "a", at: Date.UTC(2026, 0, 4), amount: 4519, name: "Mina" }];
  const columns: DataGridColumn<Row>[] = [
    { id: "id", header: "Id", accessor: (r) => r.id, width: 80 },
    { id: "at", header: "Date", accessor: (r) => r.at, width: 120, mono: false, format: (v) => new Date(Number(v)).toUTCString().slice(5, 16) },
    { id: "amount", header: "Amount", accessor: (r) => r.amount, width: 100 },
    { id: "name", header: "Name", accessor: (r) => r.name, width: 100 },
  ];

  it("sets numbers in the numeric face by default, and a number shown as words in the sans face when asked", () => {
    render(<DataGrid<Row> label="Requests" rows={rows} columns={columns} rowKey={(r) => r.id} />);
    const cell = (text: string) => screen.getByText(text).closest("[role=gridcell]")!.className;
    expect(cell("4,519")).toContain("stoa-data-grid__cell--num");
    expect(cell("4,519")).toContain("stoa-data-grid__cell--mono");
    expect(cell("04 Jan 2026")).toContain("stoa-data-grid__cell--num");
    expect(cell("04 Jan 2026")).not.toContain("stoa-data-grid__cell--mono");
    expect(cell("Mina")).not.toContain("stoa-data-grid__cell--mono");
  });
});
