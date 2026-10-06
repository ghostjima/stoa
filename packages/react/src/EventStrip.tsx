import { useRef } from "react";
import { useLocale } from "react-aria-components";
import { useChartBox } from "./chartBox";
import { formatDate, textWidth } from "./chartScale";
import { useStoaFormat, type StoaMessages } from "./locale";

/** Kinds of event, each with its own marker shape and word: a coupon is a
 * tick, an amortisation a short bar, an offer a diamond and maturity a
 * tall bar. */
export type EventKind = "coupon" | "amortisation" | "offer" | "maturity";

export type StripEvent = {
  /** Stable key. */
  id: string;
  /** When it happens, in milliseconds since the epoch. */
  at: number;
  kind: EventKind;
  /** Replaces the kind's word in the list alternative ("Coupon 3 of 14"). */
  label?: string;
};

export type EventStripProps = {
  /** What the strip is ("Payments to maturity"): the start of its
   * accessible name, which goes on with a summary of the events. */
  label: string;
  events: StripEvent[];
  /** Start and end of the time axis; the first and last events by default. */
  from?: number;
  to?: number;
  /** Overrides how a date is written; the locale's day, short month and
   * year by default. */
  formatDate?: (at: number) => string;
  /** Which way time runs: "ltr" (the default) in every language, or
   * "locale" to run it right to left under a right-to-left locale. */
  timeDirection?: "ltr" | "locale";
  /** What the strip says while it has no events; the locale's "No events
   * to show." by default. */
  emptyText?: string;
};

const KINDS: EventKind[] = ["coupon", "amortisation", "offer", "maturity"];

/** Space above the axis for the tallest marker, and the inset of the
 * axis from the sides. */
const MARKS = 22;
const INSET = 8;

/** One marker, centred on `x`, standing on the axis at `base`. The caller
 * passes the class, so the token map credits the strip with its colours. */
function Mark({ kind, x, base, className }: { kind: EventKind; x: number; base: number; className: string }) {
  switch (kind) {
    case "coupon":
      return <line className={className} x1={x} x2={x} y1={base - 6} y2={base + 6} />;
    case "amortisation":
      return <rect className={className} x={x - 2.5} y={base - 14} width={5} height={14} rx={1} />;
    case "offer":
      return <path className={className} d={`M${x} ${base - 17} l6 7 l-6 7 l-6 -7 z`} />;
    case "maturity":
      return <rect className={className} x={x - 3} y={base - 18} width={6} height={18} rx={1} />;
  }
}

/** The strip's summary, in the locale's words: its range, then each kind
 * that occurs, by its date when it happens once and by its count when it
 * happens more often. */
function summarise(events: StripEvent[], words: StoaMessages, from: string, to: string, date: (at: number) => string, count: (n: number) => string) {
  const parts = KINDS.flatMap((kind) => {
    const ofKind = events.filter((e) => e.kind === kind);
    if (ofKind.length === 0) return [];
    return [ofKind.length === 1 ? words.eventOn(words[kind], date(ofKind[0]!.at)) : words.eventCount(words[kind], count(ofKind.length))];
  });
  return words.eventSummary(from, to, parts);
}

/** Events on a time axis, such as a bond's coupons, amortisations, offer
 * and maturity. Each kind has its own marker shape and a word in the
 * legend, so none is told by colour alone. The drawing is an image whose
 * accessible name is a summary of the events, and a list gives every
 * event with its date. Dates and digits follow the locale. */
export function EventStrip({ label, events, from, to, formatDate: dateFormat, timeDirection = "ltr", emptyText }: EventStripProps) {
  const locale = useStoaFormat();
  const { direction } = useLocale();
  const words = locale.messages;
  const box = useRef<HTMLDivElement>(null);
  const { width, fontSize } = useChartBox(box);
  const rtl = timeDirection === "locale" && direction === "rtl";
  const date = dateFormat ?? ((at: number) => formatDate(locale.locale, at));

  // Same-day events keep one order whatever order they came in: by kind.
  const sorted = [...events].sort((a, b) => a.at - b.at || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
  const empty = sorted.length === 0;
  const start = from ?? sorted[0]?.at ?? 0;
  const end = to ?? sorted[sorted.length - 1]?.at ?? 0;
  const height = MARKS + fontSize * 2 + INSET;
  const base = MARKS;
  const x = (at: number) => {
    const t = end === start ? 0.5 : Math.min(1, Math.max(0, (at - start) / (end - start)));
    return rtl ? width - INSET - t * (width - INSET * 2) : INSET + t * (width - INSET * 2);
  };
  const startText = date(start);
  const endText = date(end);
  const fits = textWidth(startText, fontSize) + textWidth(endText, fontSize) + INSET * 4 <= width;
  const name = empty ? `${label}. ${emptyText ?? words.noEvents}` : `${label}. ${summarise(sorted, words, startText, endText, date, locale.integer)}`;
  const present = KINDS.filter((kind) => sorted.some((e) => e.kind === kind));

  return (
    <div className="stoa-event-strip">
      <div ref={box} className="stoa-event-strip__plot">
        {empty ? (
          <p className="stoa-chart__empty" role="img" aria-label={name}>
            {emptyText ?? words.noEvents}
          </p>
        ) : (
          <svg className="stoa-chart__svg" role="img" aria-label={name} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line className="stoa-chart__axis" x1={INSET} x2={width - INSET} y1={base} y2={base} />
            {sorted.map((e) => (
              <Mark key={e.id} kind={e.kind} x={x(e.at)} base={base} className={`stoa-event-strip__mark stoa-event-strip__mark--${e.kind}`} />
            ))}
            <text className="stoa-chart__tick" x={x(start)} y={height - fontSize / 2} textAnchor={rtl ? "end" : "start"}>
              {startText}
            </text>
            {/* On a strip too narrow for both dates, only the start is
                drawn; the summary and the list still give the end. */}
            {fits && (
              <text className="stoa-chart__tick" x={x(end)} y={height - fontSize / 2} textAnchor={rtl ? "start" : "end"}>
                {endText}
              </text>
            )}
          </svg>
        )}
      </div>
      {!empty && (
        <ul className="stoa-chart__legend">
          {present.map((kind) => (
            <li key={kind} className="stoa-chart__legend-item">
              <svg className="stoa-event-strip__swatch" aria-hidden="true" width={14} height={20} viewBox="0 0 14 20">
                {/* A coupon tick crosses the axis; the others stand on it. */}
                <Mark kind={kind} x={7} base={kind === "coupon" ? 10 : 19} className={`stoa-event-strip__mark stoa-event-strip__mark--${kind}`} />
              </svg>
              {words[kind]}
            </li>
          ))}
        </ul>
      )}
      {!empty && (
        <ol className="stoa-visually-hidden" aria-label={label}>
          {sorted.map((e) => (
            <li key={e.id}>{words.eventItem(date(e.at), e.label ?? words[e.kind])}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
