import { useRef } from "react";
import { useLocale } from "react-aria-components";
import { useChartBox } from "./chartBox";
import { decimalsOf, formatDate, niceTicks, spreadIndices, textWidth } from "./chartScale";
import { Disclosure } from "./Disclosure";
import { isolate, useStoaFormat } from "./locale";
import { Table, type TableColumn } from "./Table";

/** The semantic colour a series is drawn in. Up and down mean rising and
 * falling everywhere in Stoa, so give them only to series that do; the
 * default order is accent, neutral, warning. */
export type ChartTone = "accent" | "neutral" | "warning" | "up" | "down";

export type ChartPoint = { x: number; y: number };

export type LineSeries = {
  /** Stable key. */
  id: string;
  /** Shown in the legend, the text alternative and the data table. */
  name: string;
  /** Points in time order. */
  points: ChartPoint[];
  tone?: ChartTone;
};

export type LineChartProps = {
  /** What the chart is: its accessible name. */
  label: string;
  /** Plain-language description of what the chart shows, read before the
   * generated summary of each series. */
  description?: string;
  series: LineSeries[];
  /** Header of the time column in the data table ("Date"). */
  xLabel: string;
  /** What the values are, with their unit ("Coupon, RUB"): shown above the
   * value axis and in the data table's caption. */
  yLabel?: string;
  /** "time" (the default) reads x as milliseconds since the epoch and
   * writes it as a date; "number" writes it as a number. */
  xType?: "time" | "number";
  /** Overrides how an x value is written. */
  formatX?: (x: number) => string;
  /** Overrides how a y value is written, on the axis and in the text. */
  formatY?: (y: number) => string;
  /** Height of the drawing, in CSS pixels. */
  height?: number;
  /** Stretch the value axis to include zero. Off by default: a chart of
   * values far from zero would otherwise be a flat line. */
  includeZero?: boolean;
  /** Say under the chart when the value axis does not start at zero. On by
   * default. */
  axisNote?: boolean;
  /** Which way time runs. "ltr" (the default) keeps it left to right in
   * every language, as Heatmap does and as most financial charts do;
   * "locale" runs it right to left under a right-to-left locale. The text
   * alternative says which. */
  timeDirection?: "ltr" | "locale";
  /** How the data table is offered: "hidden" (the default) to assistive
   * technology only, "toggle" behind a disclosure everyone can open. */
  dataTable?: "hidden" | "toggle";
  /** What the chart says while it has nothing to draw; the locale's "No
   * data to show." by default. */
  emptyText?: string;
};

/** Dash pattern per series, by position: colour is never the only cue. */
const DASHES = [undefined, "6 4", "2 3", "8 3 2 3"];
const TONES: ChartTone[] = ["accent", "neutral", "warning"];

const toneOf = (s: LineSeries, i: number): ChartTone => s.tone ?? TONES[i % TONES.length]!;
const dashOf = (i: number) => DASHES[i % DASHES.length];

/** Gap between the value labels and the plot, and the plot's inset from
 * the far edge. */
const GAP = 8;

/** A multi-series line chart in SVG. Each series has its own semantic
 * colour, dash pattern and legend entry, so no series is told by colour
 * alone. Axis labels follow the locale's digits and dates. Screen readers
 * get a summary of every series and a data table; the drawing itself is
 * hidden from them. Nothing animates, so there is no motion to reduce.
 * The chart is not interactive: the data table is how a value is read
 * exactly. */
export function LineChart({
  label,
  description,
  series,
  xLabel,
  yLabel,
  xType = "time",
  formatX,
  formatY,
  height = 200,
  includeZero = false,
  axisNote = true,
  timeDirection = "ltr",
  dataTable = "hidden",
  emptyText,
}: LineChartProps) {
  const locale = useStoaFormat();
  const { direction } = useLocale();
  const words = locale.messages;
  const plot = useRef<HTMLDivElement>(null);
  const { width, fontSize } = useChartBox(plot);

  const drawn = series.filter((s) => s.points.length > 0);
  const empty = drawn.length === 0;
  const rtl = timeDirection === "locale" && direction === "rtl";

  const xText = formatX ?? ((x: number) => (xType === "time" ? formatDate(locale.locale, x) : locale.digits(String(x))));
  const ys = drawn.flatMap((s) => s.points.map((p) => p.y));
  const valueDecimals = decimalsOf(ys);
  const yText = formatY ?? ((y: number) => locale.decimal(y, valueDecimals));

  const xs = [...new Set(drawn.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const low = Math.min(...ys);
  const high = Math.max(...ys);
  const ticks = niceTicks(includeZero ? Math.min(0, low) : low, includeZero ? Math.max(0, high) : high, Math.max(3, Math.floor(height / 48)));
  const tickText = formatY ?? ((y: number) => locale.decimal(y, ticks.decimals));
  const lo = ticks.values[0]!;
  const hi = ticks.values[ticks.values.length - 1]!;
  const leavesZeroOut = !empty && (lo > 0 || hi < 0);

  // Layout, in CSS pixels. The value axis sits where time starts: on the
  // left while time runs left to right, on the right otherwise.
  const tickLabels = ticks.values.map(tickText);
  const labelWidth = Math.max(...tickLabels.map((t) => textWidth(t, fontSize)));
  const axisSide = labelWidth + GAP;
  const top = fontSize;
  const bottom = height - fontSize * 2;
  const left = rtl ? GAP : axisSide;
  const right = width - (rtl ? axisSide : GAP);
  const xMin = xs[0] ?? 0;
  const xMax = xs[xs.length - 1] ?? 1;
  const xPos = (x: number) => {
    const t = xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin);
    return rtl ? right - t * (right - left) : left + t * (right - left);
  };
  const yPos = (y: number) => bottom - ((y - lo) / (hi - lo || 1)) * (bottom - top);

  const xLabels = xs.map(xText);
  // The first and last labels hang inwards so they stay inside the
  // drawing; the others centre on their point. As many labels as fit
  // without touching, always the first and the last.
  const anchorOf = (n: number, count: number): "start" | "middle" | "end" =>
    count === 1 ? "middle" : n === 0 ? (rtl ? "end" : "start") : n === count - 1 ? (rtl ? "start" : "end") : "middle";
  const fitsApart = (indices: number[]) => {
    const spans = indices.map((index, n) => {
      const x = xPos(xs[index]!);
      const w = textWidth(xLabels[index]!, fontSize);
      const anchor = anchorOf(n, indices.length);
      return anchor === "start" ? [x, x + w] : anchor === "end" ? [x - w, x] : [x - w / 2, x + w / 2];
    });
    spans.sort((a, b) => a[0]! - b[0]!);
    return spans.every((span, n) => n === 0 || span[0]! - spans[n - 1]![1]! >= GAP * 2);
  };
  let xTicks = spreadIndices(xs.length, 1);
  for (let count = xs.length; count >= 2; count--) {
    const indices = spreadIndices(xs.length, count);
    if (fitsApart(indices)) {
      xTicks = indices;
      break;
    }
  }

  const summary = empty
    ? (emptyText ?? words.noChartData)
    : [
        description,
        words.seriesList(
          drawn.map((s) => {
            const values = s.points.map((p) => p.y);
            const first = s.points[0]!;
            const last = s.points[s.points.length - 1]!;
            return words.seriesSummary(s.name, yText(first.y), xText(first.x), yText(last.y), xText(last.x), yText(Math.min(...values)), yText(Math.max(...values)));
          }),
        ),
        rtl ? words.timeRightToLeft : words.timeLeftToRight,
      ]
        .filter(Boolean)
        .join(" ");

  type Row = { x: number; values: Map<string, number> };
  const rows: Row[] = xs.map((x) => ({
    x,
    values: new Map(drawn.flatMap((s) => s.points.filter((p) => p.x === x).map((p) => [s.id, p.y] as const))),
  }));
  const columns: TableColumn<Row>[] = [
    { id: "x", header: xLabel, cell: (r) => xText(r.x) },
    ...drawn.map((s) => ({
      id: `series-${s.id}`,
      header: s.name,
      numeric: true,
      cell: (r: Row) => {
        const v = r.values.get(s.id);
        return v === undefined ? null : yText(v);
      },
    })),
  ];
  const table = (scrollable: boolean) => (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(r) => r.x}
      rowHeader="x"
      caption={yLabel ? `${label} (${yLabel})` : label}
      hideCaption
      emptyText={summary}
      scrollable={scrollable}
    />
  );

  return (
    <figure className="stoa-chart" aria-label={label}>
      {yLabel && !empty && (
        <p className="stoa-chart__axis-label" aria-hidden="true">
          {yLabel}
        </p>
      )}
      <div ref={plot} className="stoa-chart__plot" style={{ blockSize: height }}>
        {empty ? (
          <p className="stoa-chart__empty" aria-hidden="true">
            {summary}
          </p>
        ) : (
          <svg className="stoa-chart__svg" aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            {ticks.values.map((v, i) => (
              <g key={v}>
                <line className="stoa-chart__grid" x1={left} x2={right} y1={yPos(v)} y2={yPos(v)} />
                <text
                  className="stoa-chart__tick"
                  x={rtl ? right + GAP : left - GAP}
                  y={yPos(v)}
                  dominantBaseline="middle"
                  textAnchor={rtl ? "start" : "end"}
                >
                  {tickLabels[i]}
                </text>
              </g>
            ))}
            <line className="stoa-chart__axis" x1={left} x2={right} y1={bottom} y2={bottom} />
            {xTicks.map((index, n) => (
              <text key={xs[index]} className="stoa-chart__tick" x={xPos(xs[index]!)} y={height - fontSize / 2} textAnchor={anchorOf(n, xTicks.length)}>
                {xLabels[index]}
              </text>
            ))}
            {drawn.map((s, i) =>
              s.points.length === 1 ? (
                <circle key={s.id} className={`stoa-chart__dot stoa-chart__dot--${toneOf(s, i)}`} cx={xPos(s.points[0]!.x)} cy={yPos(s.points[0]!.y)} r={3} />
              ) : (
                <path
                  key={s.id}
                  className={`stoa-chart__line stoa-chart__line--${toneOf(s, i)}`}
                  d={s.points.map((p, n) => `${n === 0 ? "M" : "L"}${xPos(p.x).toFixed(1)} ${yPos(p.y).toFixed(1)}`).join(" ")}
                  strokeDasharray={dashOf(i)}
                />
              ),
            )}
          </svg>
        )}
      </div>
      {!empty && (
        <ul className="stoa-chart__legend">
          {drawn.map((s, i) => (
            <li key={s.id} className="stoa-chart__legend-item">
              <svg className="stoa-chart__swatch" aria-hidden="true" width={24} height={8} viewBox="0 0 24 8">
                <line className={`stoa-chart__line stoa-chart__line--${toneOf(s, i)}`} x1={0} x2={24} y1={4} y2={4} strokeDasharray={dashOf(i)} />
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {axisNote && leavesZeroOut && <p className="stoa-chart__note">{words.axisNotZero(isolate(tickText(lo)), isolate(tickText(hi)))}</p>}
      {!empty &&
        (dataTable === "toggle" ? (
          <Disclosure summary={words.dataTable} className="stoa-chart__data">
            {table(true)}
          </Disclosure>
        ) : (
          <div className="stoa-visually-hidden">{table(false)}</div>
        ))}
      <figcaption className="stoa-visually-hidden">
        {summary}
      </figcaption>
    </figure>
  );
}
