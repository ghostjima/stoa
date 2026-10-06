// Chart scales, independent of drawing: value-axis ticks at round steps,
// time-axis labels picked from the data, and dates in the locale's words
// and digits.

export type Ticks = {
  /** Round values from the lowest to the highest, both included. */
  values: number[];
  /** The step between two ticks. */
  step: number;
  /** Decimals a tick needs to be written exactly. */
  decimals: number;
};

/** About `count` round ticks covering `min` to `max`: steps of 1, 2 or 5
 * times a power of ten, the first at or below `min` and the last at or
 * above `max`. A flat range is widened so it still has an axis. */
export function niceTicks(min: number, max: number, count = 5): Ticks {
  let lo = min;
  let hi = max;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { values: [0, 1], step: 1, decimals: 0 };
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const rough = (hi - lo) / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const ratio = rough / magnitude;
  const step = (ratio < 1.5 ? 1 : ratio < 3 ? 2 : ratio < 7 ? 5 : 10) * magnitude;
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const first = Math.floor(lo / step + 1e-9) * step;
  const last = Math.ceil(hi / step - 1e-9) * step;
  const values: number[] = [];
  for (let i = 0; first + i * step <= last + step / 2; i++) values.push(Number((first + i * step).toFixed(decimals)));
  return { values, step, decimals };
}

/** Indices of up to `max` items out of `n`, evenly spread, always the first
 * and the last. */
export function spreadIndices(n: number, max: number): number[] {
  if (n <= 0) return [];
  if (n === 1 || max <= 1) return [0];
  const k = Math.min(n, Math.max(2, Math.floor(max)));
  const out = new Set<number>();
  for (let i = 0; i < k; i++) out.add(Math.round((i * (n - 1)) / (k - 1)));
  return [...out];
}

/** Decimals needed to write every value as given, at most `cap`. */
export function decimalsOf(values: number[], cap = 4): number {
  let most = 0;
  for (const v of values) {
    const text = String(v);
    const point = text.indexOf(".");
    if (point >= 0 && !text.includes("e")) most = Math.max(most, text.length - point - 1);
  }
  return Math.min(cap, most);
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** A date (milliseconds since the epoch) as day, short month and year, in
 * the locale's words and digits ("4 Oct 2026", "٤ أكتوبر ٢٠٢٦"). Formatted
 * in UTC, so a date given as midnight UTC is the same day everywhere. */
export function formatDate(locale: string, at: number): string {
  let format = dateFormats.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    dateFormats.set(locale, format);
  }
  return format.format(at);
}

/** Rough width of `text` in the numeric face at `fontSize`: Plex Mono's
 * advance is 0.6 em, and the estimate leaves a little room over it. Good
 * enough to reserve space for axis labels without measuring text. */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62;
}
