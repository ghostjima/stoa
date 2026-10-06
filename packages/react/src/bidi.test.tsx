// @vitest-environment jsdom
// Values isolated from the text around them: the Ltr run, and the values
// StatBar, Metric, Table, DataGrid and LineChart place in a page that may
// run the other way. Where each part is drawn is measured in a browser
// (e2e/bidi.e2e.ts); here, that each value is its own isolate.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DataGrid, I18nProvider, LineChart, Ltr, Metric, StatBar, Table, type DataGridColumn } from "./index";

afterEach(cleanup);

/** The element is a directional isolate in the direction of its own first
 * letter: a `bdi` without a direction, or any element with dir="auto". */
function isAutoIsolate(el: Element | null): boolean {
  if (!el) return false;
  const dir = el.getAttribute("dir");
  return (el.tagName === "BDI" && (dir === null || dir === "auto")) || dir === "auto";
}

describe("Ltr", () => {
  it("is a left-to-right isolate, in the page's face unless it is mono", () => {
    render(
      <p>
        الجواب <Ltr>2 + 2 = 4</Ltr> و <Ltr mono lang="en">AAPL</Ltr>
      </p>,
    );
    const maths = screen.getByText("2 + 2 = 4");
    expect(maths.tagName).toBe("BDI");
    expect(maths.getAttribute("dir")).toBe("ltr");
    expect(maths.className).toBe("stoa-ltr");
    const ticker = screen.getByText("AAPL");
    expect(ticker.getAttribute("dir")).toBe("ltr");
    expect(ticker.getAttribute("lang")).toBe("en");
    expect(ticker.className).toBe("stoa-ltr stoa-ltr--mono");
  });
});

describe("StatBar", () => {
  it("isolates each value, so its number and unit keep their order in a right-to-left page", () => {
    const { container } = render(
      <div dir="rtl">
        <StatBar label="Counters" items={[{ label: "frame p95", value: "16.9 ms" }]} />
      </div>,
    );
    const value = container.querySelector("dd")!;
    expect(value.textContent).toBe("16.9 ms");
    expect(isAutoIsolate(value) || isAutoIsolate(value.firstElementChild)).toBe(true);
    expect(isAutoIsolate(value.firstElementChild) ? value.firstElementChild!.textContent : value.textContent).toBe("16.9 ms");
  });
});

describe("Metric", () => {
  it("isolates the number and its unit together", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <Metric label="زمن الإطار" value={16.94} fractionDigits={1} unit="ms" />
      </I18nProvider>,
    );
    const number = screen.getByText("١٦٫٩");
    const isolate = number.parentElement!;
    expect(isAutoIsolate(isolate)).toBe(true);
    expect(isolate.textContent).toBe("١٦٫٩ ms");
  });
});

describe("Table", () => {
  it("isolates the value of a number cell, and only of a number cell", () => {
    type Row = { id: string; name: string; change: string };
    render(
      <Table<Row>
        caption="Moves"
        rowKey={(r) => r.id}
        emptyText="None."
        columns={[
          { id: "name", header: "Name" },
          { id: "change", header: "Change", numeric: true },
        ]}
        rows={[{ id: "1", name: "Bond", change: "-0.42%" }]}
      />,
    );
    const change = screen.getByText("-0.42%");
    expect(isAutoIsolate(change)).toBe(true);
    expect(change.closest("td")!.className).toBe("stoa-num");
    expect(screen.getByText("Bond").tagName).toBe("TD");
  });
});

describe("DataGrid", () => {
  it("isolates the text of a number cell", () => {
    type Row = { id: string; change: number };
    const columns: DataGridColumn<Row>[] = [
      { id: "id", header: "Id", accessor: (r) => r.id, width: 80 },
      { id: "change", header: "Change", accessor: (r) => r.change, width: 80, format: (v) => `${Number(v).toFixed(2)}%` },
    ];
    render(<DataGrid<Row> label="Moves" rows={[{ id: "a", change: -0.42 }]} columns={columns} rowKey={(r) => r.id} />);
    const text = screen.getByText("-0.42%");
    expect(text.closest("[role=gridcell]")!.className).toContain("stoa-data-grid__cell--num");
    expect(isAutoIsolate(text) || isAutoIsolate(text.closest(".stoa-data-grid__text"))).toBe(true);
  });
});

describe("LineChart", () => {
  it("isolates the values in the note under a value axis that leaves zero out", () => {
    const { container } = render(
      <LineChart
        label="Yield"
        xLabel="Date"
        series={[{ id: "y", name: "Yield", points: [{ x: Date.UTC(2027, 0, 1), y: 12 }, { x: Date.UTC(2028, 0, 1), y: 14 }] }]}
        formatY={(v) => `${v.toFixed(1)}%`}
      />,
    );
    const note = container.querySelector(".stoa-chart__note");
    expect(note).not.toBeNull();
    // Each value is a first-strong isolate (FSI ... PDI), so "-0.5%" or
    // "12.0%" keeps its sign and its unit in place in an Arabic sentence.
    expect(note!.textContent).toMatch(/\u2068[^\u2069]+\u2069.*\u2068[^\u2069]+\u2069/);
  });
});
