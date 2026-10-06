import type { Meta, StoryObj } from "@storybook/react-vite";
import { EventStrip, type StripEvent } from "./EventStrip";
import { LineChart, type LineSeries } from "./LineChart";
import { Panel } from "./Panel";

const meta: Meta = { title: "Data/Charts" };
export default meta;

const day = (year: number, month: number, date = 15) => Date.UTC(year, month, date);

/** A floater's coupon under three key-rate scenarios: deterministic, for
 * stories only. Down and up are directions here, so they take the falling
 * and rising tones; the unchanged rate is neutral. */
function scenarios(periods = 12): LineSeries[] {
  const at = Array.from({ length: periods }, (_, i) => day(2027, i * 3));
  const path = (drift: number) => at.map((x, i) => ({ x, y: +(41.14 + drift * Math.min(i, 6) * (1 - 0.04 * i)).toFixed(2) }));
  return [
    { id: "down", name: "Rate -2 pp", tone: "down", points: path(-0.9) },
    { id: "flat", name: "Rate unchanged", tone: "neutral", points: path(0) },
    { id: "up", name: "Rate +2 pp", tone: "up", points: path(0.9) },
  ];
}

const chartArgs = {
  label: "Coupon per period under three key-rate scenarios",
  xLabel: "Date",
  yLabel: "Coupon, RUB",
};

/** Three series, each with its own tone, dash pattern and legend entry.
 * The values sit far from zero, so the value axis leaves zero out and the
 * note under the chart says so. */
export const LineScenarios: StoryObj = {
  render: () => (
    <Panel title="Coupon">
      <LineChart {...chartArgs} series={scenarios()} />
    </Panel>
  ),
};

/** The default tones in order (accent, neutral, warning) for series that
 * carry no direction, on an axis that includes zero. */
export const LineFromZero: StoryObj = {
  render: () => (
    <LineChart
      label="Price of three bonds, percent of par"
      xLabel="Date"
      yLabel="Price, % of par"
      includeZero
      series={[
        { id: "a", name: "OFZ 26238", points: Array.from({ length: 8 }, (_, i) => ({ x: day(2026, i), y: 58 + i * 0.6 })) },
        { id: "b", name: "OFZ 26243", points: Array.from({ length: 8 }, (_, i) => ({ x: day(2026, i), y: 81 - i * 0.4 })) },
        { id: "c", name: "OFZ 29025", points: Array.from({ length: 8 }, (_, i) => ({ x: day(2026, i), y: 99 + (i % 3) * 0.3 })) },
      ]}
    />
  ),
};

/** The data table behind a disclosure anyone can open, rather than for
 * assistive technology only. */
export const LineDataTable: StoryObj = {
  render: () => <LineChart {...chartArgs} series={scenarios(6)} dataTable="toggle" />,
};

/** Time follows the locale: under a right-to-left locale (switch the
 * language to Arabic) it runs right to left, the value axis moves to the
 * right, and the text alternative says so. The default keeps time left to
 * right in every language. */
export const LineTimeFollowsLocale: StoryObj = {
  render: () => <LineChart {...chartArgs} series={scenarios()} timeDirection="locale" />,
};

/** Nothing to draw yet: the chart says so, visibly and as text. */
export const LineEmpty: StoryObj = {
  render: () => <LineChart {...chartArgs} series={[]} />,
};

/** A bond's payments to maturity: quarterly coupons, amortisations in the
 * last year, an offer and maturity. */
function bondEvents(withOffer = true, withAmortisation = true): StripEvent[] {
  const out: StripEvent[] = [];
  for (let i = 0; i < 16; i++) out.push({ id: `c${i}`, at: day(2027, i * 3), kind: "coupon" });
  if (withAmortisation) for (let i = 12; i < 15; i++) out.push({ id: `a${i}`, at: day(2027, i * 3), kind: "amortisation" });
  if (withOffer) out.push({ id: "offer", at: day(2028, 6), kind: "offer" });
  out.push({ id: "maturity", at: day(2027, 45), kind: "maturity" });
  return out;
}

/** Every kind of event, told apart by marker shape and named in the
 * legend; the image's name summarises them and a list gives each one. */
export const StripPayments: StoryObj = {
  render: () => (
    <Panel title="Payments">
      <EventStrip label="Payments from today to maturity" events={bondEvents()} from={day(2026, 9, 4)} />
    </Panel>
  ),
};

/** A plain bond: coupons and maturity only, so the legend lists only those. */
export const StripCouponsOnly: StoryObj = {
  render: () => <EventStrip label="Payments to maturity" events={bondEvents(false, false)} />,
};

/** Time follows the locale, as on the line chart. */
export const StripTimeFollowsLocale: StoryObj = {
  render: () => <EventStrip label="Payments to maturity" events={bondEvents()} timeDirection="locale" />,
};

/** No events: the strip says so. */
export const StripEmpty: StoryObj = {
  render: () => <EventStrip label="Payments to maturity" events={[]} />,
};
