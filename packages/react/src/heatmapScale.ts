// Heatmap colour scale, independent of drawing: displayed size to
// opacity on a log scale, so a few large orders do not wash out the rest.

/** Opacity for a cell with `size` shares when the largest cell is `max`. */
export function cellAlpha(size: number, max: number): number {
  if (size <= 0 || max <= 0) return 0;
  return Math.min(1, Math.log1p(size) / Math.log1p(max));
}

/** The largest absolute value in a column-major matrix. */
export function maxAbs(cells: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < cells.length; i++) m = Math.max(m, Math.abs(cells[i]!));
  return m;
}
