// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EventStrip, I18nProvider, LineChart, formatDate, niceTicks, type LineSeries, type StripEvent } from "./index";

afterEach(cleanup);

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

const SCENARIOS: LineSeries[] = [
  {
    id: "down",
    name: "Rate -2 pp",
    tone: "down",
    points: [
      { x: day("2027-01-15"), y: 41.1 },
      { x: day("2027-04-15"), y: 38.4 },
      { x: day("2027-07-15"), y: 35.9 },
    ],
  },
  {
    id: "flat",
    name: "Rate unchanged",
    tone: "neutral",
    points: [
      { x: day("2027-01-15"), y: 41.1 },
      { x: day("2027-04-15"), y: 41.1 },
      { x: day("2027-07-15"), y: 41.1 },
    ],
  },
  {
    id: "up",
    name: "Rate +2 pp",
    tone: "up",
    points: [
      { x: day("2027-01-15"), y: 41.1 },
      { x: day("2027-04-15"), y: 43.9 },
      { x: day("2027-07-15"), y: 46.4 },
    ],
  },
];

const chart = (props: Partial<Parameters<typeof LineChart>[0]> = {}) => (
  <LineChart label="Coupon under three rate scenarios" series={SCENARIOS} xLabel="Date" yLabel="Coupon, RUB" {...props} />
);

describe("niceTicks", () => {
  it("covers the range in round steps, from at or below the lowest to at or above the highest", () => {
    expect(niceTicks(35.9, 46.4, 4)).toEqual({ values: [35, 40, 45, 50], step: 5, decimals: 0 });
    expect(niceTicks(0.12, 0.31, 5)).toEqual({ values: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35], step: 0.05, decimals: 2 });
  });

  it("widens a flat range so it still has an axis", () => {
    const ticks = niceTicks(41.1, 41.1, 4);
    expect(ticks.values[0]).toBeLessThan(41.1);
    expect(ticks.values.at(-1)).toBeGreaterThan(41.1);
  });
});

describe("LineChart", () => {
  it("is a figure named by its label, with the drawing hidden and a summary of every series", () => {
    const { container } = render(chart());
    const figure = screen.getByRole("figure", { name: "Coupon under three rate scenarios" });
    expect(container.querySelector("svg.stoa-chart__svg")!.getAttribute("aria-hidden")).toBe("true");
    const caption = figure.querySelector("figcaption")!.textContent!;
    expect(caption).toContain("Rate -2 pp: from 41.1 on Jan 15, 2027 to 35.9 on Jul 15, 2027, low 35.9, high 41.1");
    expect(caption).toContain("Rate +2 pp: from 41.1 on Jan 15, 2027 to 46.4 on Jul 15, 2027, low 41.1, high 46.4");
    expect(caption).toContain("Time runs from left to right.");
  });

  it("tells every series by colour, dash pattern and a legend entry", () => {
    const { container } = render(chart());
    const lines = [...container.querySelectorAll("svg.stoa-chart__svg path.stoa-chart__line")];
    expect(lines.map((l) => l.getAttribute("class"))).toEqual([
      "stoa-chart__line stoa-chart__line--down",
      "stoa-chart__line stoa-chart__line--neutral",
      "stoa-chart__line stoa-chart__line--up",
    ]);
    const dashes = lines.map((l) => l.getAttribute("stroke-dasharray"));
    expect(new Set(dashes).size).toBe(3);
    const legend = container.querySelector(".stoa-chart__legend")!;
    expect([...legend.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Rate -2 pp", "Rate unchanged", "Rate +2 pp"]);
    // The legend swatch repeats the line's own dash pattern.
    expect([...legend.querySelectorAll("line")].map((l) => l.getAttribute("stroke-dasharray"))).toEqual(dashes);
  });

  it("gives series without a tone the default order: accent, neutral, warning", () => {
    const { container } = render(chart({ series: SCENARIOS.map(({ tone: _tone, ...s }) => s) }));
    expect([...container.querySelectorAll("svg.stoa-chart__svg path")].map((l) => l.getAttribute("class"))).toEqual([
      "stoa-chart__line stoa-chart__line--accent",
      "stoa-chart__line stoa-chart__line--neutral",
      "stoa-chart__line stoa-chart__line--warning",
    ]);
  });

  it("says when the value axis does not start at zero, unless asked not to or zero is included", () => {
    render(chart());
    expect(screen.getByText("The value axis does not start at zero: it shows \u206835\u2069 to \u206850\u2069.")).toBeTruthy();
    cleanup();
    const { container } = render(chart({ includeZero: true }));
    expect(container.querySelector(".stoa-chart__note")).toBeNull();
    cleanup();
    const hidden = render(chart({ axisNote: false }));
    expect(hidden.container.querySelector(".stoa-chart__note")).toBeNull();
  });

  it("offers a data table to assistive technology, one row per date", () => {
    render(chart());
    const table = screen.getByRole("table", { name: "Coupon under three rate scenarios (Coupon, RUB)" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Date", "Rate -2 pp", "Rate unchanged", "Rate +2 pp"]);
    expect(within(table).getAllByRole("rowheader").map((h) => h.textContent)).toEqual(["Jan 15, 2027", "Apr 15, 2027", "Jul 15, 2027"]);
    expect(table.closest(".stoa-visually-hidden")).not.toBeNull();
    // Inside a visually hidden box the table must not become a scroll region.
    expect(table.parentElement!.className).toBe("stoa-visually-hidden");
  });

  it("can put the data table behind a disclosure anyone can open", () => {
    const { container } = render(chart({ dataTable: "toggle" }));
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(within(details).getByText("Data table"));
    expect(details.open).toBe(true);
    expect(within(details).getByRole("table")).toBeTruthy();
  });

  it("writes axis labels and the summary in the locale's words and digits", () => {
    const { container } = render(<I18nProvider locale="ar-u-nu-arab">{chart()}</I18nProvider>);
    const ticks = [...container.querySelectorAll("text.stoa-chart__tick")].map((t) => t.textContent);
    expect(ticks).toContain("٤٠");
    expect(ticks).toContain(formatDate("ar-u-nu-arab", day("2027-01-15")));
    const caption = container.querySelector("figcaption")!.textContent!;
    expect(caption).toContain("من ٤١٫١ في");
    expect(caption).toContain("يسير الزمن من اليسار إلى اليمين.");
    expect(screen.getByText("محور القيم لا يبدأ من الصفر: يعرض من \u2068٣٥\u2069 إلى \u2068٥٠\u2069.")).toBeTruthy();
  });

  it("keeps time left to right under a right-to-left locale unless told to follow the locale", () => {
    const firstTickX = (container: HTMLElement) => {
      const label = formatDate("ar-u-nu-arab", day("2027-01-15"));
      const text = [...container.querySelectorAll("text.stoa-chart__tick")].find((t) => t.textContent === label)!;
      return Number(text.getAttribute("x"));
    };
    const ltr = render(<I18nProvider locale="ar-u-nu-arab">{chart()}</I18nProvider>);
    const ltrX = firstTickX(ltr.container);
    cleanup();
    const rtl = render(<I18nProvider locale="ar-u-nu-arab">{chart({ timeDirection: "locale" })}</I18nProvider>);
    expect(firstTickX(rtl.container)).toBeGreaterThan(ltrX);
    expect(rtl.container.querySelector("figcaption")!.textContent).toContain("يسير الزمن من اليمين إلى اليسار.");
  });

  it("says it has nothing to draw, without a drawing, legend or table", () => {
    const { container } = render(chart({ series: [] }));
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(container.querySelector("figcaption")!.textContent).toBe("No data to show.");
    expect(container.querySelector(".stoa-chart__empty")!.textContent).toBe("No data to show.");
    cleanup();
    render(chart({ series: [{ id: "a", name: "A", points: [] }], emptyText: "Pick a bond." }));
    expect(screen.getByRole("figure").querySelector("figcaption")!.textContent).toBe("Pick a bond.");
  });

  it("labels as many dates as fit apart, always the first and the last", () => {
    const at = Array.from({ length: 12 }, (_, i) => Date.UTC(2027, i * 3, 15));
    const { container } = render(chart({ series: [{ id: "a", name: "A", points: at.map((x, i) => ({ x, y: i })) }] }));
    const labels = [...container.querySelectorAll("svg.stoa-chart__svg text.stoa-chart__tick[text-anchor]")]
      .filter((t) => t.getAttribute("dominant-baseline") === null)
      .map((t) => t.textContent);
    expect(labels[0]).toBe("Jan 15, 2027");
    expect(labels.at(-1)).toBe("Oct 15, 2029");
    // At the fallback width of 480 px, twelve dates do not fit.
    expect(labels.length).toBeGreaterThan(2);
    expect(labels.length).toBeLessThan(12);
  });

  it("draws a series of one point as a dot", () => {
    const { container } = render(chart({ series: [{ id: "a", name: "A", points: [{ x: 1, y: 2 }] }], xType: "number" }));
    expect(container.querySelector("circle.stoa-chart__dot--accent")).not.toBeNull();
  });
});

const EVENTS: StripEvent[] = [
  { id: "c1", at: day("2027-01-15"), kind: "coupon" },
  { id: "c2", at: day("2027-07-15"), kind: "coupon" },
  { id: "a1", at: day("2027-07-15"), kind: "amortisation" },
  { id: "o", at: day("2028-01-15"), kind: "offer" },
  { id: "c3", at: day("2028-01-15"), kind: "coupon" },
  { id: "m", at: day("2029-01-15"), kind: "maturity" },
];

describe("EventStrip", () => {
  it("is an image named by a summary of its events", () => {
    render(<EventStrip label="Payments to maturity" events={EVENTS} from={day("2026-10-04")} />);
    expect(
      screen.getByRole("img", {
        name: "Payments to maturity. From Oct 4, 2026 to Jan 15, 2029: Coupon: 3; Amortisation on Jul 15, 2027; Offer on Jan 15, 2028; Maturity on Jan 15, 2029.",
      }),
    ).toBeTruthy();
  });

  it("lists every event with its date, in date order, and same-day events by kind", () => {
    render(<EventStrip label="Payments to maturity" events={[...EVENTS].reverse()} />);
    const list = screen.getByRole("list", { name: "Payments to maturity" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Jan 15, 2027: Coupon",
      "Jul 15, 2027: Coupon",
      "Jul 15, 2027: Amortisation",
      "Jan 15, 2028: Coupon",
      "Jan 15, 2028: Offer",
      "Jan 15, 2029: Maturity",
    ]);
  });

  it("tells kinds apart by marker shape and a legend word", () => {
    const { container } = render(<EventStrip label="Payments" events={EVENTS} />);
    const svg = container.querySelector("svg.stoa-chart__svg")!;
    expect(svg.querySelectorAll("line.stoa-event-strip__mark--coupon")).toHaveLength(3);
    expect(svg.querySelectorAll("rect.stoa-event-strip__mark--amortisation")).toHaveLength(1);
    expect(svg.querySelectorAll("path.stoa-event-strip__mark--offer")).toHaveLength(1);
    expect(svg.querySelectorAll("rect.stoa-event-strip__mark--maturity")).toHaveLength(1);
    const legend = container.querySelector(".stoa-chart__legend")!;
    expect([...legend.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Coupon", "Amortisation", "Offer", "Maturity"]);
  });

  it("uses a caller's label for an event in the list", () => {
    render(<EventStrip label="Payments" events={[{ id: "c", at: day("2027-01-15"), kind: "coupon", label: "Coupon 1 of 8" }]} />);
    expect(screen.getByText("Jan 15, 2027: Coupon 1 of 8")).toBeTruthy();
  });

  it("writes dates, counts and words in the locale's", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <EventStrip label="الدفعات" events={EVENTS} />
      </I18nProvider>,
    );
    const name = screen.getByRole("img").getAttribute("aria-label")!;
    expect(name).toContain("كوبون: ٣");
    expect(name).toContain(`الاستحقاق في ${formatDate("ar-u-nu-arab", day("2029-01-15"))}`);
    expect(formatDate("ar-u-nu-arab", day("2029-01-15"))).toMatch(/[٠-٩]/);
  });

  it("says it has no events", () => {
    render(<EventStrip label="Payments" events={[]} />);
    expect(screen.getByRole("img", { name: "Payments. No events to show." })).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
