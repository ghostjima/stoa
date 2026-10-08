// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, ScatterChart, signalTokensChanged, type ScatterCategory, type ScatterChartProps, type ScatterPoint } from "./index";
import { nearestPoint, rowOffset, scatterOrders, shapePath, stepThrough, textDirection } from "./scatterScale";

// A 2d context that records every call with the colours in effect, since
// jsdom draws nothing. `measureText` gives 7 px a character.
type Call = { name: string; args: unknown[]; fillStyle: string; strokeStyle: string; direction: string };
type Recorder = { calls: Call[]; draws: number };

function recordingContext(): Recorder & Record<string, unknown> {
  const state: Record<string, unknown> = { fillStyle: "", strokeStyle: "", font: "", lineWidth: 1, textAlign: "left", textBaseline: "alphabetic", direction: "inherit" };
  const rec: Recorder = { calls: [], draws: 0 };
  return new Proxy(state, {
    get(target, key) {
      if (key === "calls") return rec.calls;
      if (key === "draws") return rec.draws;
      if (key in target) return target[key as string];
      if (key === "measureText") return (text: string) => ({ width: text.length * 7 });
      return (...args: unknown[]) => {
        if (key === "setTransform") rec.draws++;
        rec.calls.push({ name: String(key), args, fillStyle: String(target.fillStyle), strokeStyle: String(target.strokeStyle), direction: String(target.direction) });
      };
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  }) as Recorder & Record<string, unknown>;
}

let contexts: WeakMap<HTMLCanvasElement, Recorder>;
const proto = HTMLCanvasElement.prototype;
const originalGetContext = proto.getContext;

beforeEach(() => {
  contexts = new WeakMap();
  // @ts-expect-error -- test stub, narrower than the real overload set.
  proto.getContext = function (this: HTMLCanvasElement, id: string) {
    if (id !== "2d") return null;
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = recordingContext();
      contexts.set(this, ctx);
    }
    return ctx;
  };
  // A box of 480 by 200 CSS pixels at the page's top left.
  Object.defineProperty(proto, "clientWidth", { configurable: true, get: () => 480 });
  Object.defineProperty(proto, "clientHeight", { configurable: true, get: () => 200 });
  proto.getBoundingClientRect = () => ({ left: 0, top: 0, right: 480, bottom: 200, width: 480, height: 200, x: 0, y: 0, toJSON: () => ({}) });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  proto.getContext = originalGetContext;
  delete (proto as unknown as Record<string, unknown>).clientWidth;
  delete (proto as unknown as Record<string, unknown>).clientHeight;
  delete (proto as unknown as Record<string, unknown>).getBoundingClientRect;
});

const RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B"];

const CATEGORIES: ScatterCategory[] = [
  { id: "self", name: "This issue", shape: "diamond", tone: "accent" },
  { id: "analogue", name: "Analogue", shape: "square", tone: "accent" },
  { id: "compared", name: "In the comparison", shape: "triangle", tone: "warning" },
  { id: "other", name: "Other issue", shape: "circle", tone: "neutral", size: "small" },
];

const PEERS: ScatterPoint[] = [
  { id: "OTH-1", x: 0.5, y: "AAA", category: "other", label: "OTH-1 · AAA · 0.5 years" },
  { id: "SELF", x: 3.4, y: "BB", category: "self", label: "SELF · BB · 3.4 years" },
  { id: "AN-1", x: 3.1, y: "BB", category: "analogue", label: "AN-1 · BB · 3.1 years" },
  { id: "AN-2", x: 3.4, y: "BBB", category: "analogue", label: "AN-2 · BBB · 3.4 years" },
  { id: "CMP-1", x: 6.2, y: "A", category: "compared", label: "CMP-1 · A · 6.2 years" },
  { id: "OTH-2", x: 9.8, y: "B", category: "other", label: "OTH-2 · B · 9.8 years" },
];

const peers = (props: Partial<ScatterChartProps> = {}) => (
  <ScatterChart
    label="Peers by rating and duration"
    description="Every issue is a point."
    categories={CATEGORIES}
    points={PEERS}
    xLabel="Duration, years"
    yLabel="Rating"
    yCategories={RATINGS}
    height={200}
    {...props}
  />
);

const live = () => screen.getByRole("status").textContent;
const plot = () => screen.getByRole("application");

describe("scatter scales", () => {
  it("spreads a point within its row by a stable offset from its id", () => {
    expect(rowOffset("RU000A1")).toBe(rowOffset("RU000A1"));
    expect(rowOffset("RU000A1")).not.toBe(rowOffset("RU000A2"));
    for (const id of ["a", "b", "SELF", "OTH-1", "x".repeat(40)]) {
      expect(rowOffset(id)).toBeGreaterThanOrEqual(-0.5);
      expect(rowOffset(id)).toBeLessThan(0.5);
    }
  });

  it("orders by x then top to bottom, and top to bottom then by x, ties by category then as given", () => {
    const keys = [
      { x: 2, row: 1, layer: 0 },
      { x: 1, row: 3, layer: 1 },
      { x: 2, row: 0, layer: 1 },
      { x: 1, row: 3, layer: 0 },
      { x: 1, row: 3, layer: 0 },
    ];
    const { byX, byY } = scatterOrders(keys);
    expect(byX).toEqual([3, 4, 1, 2, 0]);
    expect(byY).toEqual([2, 0, 3, 4, 1]);
  });

  it("steps through an order without wrapping, from its first point when nothing is active", () => {
    expect(stepThrough([4, 2, 7], null, 1)).toBe(4);
    expect(stepThrough([4, 2, 7], null, -1)).toBe(4);
    expect(stepThrough([4, 2, 7], 2, 1)).toBe(7);
    expect(stepThrough([4, 2, 7], 7, 1)).toBe(7);
    expect(stepThrough([4, 2, 7], 4, -1)).toBe(4);
    expect(stepThrough([], null, 1)).toBeNull();
  });

  it("picks the nearest point within the radius, the one on top on a tie", () => {
    const xs = [10, 20, 20];
    const ys = [10, 10, 10];
    expect(nearestPoint(xs, ys, [0, 1, 2], 12, 10, 5)).toBe(0);
    expect(nearestPoint(xs, ys, [0, 1, 2], 40, 10, 5)).toBeNull();
    expect(nearestPoint(xs, ys, [0, 1, 2], 20, 11, 5)).toBe(2);
    expect(nearestPoint(xs, ys, [0, 2, 1], 20, 11, 5)).toBe(1);
  });

  it("reads a label's direction from its first letter, as dir=auto does", () => {
    expect(textDirection("A+")).toBe("ltr");
    expect(textDirection("+A")).toBe("ltr");
    expect(textDirection("٣٫٤")).toBe("ltr");
    expect(textDirection("RU000A1 · ٣٫٤ سنة")).toBe("ltr");
    expect(textDirection("إصدار RU000A1")).toBe("rtl");
  });

  it("draws every shape as a closed outline, and the cross open", () => {
    for (const shape of ["circle", "square", "triangle", "diamond"] as const) expect(shapePath(shape, 8, 8, 4)).toMatch(/^M.*Z$/);
    expect(shapePath("cross", 8, 8, 4)).not.toContain("Z");
  });
});

describe("ScatterChart", () => {
  it("is a figure named by its label and described by a summary of every category and both axes", () => {
    render(peers());
    const figure = screen.getByRole("figure", { name: "Peers by rating and duration" });
    const caption = figure.querySelector("figcaption")!.textContent!;
    expect(caption).toBe(
      "Every issue is a point. Points: 6; This issue: 1; Analogue: 2; In the comparison: 1; Other issue: 2. " +
        "Duration, years: from ⁨0.5⁩ to ⁨9.8⁩. Rating: from ⁨AAA⁩ to ⁨B⁩. " +
        "Values on the horizontal axis grow from left to right.",
    );
    expect(figure.getAttribute("aria-describedby")).toBe(figure.querySelector("figcaption")!.id);
    expect(figure.querySelector("canvas")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("is one tab stop that says how the keys move", () => {
    render(peers());
    const app = plot();
    expect(app.tabIndex).toBe(0);
    expect(app.getAttribute("aria-label")).toBe("Peers by rating and duration");
    expect(document.getElementById(app.getAttribute("aria-describedby")!)!.textContent).toBe(
      "Arrow keys move from point to point, Home and End go to the first and the last, Escape clears.",
    );
  });

  it("names each category in the legend with its shape and tone, in the categories' order", () => {
    const { container } = render(peers());
    const items = [...container.querySelectorAll(".stoa-chart__legend li")];
    expect(items.map((li) => li.textContent)).toEqual(["This issue", "Analogue", "In the comparison", "Other issue"]);
    expect(items.map((li) => li.querySelector("path")!.getAttribute("class"))).toEqual([
      "stoa-scatter__mark stoa-scatter__mark--accent",
      "stoa-scatter__mark stoa-scatter__mark--accent",
      "stoa-scatter__mark stoa-scatter__mark--warning",
      "stoa-scatter__mark stoa-scatter__mark--neutral",
    ]);
    expect(new Set(items.map((li) => li.querySelector("path")!.getAttribute("d"))).size).toBe(4);
  });

  it("leaves a category without points out of the legend and gives default shapes and tones by position", () => {
    const { container } = render(
      peers({
        categories: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "none", name: "None" }],
        points: [
          { id: "1", x: 1, y: "AA", category: "a", label: "1" },
          { id: "2", x: 2, y: "A", category: "b", label: "2" },
        ],
      }),
    );
    const items = [...container.querySelectorAll(".stoa-chart__legend li")];
    expect(items.map((li) => li.textContent)).toEqual(["A", "B"]);
    expect(items.map((li) => li.querySelector("path")!.getAttribute("class"))).toEqual([
      "stoa-scatter__mark stoa-scatter__mark--accent",
      "stoa-scatter__mark stoa-scatter__mark--neutral",
    ]);
    expect(items[0]!.querySelector("path")!.getAttribute("d")).toBe(shapePath("circle", 8, 8, 4.5));
    expect(items[1]!.querySelector("path")!.getAttribute("d")).toBe(shapePath("square", 8, 8, 4.5));
  });

  it("draws the first category on top: the last category's points are filled first", () => {
    const { container } = render(
      <div
        style={
          {
            "--stoa-color-accent": "rgb(0, 0, 200)",
            "--stoa-color-text-muted": "rgb(90, 90, 90)",
            "--stoa-color-warning": "rgb(200, 120, 0)",
          } as never
        }
      >
        {peers()}
      </div>,
    );
    const ctx = contexts.get(container.querySelector("canvas")!)!;
    const fills = ctx.calls.filter((c) => c.name === "fill").map((c) => c.fillStyle);
    expect(fills).toEqual(["rgb(90, 90, 90)", "rgb(200, 120, 0)", "rgb(0, 0, 200)", "rgb(0, 0, 200)"]);
  });

  it("walks the points by x with left and right, top to bottom with up and down, Home and End, and reads each one", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    render(peers());
    const app = plot();
    const press = (key: string) => {
      fireEvent.keyDown(app, { key });
      act(() => vi.advanceTimersByTime(1000));
      return live();
    };
    expect(press("Home")).toBe("OTH-1 · AAA · 0.5 years (Other issue), point 1 of 6");
    expect(press("ArrowRight")).toBe("AN-1 · BB · 3.1 years (Analogue), point 2 of 6");
    // Equal x: the higher row first.
    expect(press("ArrowRight")).toBe("AN-2 · BBB · 3.4 years (Analogue), point 3 of 6");
    expect(press("ArrowRight")).toBe("SELF · BB · 3.4 years (This issue), point 4 of 6");
    expect(press("ArrowLeft")).toBe("AN-2 · BBB · 3.4 years (Analogue), point 3 of 6");
    // Up and down: the rows top to bottom, within a row by x.
    expect(press("ArrowDown")).toBe("AN-1 · BB · 3.1 years (Analogue), point 2 of 6");
    expect(press("ArrowDown")).toBe("SELF · BB · 3.4 years (This issue), point 4 of 6");
    expect(press("ArrowUp")).toBe("AN-1 · BB · 3.1 years (Analogue), point 2 of 6");
    expect(press("End")).toBe("OTH-2 · B · 9.8 years (Other issue), point 6 of 6");
    expect(press("ArrowRight")).toBe("OTH-2 · B · 9.8 years (Other issue), point 6 of 6");
    expect(press("Escape")).toBe("");
  });

  it("lets Escape go on when no point is active, and keeps it when one is", () => {
    const outer = vi.fn();
    render(<div onKeyDown={(e) => e.key === "Escape" && outer()}>{peers()}</div>);
    fireEvent.keyDown(plot(), { key: "Escape" });
    expect(outer).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(plot(), { key: "Home" });
    fireEvent.keyDown(plot(), { key: "Escape" });
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it("mirrors the arrows with the x axis in a right-to-left locale", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    render(<I18nProvider locale="ar-u-nu-arab">{peers()}</I18nProvider>);
    const app = plot();
    fireEvent.keyDown(app, { key: "Home" });
    fireEvent.keyDown(app, { key: "ArrowLeft" });
    act(() => vi.advanceTimersByTime(1000));
    expect(live()).toBe("AN-1 · BB · 3.1 years (Analogue)، النقطة ٢ من ٦");
    fireEvent.keyDown(app, { key: "ArrowRight" });
    act(() => vi.advanceTimersByTime(1000));
    expect(live()).toBe("OTH-1 · AAA · 0.5 years (Other issue)، النقطة ١ من ٦");
  });

  it("draws a ring in the focus colour and the label beside the active point, and clears it on blur", () => {
    const { container } = render(<div style={{ "--stoa-color-focus": "rgb(1, 2, 3)" } as never}>{peers()}</div>);
    const ctx = contexts.get(container.querySelector("canvas")!)!;
    const rings = () => ctx.calls.filter((c) => c.name === "stroke" && c.strokeStyle === "rgb(1, 2, 3)").length;
    const labels = () => ctx.calls.filter((c) => c.name === "fillText").map((c) => c.args[0]);
    expect(rings()).toBe(0);
    fireEvent.keyDown(plot(), { key: "End" });
    expect(rings()).toBe(1);
    expect(labels().at(-1)).toBe("OTH-2 · B · 9.8 years");
    fireEvent.blur(plot());
    const before = rings();
    act(() => signalTokensChanged(container.firstElementChild!));
    expect(rings()).toBe(before);
  });

  it("picks the nearest point under the pointer, at the right end of the axis left to right and the left end right to left", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const two: ScatterPoint[] = [
      { id: "low", x: 0, y: "AA", category: "self", label: "Low" },
      { id: "high", x: 10, y: "AA", category: "self", label: "High" },
    ];
    // One row, not spread: its centre is halfway between the top padding
    // and the x axis (200 px high, 13 px type and 8 px padding without the
    // density tokens).
    const props = { points: two, yCategories: ["AA"], spread: false };
    const y = 8 + (200 - 13 - 12 - 8) / 2;
    render(peers(props));
    fireEvent.pointerMove(plot(), { clientX: 470, clientY: y });
    act(() => vi.advanceTimersByTime(1000));
    expect(live()).toBe("High (This issue), point 2 of 2");
    fireEvent.pointerMove(plot(), { clientX: 240, clientY: y });
    act(() => vi.advanceTimersByTime(1000));
    expect(live()).toBe("");
    cleanup();
    render(<I18nProvider locale="ar-u-nu-arab">{peers(props)}</I18nProvider>);
    fireEvent.pointerMove(plot(), { clientX: 10, clientY: y });
    act(() => vi.advanceTimersByTime(1000));
    expect(live()).toBe("High (This issue)، النقطة ٢ من ٢");
    fireEvent.pointerLeave(plot());
    act(() => vi.advanceTimersByTime(1000));
    expect(live()).toBe("");
  });

  it("sizes the points from the density's row height", () => {
    const radius = (rowHeight: string) => {
      const { container } = render(
        <div style={{ "--stoa-density-row-height": rowHeight } as never}>
          {peers({ categories: [{ id: "a", name: "A", shape: "circle" }], points: [{ id: "1", x: 1, y: "AA", category: "a", label: "1" }] })}
        </div>,
      );
      const ctx = contexts.get(container.querySelector("canvas")!)!;
      const r = ctx.calls.find((c) => c.name === "arc")!.args[2] as number;
      cleanup();
      return r;
    };
    expect(radius("24px")).toBeCloseTo(3.84);
    expect(radius("36px")).toBeCloseTo(5.76);
  });

  it("redraws with fresh tokens on the token signal and when the density changes", async () => {
    const { container } = render(<div style={{ "--stoa-color-surface": "rgb(5, 5, 5)" } as never}>{peers()}</div>);
    const wrapper = container.firstElementChild as HTMLElement;
    const ctx = contexts.get(container.querySelector("canvas")!)!;
    const surface = () => ctx.calls.filter((c) => c.name === "fillRect").at(0)?.fillStyle;
    expect(surface()).toBe("rgb(5, 5, 5)");
    wrapper.style.setProperty("--stoa-color-surface", "rgb(6, 6, 6)");
    ctx.calls.length = 0;
    act(() => signalTokensChanged(wrapper));
    expect(surface()).toBe("rgb(6, 6, 6)");
    const draws = ctx.draws;
    try {
      await act(async () => {
        document.documentElement.dataset.density = "compact";
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(ctx.draws).toBe(draws + 1);
    } finally {
      delete document.documentElement.dataset.density;
    }
  });

  it("offers a data table, by category then by x, and can list only some categories behind a disclosure", () => {
    render(peers());
    const table = screen.getByRole("table", { name: "Peers by rating and duration" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Point", "Category", "Duration, years", "Rating"]);
    expect(within(table).getAllByRole("rowheader").map((h) => h.textContent)).toEqual([
      "SELF · BB · 3.4 years",
      "AN-1 · BB · 3.1 years",
      "AN-2 · BBB · 3.4 years",
      "CMP-1 · A · 6.2 years",
      "OTH-1 · AAA · 0.5 years",
      "OTH-2 · B · 9.8 years",
    ]);
    expect(table.closest(".stoa-visually-hidden")).not.toBeNull();
    cleanup();
    const { container } = render(
      peers({ dataTable: "toggle", tableCategories: ["self", "analogue", "compared"], tableCaption: "Highlighted issues", labelHeader: "Issue", formatX: (x) => `${x} y` }),
    );
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(within(details).getByText("Data table"));
    const highlighted = within(details).getByRole("table", { name: "Highlighted issues" });
    const rows = within(highlighted).getAllByRole("row").slice(1);
    expect(rows.map((r) => [...r.children].map((c) => c.textContent))).toEqual([
      ["SELF · BB · 3.4 years", "This issue", "3.4 y", "BB"],
      ["AN-1 · BB · 3.1 years", "Analogue", "3.1 y", "BB"],
      ["AN-2 · BBB · 3.4 years", "Analogue", "3.4 y", "BBB"],
      ["CMP-1 · A · 6.2 years", "In the comparison", "6.2 y", "A"],
    ]);
  });

  it("lets the data table's column and row headers wrap, so it fits a phone", () => {
    const { container } = render(peers({ dataTable: "toggle" }));
    expect(container.querySelector("details table")!.classList).toContain("stoa-table--wrap-headers");
  });

  it("takes a numeric value axis: top is the highest value, and the summary goes low to high", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    render(
      <ScatterChart
        label="Yield against duration"
        categories={[{ id: "ofz", name: "OFZ" }, { id: "corp", name: "Corporate" }]}
        points={[
          { id: "a", x: 1, y: 14.2, category: "ofz", label: "A" },
          { id: "b", x: 2, y: 18.5, category: "corp", label: "B" },
          { id: "c", x: 2, y: 15.05, category: "ofz", label: "C" },
          { id: "skip", x: 3, y: "AA", category: "ofz", label: "Not on a numeric axis" },
          { id: "lost", x: 3, y: 16, category: "unknown", label: "No such category" },
        ]}
        xLabel="Duration, years"
        yLabel="Yield, %"
      />,
    );
    expect(screen.getByRole("figure").querySelector("figcaption")!.textContent).toBe(
      "Points: 3; OFZ: 2; Corporate: 1. Duration, years: from ⁨1⁩ to ⁨2⁩. Yield, %: from ⁨14.20⁩ to ⁨18.50⁩. " +
        "Values on the horizontal axis grow from left to right.",
    );
    fireEvent.keyDown(plot(), { key: "ArrowDown" });
    act(() => vi.advanceTimersByTime(1000));
    // The highest value is the top point; by x it is second, after A.
    expect(live()).toBe("B (Corporate), point 2 of 3");
  });

  it("says it has nothing to draw, on the canvas and as text, without a tab stop, legend or table", () => {
    const { container } = render(peers({ points: [] }));
    expect(screen.queryByRole("application")).toBeNull();
    expect(container.querySelector(".stoa-scatter__plot")!.hasAttribute("tabindex")).toBe(false);
    expect(screen.queryByRole("table")).toBeNull();
    expect(container.querySelector(".stoa-chart__legend")).toBeNull();
    expect(container.querySelector("figcaption")!.textContent).toBe("No data to show.");
    const ctx = contexts.get(container.querySelector("canvas")!)!;
    expect(ctx.calls.filter((c) => c.name === "fillText").map((c) => c.args[0])).toEqual(["No data to show."]);
    cleanup();
    render(peers({ points: [], emptyText: "Pick an issue." }));
    expect(screen.getByRole("figure").querySelector("figcaption")!.textContent).toBe("Pick an issue.");
  });

  it("writes the summary, ticks and table in the locale's words and digits", () => {
    const { container } = render(<I18nProvider locale="ar-u-nu-arab">{peers()}</I18nProvider>);
    const caption = container.querySelector("figcaption")!.textContent!;
    expect(caption).toContain("النقاط: ٦؛ This issue: ١");
    expect(caption).toContain("Duration, years: من ⁨٠٫٥⁩ إلى ⁨٩٫٨⁩.");
    expect(caption).toContain("تزداد القيم على المحور الأفقي من اليمين إلى اليسار.");
    const ctx = contexts.get(container.querySelector("canvas")!)!;
    const texts = ctx.calls.filter((c) => c.name === "fillText");
    expect(texts.map((c) => c.args[0])).toContain("١٠");
    // A rating keeps its own direction on a right-to-left page.
    const ratings = texts.filter((c) => RATINGS.includes(String(c.args[0])));
    expect(ratings.map((c) => c.args[0])).toEqual(RATINGS);
    expect(ratings.every((c) => c.direction === "ltr")).toBe(true);
    // Labels and ratings keep their own direction in the table.
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("rowheader")[0]!.querySelector("bdi")!.textContent).toBe("SELF · BB · 3.4 years");
    expect(within(table).getByText("BBB").tagName).toBe("BDI");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "النقطة",
      "الفئة",
      "Duration, years",
      "Rating",
    ]);
  });
});

