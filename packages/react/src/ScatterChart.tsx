import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLocale } from "react-aria-components";
import { decimalsOf, niceTicks } from "./chartScale";
import { Disclosure } from "./Disclosure";
import type { ChartTone } from "./LineChart";
import { LiveRegion } from "./LiveRegion";
import { isolate, useStoaFormat } from "./locale";
import { nearestPoint, rowOffset, scatterOrders, shapePath, stepThrough, textDirection, traceShape, type ScatterShape } from "./scatterScale";
import { Table, type TableColumn } from "./Table";
import { drawEmpty, fitCanvas, readCanvasTokens, useCanvasRefit, useInvalidateOnTokensVersion, useTokenSignal, type CanvasTokens } from "./tokens";

export type { ScatterShape } from "./scatterScale";

export type ScatterCategory = {
  /** Stable key, which each point's `category` names. */
  id: string;
  /** Shown in the legend, the text alternative, the data table and what
   * is read for a focused point. */
  name: string;
  /** The default order is circle, square, triangle, diamond, cross. */
  shape?: ScatterShape;
  /** The default order is accent, neutral, warning, as on LineChart. */
  tone?: ChartTone;
  /** "small" draws the points smaller, for a background category ("other
   * issues") that the others should stand out from. */
  size?: "regular" | "small";
};

export type ScatterPoint = {
  /** Stable key; also seeds the point's place within a category row. */
  id: string;
  x: number;
  /** A number on a numeric value axis; one of `yCategories` on a
   * categorical one. A point whose y does not fit the axis is left out. */
  y: number | string;
  /** The id of the point's category. */
  category: string;
  /** What the point is, in the caller's words ("RU000A1 · AA · 3.4
   * years"): drawn beside the point while it is focused or hovered, read
   * through a polite live region, and the row header of the data table. */
  label: string;
};

export type ScatterChartProps = {
  /** What the chart is: its accessible name. */
  label: string;
  /** Plain-language description of what the chart shows, read before the
   * generated summary. */
  description?: string;
  /** In order of importance: the first is drawn on top of the others and
   * listed first in the legend and the data table. */
  categories: ScatterCategory[];
  points: ScatterPoint[];
  /** Name of the horizontal axis, with its unit ("Duration, years"). */
  xLabel: string;
  /** Name of the vertical axis ("Rating", "Yield, %"). */
  yLabel: string;
  /** Makes the vertical axis categorical: these labels, drawn top to
   * bottom in this order (ratings from AAA down), one row each. */
  yCategories?: readonly string[];
  /** Spread the points of a category row a little up and down, by a
   * stable offset from each point's id, so points with a similar x do not
   * hide each other. On by default; a numeric axis is never spread. */
  spread?: boolean;
  /** How an x value is written in the text alternative, the data table
   * and nowhere else: axis ticks are plain numbers in the locale's digits,
   * and the axis name carries the unit. */
  formatX?: (x: number) => string;
  /** The same for a numeric y value. */
  formatY?: (y: number) => string;
  /** Stretch the numeric axes to include zero. */
  includeZero?: boolean;
  /** Height of the drawing, in CSS pixels. */
  height?: number;
  /** How the data table is offered: "hidden" (the default) to assistive
   * technology only, "toggle" behind a disclosure everyone can open. */
  dataTable?: "hidden" | "toggle";
  /** The ids of the categories whose points the data table lists; every
   * category by default. */
  tableCategories?: readonly string[];
  /** The data table's name; the chart's label by default. */
  tableCaption?: string;
  /** Header of the data table's first column, the points' labels; the
   * locale's "Point" by default. */
  labelHeader?: string;
  /** What the chart says while it has nothing to draw; the locale's "No
   * data to show." by default. */
  emptyText?: string;
  /** Bumped to force a token re-read and redraw, as an alternative to
   * dispatching `stoa:tokens` on an ancestor (see `useTokenSignal`). */
  tokensVersion?: number;
};

const SHAPES: ScatterShape[] = ["circle", "square", "triangle", "diamond", "cross"];
const TONES: ChartTone[] = ["accent", "neutral", "warning"];

const shapeOf = (c: ScatterCategory, i: number): ScatterShape => c.shape ?? SHAPES[i % SHAPES.length]!;
const toneOf = (c: ScatterCategory, i: number): ChartTone => c.tone ?? TONES[i % TONES.length]!;

/** A point's radius as a share of the density's row height (24, 28 and 36
 * pixels give about 3.8, 4.5 and 5.8), and of that for a small category. */
const POINT_SIZE = 0.16;
const SMALL = 0.6;
/** How far from a point the pointer still picks it, in point radii. */
const HIT = 3;
/** How far up and down a category row's points spread, as a share of the
 * row's height: a quarter of it either way. */
const SPREAD = 0.5;

type ScatterTokens = CanvasTokens & {
  tones: Record<ChartTone, string>;
  focus: string;
  borderStrong: string;
  /** The density's type size and cell padding, in CSS pixels. */
  fontSize: number;
  padding: number;
};

function readScatterTokens(el: Element): ScatterTokens {
  const base = readCanvasTokens(el);
  const s = (el.ownerDocument.defaultView ?? window).getComputedStyle(el);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    ...base,
    tones: {
      accent: base.accent,
      neutral: base.muted,
      warning: v("--stoa-color-warning"),
      up: v("--stoa-color-up"),
      down: v("--stoa-color-down"),
    },
    focus: v("--stoa-color-focus"),
    borderStrong: v("--stoa-color-border-strong"),
    // Without the tokens, the regular density's values.
    fontSize: parseFloat(v("--stoa-density-font-size")) || 13,
    padding: parseFloat(v("--stoa-density-cell-padding-x")) || 8,
  };
}

/** A point that fits the axes, with what it is drawn and ordered by. */
type Placed = {
  point: ScatterPoint;
  /** Its category's position in `categories`. */
  layer: number;
  /** Its category row on a categorical axis; its value on a numeric one. */
  yValue: number;
};

type Model = {
  placed: Placed[];
  categories: ScatterCategory[];
  /** Indices into `placed`, bottom to top: the last category first. */
  drawOrder: number[];
  xLo: number;
  xHi: number;
  yLo: number;
  yHi: number;
  yCategories: readonly string[] | null;
  spread: boolean;
  /** A tick in the locale's digits, with the decimals its step needs. */
  tick: (v: number, decimals: number) => string;
  rtl: boolean;
};

/** Where each point was drawn, in CSS pixels, and how far from it the
 * pointer still picks it. */
type Positions = { xs: Float64Array; ys: Float64Array; hit: number };

function draw(canvas: HTMLCanvasElement, t: ScatterTokens, m: Model, height: number, emptyText: string, active: number | null): Positions | null {
  const width = canvas.clientWidth;
  const ctx = fitCanvas(canvas, height);
  ctx.fillStyle = t.surface;
  ctx.fillRect(0, 0, width, height);
  if (m.placed.length === 0) {
    drawEmpty(ctx, t, emptyText, width, height);
    return null;
  }
  const pad = t.padding;
  const fs = t.fontSize;
  const size = t.rowHeight * POINT_SIZE;

  // The value axis: its labels and where each one sits.
  const top = m.yCategories ? pad : pad + fs / 2;
  const bottom = height - fs - pad * 1.5;
  let yTicks: { text: string; at: number }[];
  let yPos: (v: number, id: string) => number;
  if (m.yCategories) {
    const rows = m.yCategories.length;
    const rowHeight = (bottom - top) / rows;
    // Every row is labelled while the rows are tall enough for a line of
    // text; otherwise every second or third, always from the first.
    const every = Math.max(1, Math.ceil((fs * 1.4) / rowHeight));
    yTicks = m.yCategories.flatMap((text, i) => (i % every === 0 ? [{ text, at: top + (i + 0.5) * rowHeight }] : []));
    yPos = (row, id) => top + (row + 0.5 + (m.spread ? rowOffset(id) * SPREAD : 0)) * rowHeight;
    ctx.font = t.wordFont;
  } else {
    const ticks = niceTicks(m.yLo, m.yHi, Math.max(3, Math.floor((bottom - top) / (fs * 3))));
    const lo = ticks.values[0]!;
    const hi = ticks.values[ticks.values.length - 1]!;
    yPos = (v) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
    yTicks = ticks.values.map((v) => ({ text: m.tick(v, ticks.decimals), at: yPos(v, "") }));
    ctx.font = t.font;
  }
  const yFont = ctx.font;
  const labelWidth = Math.max(...yTicks.map((y) => ctx.measureText(y.text).width));

  // The x axis grows toward the inline end, and the value axis stands at
  // its start: on the left, and on the right in a right-to-left locale.
  ctx.font = t.font;
  const axisEdge = pad + labelWidth + pad;
  let xTicks = niceTicks(m.xLo, m.xHi, 2);
  let xTexts: string[] = [];
  let start = 0;
  let end = 0;
  for (let count = Math.max(2, Math.floor((width - axisEdge) / (fs * 6))); count >= 2; count--) {
    xTicks = niceTicks(m.xLo, m.xHi, count);
    xTexts = xTicks.values.map((v) => m.tick(v, xTicks.decimals));
    const widths = xTexts.map((x) => ctx.measureText(x).width);
    start = Math.max(axisEdge, widths[0]! / 2 + 2);
    end = width - Math.max(pad, widths[widths.length - 1]! / 2 + 2);
    const gap = (end - start) / Math.max(1, xTicks.values.length - 1);
    if (gap >= Math.max(...widths) + fs) break;
  }
  const xLo = xTicks.values[0]!;
  const xHi = xTicks.values[xTicks.values.length - 1]!;
  const xPos = (v: number) => {
    const share = (v - xLo) / (xHi - xLo || 1);
    return m.rtl ? width - start - share * (end - start) : start + share * (end - start);
  };

  // Grid, axis and labels: muted, under the points.
  ctx.lineWidth = 1;
  ctx.strokeStyle = t.border;
  ctx.beginPath();
  for (const v of xTicks.values) {
    const x = Math.round(xPos(v)) + 0.5;
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }
  if (!m.yCategories) {
    for (const y of yTicks) {
      ctx.moveTo(m.rtl ? width - end : start, Math.round(y.at) + 0.5);
      ctx.lineTo(m.rtl ? width - start : end, Math.round(y.at) + 0.5);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = t.borderStrong;
  ctx.beginPath();
  ctx.moveTo(m.rtl ? width - end : start, Math.round(bottom) + 0.5);
  ctx.lineTo(m.rtl ? width - start : end, Math.round(bottom) + 0.5);
  ctx.stroke();
  ctx.fillStyle = t.muted;
  ctx.textBaseline = "middle";
  ctx.font = yFont;
  ctx.textAlign = m.rtl ? "left" : "right";
  // Each label in the direction of its own first letter, so "A+" stays
  // "A+" in a right-to-left page.
  for (const y of yTicks) {
    ctx.direction = textDirection(y.text);
    ctx.fillText(y.text, m.rtl ? width - pad - labelWidth : pad + labelWidth, y.at);
  }
  ctx.direction = "ltr";
  ctx.font = t.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  xTicks.values.forEach((v, i) => ctx.fillText(xTexts[i]!, xPos(v), bottom + pad / 2));

  // The points, one path per category, the last category first so the
  // first is drawn on top. A filled shape is ringed in the surface colour,
  // so overlapping points of two categories stay apart.
  const xs = new Float64Array(m.placed.length);
  const ys = new Float64Array(m.placed.length);
  for (let i = 0; i < m.placed.length; i++) {
    const p = m.placed[i]!;
    xs[i] = xPos(p.point.x);
    ys[i] = yPos(p.yValue, p.point.id);
  }
  let from = 0;
  while (from < m.drawOrder.length) {
    const layer = m.placed[m.drawOrder[from]!]!.layer;
    let to = from;
    while (to < m.drawOrder.length && m.placed[m.drawOrder[to]!]!.layer === layer) to++;
    const category = m.categories[layer]!;
    const shape = shapeOf(category, layer);
    const s = category.size === "small" ? size * SMALL : size;
    ctx.beginPath();
    for (let n = from; n < to; n++) traceShape(ctx, shape, xs[m.drawOrder[n]!]!, ys[m.drawOrder[n]!]!, s);
    const tone = t.tones[toneOf(category, layer)];
    if (shape === "cross") {
      ctx.lineWidth = Math.max(1.5, s * 0.4);
      ctx.strokeStyle = tone;
      ctx.stroke();
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = t.surface;
      ctx.stroke();
      ctx.fillStyle = tone;
      ctx.fill();
    }
    from = to;
  }

  // The focused or hovered point: a ring in the focus colour and its label
  // on a surface plate beside it, toward the inline end where it fits.
  if (active !== null && m.placed[active]) {
    const x = xs[active]!;
    const y = ys[active]!;
    const ring = size * 1.4 + 3;
    ctx.beginPath();
    ctx.arc(x, y, ring, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = t.focus;
    ctx.stroke();
    const text = m.placed[active]!.point.label;
    ctx.font = t.wordFont;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const h = Math.ceil(fs + pad);
    const after = x + ring + 4;
    const before = x - ring - 4 - w;
    let left = m.rtl ? (before >= 0 ? before : after) : after + w <= width ? after : before;
    left = Math.max(0, Math.min(width - w, left));
    const plateTop = Math.max(0, Math.min(height - h, y - h / 2));
    ctx.fillStyle = t.surface;
    ctx.fillRect(left, plateTop, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = t.border;
    ctx.strokeRect(left + 0.5, plateTop + 0.5, w - 1, h - 1);
    ctx.fillStyle = t.text;
    ctx.direction = textDirection(text);
    ctx.textAlign = ctx.direction === "rtl" ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, ctx.direction === "rtl" ? left + w - pad : left + pad, plateTop + h / 2);
  }
  return { xs, ys, hit: size * HIT };
}

/** A scatter chart on a canvas: one point per item, x across and a
 * numeric or categorical axis down, each category drawn in its own shape
 * and tone and named in the legend, so no category is told by colour
 * alone. The x axis grows toward the inline end (left to right, and right
 * to left in a right-to-left locale, as Heatmap's time does); point size,
 * type and padding follow the density. Colours are read from the tokens
 * and redrawn on a theme or density change (`useTokenSignal`), and a few
 * hundred points are drawn as one path per category.
 *
 * The chart is one tab stop. Left and right arrows walk the points by x
 * (equal x top to bottom), up and down arrows walk them top to bottom
 * (equal rows by x), Home and End go to the smallest and the largest x,
 * and Escape clears; the pointer picks the nearest point within three
 * point radii. The active point gets a focus ring and its label beside
 * it, and the label is read through a polite live region. Screen readers
 * also get a summary of every category and a data table. */
export function ScatterChart({
  label,
  description,
  categories,
  points,
  xLabel,
  yLabel,
  yCategories,
  spread = true,
  formatX,
  formatY,
  includeZero = false,
  height = 260,
  dataTable = "hidden",
  tableCategories,
  tableCaption,
  labelHeader,
  emptyText,
  tokensVersion,
}: ScatterChartProps) {
  const locale = useStoaFormat();
  const rtl = useLocale().direction === "rtl";
  const words = locale.messages;
  const empty = emptyText ?? words.noChartData;
  const canvas = useRef<HTMLCanvasElement>(null);
  const tokens = useRef<ScatterTokens | null>(null);
  const positions = useRef<Positions | null>(null);
  const [active, setActive] = useState<{ id: string; via: "keyboard" | "pointer" } | null>(null);
  const hintId = useId();
  const captionId = useId();

  const layerOf = new Map(categories.map((c, i) => [c.id, i]));
  const rowOf = yCategories ? new Map(yCategories.map((c, i) => [c, i])) : null;
  const placed: Placed[] = [];
  for (const point of points) {
    const layer = layerOf.get(point.category);
    if (layer === undefined || !Number.isFinite(point.x)) continue;
    const yValue = rowOf ? (typeof point.y === "string" ? rowOf.get(point.y) : undefined) : typeof point.y === "number" && Number.isFinite(point.y) ? point.y : undefined;
    if (yValue === undefined) continue;
    placed.push({ point, layer, yValue });
  }
  const isEmpty = placed.length === 0;
  const indexOf = new Map(placed.map((p, i) => [p.point.id, i]));
  const { byX, byY } = scatterOrders(placed.map((p) => ({ x: p.point.x, row: rowOf ? p.yValue : -p.yValue, layer: p.layer })));
  const drawOrder = placed.map((_, i) => i).sort((a, b) => placed[b]!.layer - placed[a]!.layer || a - b);
  const activeIndex = active ? (indexOf.get(active.id) ?? null) : null;

  const xValues = placed.map((p) => p.point.x);
  const yValues = rowOf ? [] : placed.map((p) => p.yValue);
  const range = (values: number[]) => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    return includeZero ? [Math.min(0, lo), Math.max(0, hi)] : [lo, hi];
  };
  const [xLo, xHi] = isEmpty ? [0, 1] : range(xValues);
  const [yLo, yHi] = isEmpty || rowOf ? [0, 1] : range(yValues);
  const xDecimals = decimalsOf(xValues);
  const yDecimals = decimalsOf(yValues);
  const xText = formatX ?? ((x: number) => locale.decimal(x, xDecimals));
  const yNumber = formatY ?? ((y: number) => locale.decimal(y, yDecimals));
  const yText = (p: Placed) => (rowOf ? String(p.point.y) : yNumber(p.yValue));

  const model: Model = {
    placed,
    categories,
    drawOrder,
    xLo: xLo!,
    xHi: xHi!,
    yLo: yLo!,
    yHi: yHi!,
    yCategories: yCategories ?? null,
    spread,
    tick: (v, decimals) => locale.decimal(v, decimals),
    rtl,
  };

  const paint = () => {
    const c = canvas.current;
    if (!c) return;
    tokens.current ??= readScatterTokens(c);
    positions.current = draw(c, tokens.current, model, height, empty, activeIndex);
  };
  // Drop the cached tokens when `tokensVersion` changes, before the effect
  // below draws, so that draw reads fresh ones (as Heatmap does).
  useInvalidateOnTokensVersion(tokensVersion, () => {
    tokens.current = null;
  });
  // Every render draws: the data, the active point and the direction all
  // come through props and state.
  useEffect(() => paint());
  useTokenSignal(canvas, undefined, () => {
    tokens.current = null;
    paint();
  });
  useCanvasRefit(canvas, paint);

  const moveTo = (index: number | null | undefined) => {
    if (index === null || index === undefined) return;
    setActive({ id: placed[index]!.point.id, via: "keyboard" });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      // The arrows follow the drawing: right goes toward larger x in a
      // left-to-right locale and toward smaller x in a right-to-left one.
      case "ArrowRight":
        moveTo(stepThrough(byX, activeIndex, rtl ? -1 : 1));
        break;
      case "ArrowLeft":
        moveTo(stepThrough(byX, activeIndex, rtl ? 1 : -1));
        break;
      case "ArrowDown":
        moveTo(stepThrough(byY, activeIndex, 1));
        break;
      case "ArrowUp":
        moveTo(stepThrough(byY, activeIndex, -1));
        break;
      case "Home":
        moveTo(byX[0]);
        break;
      case "End":
        moveTo(byX[byX.length - 1]);
        break;
      case "Escape":
        // Only a cleared point takes the key; otherwise it goes on, to
        // close a dialog the chart sits in, for example.
        if (activeIndex === null) return;
        setActive(null);
        e.stopPropagation();
        break;
      default:
        return;
    }
    e.preventDefault();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const at = positions.current;
    const c = canvas.current;
    if (!at || !c) return;
    const box = c.getBoundingClientRect();
    const hit = nearestPoint(at.xs, at.ys, drawOrder, e.clientX - box.left, e.clientY - box.top, at.hit);
    if (hit !== null) {
      const id = placed[hit]!.point.id;
      if (active?.id !== id || active.via !== "pointer") setActive({ id, via: "pointer" });
    } else if (active?.via === "pointer") setActive(null);
  };
  const onPointerLeave = () => {
    if (active?.via === "pointer") setActive(null);
  };
  const onBlur = () => {
    if (active?.via === "keyboard") setActive(null);
  };

  const counts = categories.map((c) => placed.filter((p) => p.point.category === c.id).length);
  const shown = categories.map((c, i) => ({ c, i })).filter(({ i }) => counts[i]! > 0);
  const byXPosition = new Map(byX.map((index, n) => [index, n]));
  const [topRow, bottomRow] = rowOf
    ? [Math.min(...placed.map((p) => p.yValue)), Math.max(...placed.map((p) => p.yValue))]
    : [0, 0];
  // A categorical axis is read top to bottom, a numeric one low to high.
  const yFrom = rowOf ? yCategories![topRow]! : yNumber(Math.min(...yValues));
  const yTo = rowOf ? yCategories![bottomRow]! : yNumber(Math.max(...yValues));
  const summary = isEmpty
    ? empty
    : [
        description,
        words.scatterSummary(
          locale.integer(placed.length),
          shown.map(({ c, i }) => words.scatterCount(c.name, locale.integer(counts[i]!))),
        ),
        words.scatterRange(xLabel, isolate(xText(Math.min(...xValues))), isolate(xText(Math.max(...xValues)))),
        words.scatterRange(yLabel, isolate(yFrom), isolate(yTo)),
        rtl ? words.scatterXRightToLeft : words.scatterXLeftToRight,
      ]
        .filter(Boolean)
        .join(" ");

  const liveText =
    activeIndex === null
      ? ""
      : words.scatterActive(
          placed[activeIndex]!.point.label,
          categories[placed[activeIndex]!.layer]!.name,
          locale.integer(byXPosition.get(activeIndex)! + 1),
          locale.integer(placed.length),
        );

  const listed = tableCategories ? new Set(tableCategories) : null;
  const rows = byX
    .filter((i) => !listed || listed.has(placed[i]!.point.category))
    .sort((a, b) => placed[a]!.layer - placed[b]!.layer || byXPosition.get(a)! - byXPosition.get(b)!)
    .map((i) => placed[i]!);
  // The label and a category of the value axis are values: each keeps
  // the direction of its own first letter ("BB+" stays "BB+" right to
  // left); number cells are isolated by the table itself.
  const columns: TableColumn<Placed>[] = [
    { id: "label", header: labelHeader ?? words.scatterPoint, cell: (p) => <bdi>{p.point.label}</bdi> },
    { id: "category", header: words.scatterCategory, cell: (p) => categories[p.layer]!.name },
    { id: "x", header: xLabel, numeric: true, cell: (p) => xText(p.point.x) },
    { id: "y", header: yLabel, numeric: !rowOf, cell: (p) => (rowOf ? <bdi>{yText(p)}</bdi> : yText(p)) },
  ];
  const table = (scrollable: boolean) => (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(p) => p.point.id}
      rowHeader="label"
      caption={tableCaption ?? label}
      hideCaption
      emptyText={summary}
      scrollable={scrollable}
    />
  );

  return (
    <figure className="stoa-chart stoa-scatter" aria-label={label} aria-describedby={captionId}>
      {!isEmpty && (
        <p className="stoa-chart__axis-label" aria-hidden="true">
          {yLabel}
        </p>
      )}
      {/* One element whether or not there is anything to draw, so the
          canvas the token signal and the refit watch is never replaced;
          only a chart with points is a tab stop. */}
      <div
        className="stoa-scatter__plot"
        role={isEmpty ? undefined : "application"}
        aria-label={isEmpty ? undefined : label}
        aria-describedby={isEmpty ? undefined : hintId}
        tabIndex={isEmpty ? undefined : 0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onBlur={onBlur}
      >
        {/* The height is set before the first draw, so the canvas does
            not take its default 2:1 shape and then jump. */}
        <canvas ref={canvas} className="stoa-scatter__canvas" aria-hidden="true" style={{ blockSize: height }} />
      </div>
      {!isEmpty && (
        <p className="stoa-scatter__x-label" aria-hidden="true">
          {xLabel}
        </p>
      )}
      {!isEmpty && (
        <ul className="stoa-chart__legend">
          {shown.map(({ c, i }) => (
            <li key={c.id} className="stoa-chart__legend-item">
              <svg className="stoa-scatter__swatch" aria-hidden="true" width={16} height={16} viewBox="0 0 16 16">
                <path
                  className={`stoa-scatter__mark stoa-scatter__mark--${toneOf(c, i)}${shapeOf(c, i) === "cross" ? " stoa-scatter__mark--open" : ""}`}
                  d={shapePath(shapeOf(c, i), 8, 8, c.size === "small" ? 2.7 : 4.5)}
                />
              </svg>
              {c.name}
            </li>
          ))}
        </ul>
      )}
      {!isEmpty &&
        (dataTable === "toggle" ? (
          <Disclosure summary={words.dataTable} className="stoa-chart__data">
            {table(true)}
          </Disclosure>
        ) : (
          <div className="stoa-visually-hidden">{table(false)}</div>
        ))}
      <LiveRegion>{liveText}</LiveRegion>
      <span id={hintId} hidden>
        {words.scatterKeys}
      </span>
      <figcaption id={captionId} className="stoa-visually-hidden">
        {summary}
      </figcaption>
    </figure>
  );
}
