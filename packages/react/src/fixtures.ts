// Deterministic, plausible market data for stories and tests.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** A book in the engine's flat form around `mid`, `depth` levels a side. */
export function sampleBook(mid = 222.6, depth = 12, seed = 7): Float64Array {
  const r = rng(seed);
  const out = [depth, depth];
  for (let i = 0; i < depth; i++) out.push(+(mid - 0.01 * (i + 1)).toFixed(2), Math.round(50 + r() * r() * 1500));
  for (let i = 0; i < depth; i++) out.push(+(mid + 0.01 * (i + 1)).toFixed(2), Math.round(50 + r() * r() * 1500));
  return new Float64Array(out);
}

/** A heatmap with a drifting midpoint: bids below, asks above. */
export function sampleHeatmap(columns = 240, rows = 80, seed = 3) {
  const r = rng(seed);
  const cells = new Float32Array(columns * rows);
  let mid = rows / 2;
  for (let c = 0; c < columns; c++) {
    mid = Math.max(10, Math.min(rows - 10, mid + (r() - 0.5) * 1.2));
    for (let row = 0; row < rows; row++) {
      const d = row - mid;
      if (Math.abs(d) < 1 || r() < 0.55) continue;
      const size = Math.round(r() * r() * 2000 * Math.exp(-Math.abs(d) / 12));
      if (size > 0) cells[c * rows + row] = d > 0 ? size : -size;
    }
  }
  return { cells, columns, rows, top: 223.0, tick: 0.01 };
}
