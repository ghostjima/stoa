// Scatter chart geometry and order, independent of drawing: the stable
// spread of points within a category row, the order the arrow keys walk,
// the nearest point to the pointer, and each shape's outline.

/** A stable offset in [-0.5, 0.5) from a point's id, the same on every
 * draw and in every session, so points of one category row and a similar
 * x do not hide each other and do not move when the chart redraws. */
export function rowOffset(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000 - 0.5;
}

/** What the order of the points is decided on. `row` grows downwards: a
 * category row's index, or the negated value on a numeric axis. `layer`
 * is the category's position in the chart's list of categories. */
export type OrderKey = { x: number; row: number; layer: number };

/** The two orders the arrow keys walk, as indices into `keys`.
 *
 * - `byX`: by x, smallest first; points with the same x top to bottom,
 *   then by category order, then as given. Left and right arrows, Home
 *   and End.
 * - `byY`: top to bottom; points in the same row or at the same value by
 *   x, then by category order, then as given. Up and down arrows.
 *
 * Both are total orders, so a key always moves to the same point from the
 * same point, whatever the drawing's size or direction. */
export function scatterOrders(keys: readonly OrderKey[]): { byX: number[]; byY: number[] } {
  const indices = keys.map((_, i) => i);
  const byX = [...indices].sort((a, b) => {
    const p = keys[a]!;
    const q = keys[b]!;
    return p.x - q.x || p.row - q.row || p.layer - q.layer || a - b;
  });
  const byY = [...indices].sort((a, b) => {
    const p = keys[a]!;
    const q = keys[b]!;
    return p.row - q.row || p.x - q.x || p.layer - q.layer || a - b;
  });
  return { byX, byY };
}

/** The point one step along `order` from `current`; the first point of
 * the order when nothing is active yet. The ends do not wrap. */
export function stepThrough(order: readonly number[], current: number | null, delta: 1 | -1): number | null {
  if (order.length === 0) return null;
  if (current === null) return order[0]!;
  const at = order.indexOf(current);
  if (at < 0) return order[0]!;
  return order[Math.max(0, Math.min(order.length - 1, at + delta))]!;
}

/** The index of the point nearest to (`px`, `py`) within `radius`, or
 * null. Among points at the same distance, the one drawn on top wins:
 * `drawOrder` lists the indices bottom to top. */
export function nearestPoint(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  drawOrder: readonly number[],
  px: number,
  py: number,
  radius: number,
): number | null {
  let best: number | null = null;
  let bestDistance = radius * radius;
  for (const i of drawOrder) {
    const dx = xs[i]! - px;
    const dy = ys[i]! - py;
    const d = dx * dx + dy * dy;
    if (d <= bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  return best;
}

/** How a category's points are drawn: no shape is told apart by colour
 * alone, and the legend repeats each one. */
export type ScatterShape = "circle" | "square" | "triangle" | "diamond" | "cross";

/** The part of a 2D context or an SVG path builder a shape is traced with. */
export type Pen = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  closePath(): void;
};

/** Traces `shape` centred on (`x`, `y`), `size` being a circle's radius.
 * The other shapes are scaled to about the same area as the circle, so
 * no category looks heavier by its shape alone. A cross is open: it is
 * stroked, the others are filled. */
export function traceShape(pen: Pen, shape: ScatterShape, x: number, y: number, size: number): void {
  switch (shape) {
    case "circle":
      pen.moveTo(x + size, y);
      pen.arc(x, y, size, 0, Math.PI * 2);
      pen.closePath();
      return;
    case "square": {
      const h = size * 0.89;
      pen.moveTo(x - h, y - h);
      pen.lineTo(x + h, y - h);
      pen.lineTo(x + h, y + h);
      pen.lineTo(x - h, y + h);
      pen.closePath();
      return;
    }
    case "triangle": {
      const h = size * 1.35;
      pen.moveTo(x, y - h);
      pen.lineTo(x + h * 0.95, y + h * 0.7);
      pen.lineTo(x - h * 0.95, y + h * 0.7);
      pen.closePath();
      return;
    }
    case "diamond": {
      const h = size * 1.25;
      pen.moveTo(x, y - h);
      pen.lineTo(x + h, y);
      pen.lineTo(x, y + h);
      pen.lineTo(x - h, y);
      pen.closePath();
      return;
    }
    case "cross": {
      const h = size * 0.9;
      pen.moveTo(x - h, y - h);
      pen.lineTo(x + h, y + h);
      pen.moveTo(x + h, y - h);
      pen.lineTo(x - h, y + h);
      return;
    }
  }
}

/** A shape as an SVG path's `d`, for the legend. */
export function shapePath(shape: ScatterShape, x: number, y: number, size: number): string {
  const parts: string[] = [];
  const n = (v: number) => Number(v.toFixed(2));
  traceShape(
    {
      moveTo: (px, py) => parts.push(`M${n(px)} ${n(py)}`),
      lineTo: (px, py) => parts.push(`L${n(px)} ${n(py)}`),
      // A full circle as two half arcs, from the point the move left at.
      arc: (cx, cy, r) => parts.push(`A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}`),
      closePath: () => parts.push("Z"),
    },
    shape,
    x,
    y,
    size,
  );
  return parts.join("");
}

/** The direction of `text`'s first strong letter, as `dir="auto"` decides
 * it: right to left for Hebrew or Arabic, left to right for any other
 * letter, and left to right for text with no letter at all (a number). A
 * canvas has no "auto", and a label such as "A+" drawn right to left
 * would come out as "+A". */
export function textDirection(text: string): "ltr" | "rtl" {
  const strong = /[\p{L}]/u.exec(text);
  return strong && /[֐-ࣿיִ-﷿ﹰ-﻿]/u.test(strong[0]) ? "rtl" : "ltr";
}
