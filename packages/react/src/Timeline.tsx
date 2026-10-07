import type { ReactNode } from "react";
import { TONE_SYMBOL } from "./Callout";
import { stoaFormatters } from "./format";
import { VisuallyHidden } from "./LiveRegion";
import { useStoaFormat } from "./locale";

export type TimelineEntry = {
  /** Stable key. */
  id: string;
  /** When it happened, or falls due: a Date, milliseconds since the
   * epoch, or an ISO 8601 string. The entries are sorted by it, oldest
   * first, and grouped by its day. */
  at: Date | number | string;
  /** The entry's own date or time, as the caller formats it ("14:05",
   * "4 Sep 2026"); left out for an entry that has only a day, which its
   * day's heading already says. Kept in its own direction. */
  when?: string;
  /** What kind of entry it is ("Received", "Reply due"). */
  kind: string;
  /** Who did it ("Operator Ivanova"), when someone did. */
  actor?: string;
  /** What happened. */
  text?: ReactNode;
  /** An entry to notice first, such as a deadline still to come: drawn
   * with a bar at its start edge, a symbol and the heavier weight, and
   * read with the locale's "Important:" before it. */
  emphasis?: boolean;
};

export type TimelineProps = {
  /** Names the list for assistive technology ("Case history"). */
  label: string;
  entries: TimelineEntry[];
  /** The time zone the days are counted in ("Europe/Moscow"); the
   * browser's own when left out. */
  timeZone?: string;
  /** Each day's heading; by default the day's long date in the locale and
   * `timeZone` ("4 September 2026"). Called with the first entry's time
   * on that day. */
  formatDay?: (day: Date) => string;
  /** The heading level of each day: 3 by default, under a panel's level 2
   * title. */
  dayLevel?: 2 | 3 | 4 | 5 | 6;
  /** What an empty timeline says; the locale's words by default. */
  emptyText?: ReactNode;
};

function timeOf(entry: TimelineEntry): Date {
  const date = entry.at instanceof Date ? entry.at : new Date(entry.at);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Timeline entry "${entry.id}" has no valid date: ${String(entry.at)}`);
  return date;
}

/** The entries grouped by their day in `timeZone`, the days oldest first
 * and the entries in each day oldest first. Entries at the same time keep
 * the caller's order. */
export function timelineDays(entries: TimelineEntry[], timeZone?: string): { day: string; first: Date; entries: TimelineEntry[] }[] {
  // "en-CA" writes a day as YYYY-MM-DD, which sorts as text.
  const dayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone });
  const sorted = entries
    .map((entry, index) => ({ entry, index, time: timeOf(entry) }))
    .sort((x, y) => x.time.getTime() - y.time.getTime() || x.index - y.index);
  const days: { day: string; first: Date; entries: TimelineEntry[] }[] = [];
  for (const { entry, time } of sorted) {
    const day = dayKey.format(time);
    const last = days[days.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else days.push({ day, first: time, entries: [entry] });
  }
  return days;
}

/**
 * What happened to a record, by date: an ordered list of days, oldest
 * first, each with its date as a heading and its own ordered list of
 * entries. A day's heading lets a screen reader jump from day to day; the
 * nested lists say how many days and how many entries in each. The
 * component sorts the entries by their machine date (`at`) and shows the
 * caller's own formatted text (`when`) beside each, in its own direction,
 * so a date stays in order in a right-to-left page. An emphasised entry
 * (a deadline still to come) is told by a bar, a symbol, its weight and a
 * word read before it, never by colour alone.
 */
export function Timeline({ label, entries, timeZone, formatDay, dayLevel = 3, emptyText }: TimelineProps) {
  const { messages, locale } = useStoaFormat();
  if (entries.length === 0) return <p className="stoa-timeline__empty">{emptyText ?? messages.timelineEmpty}</p>;
  const days = timelineDays(entries, timeZone);
  const dayText = formatDay ?? ((day: Date) => stoaFormatters(locale, { timeZone }).date(day, "long"));
  const Heading = `h${dayLevel}` as const;
  return (
    <ol className="stoa-timeline" aria-label={label}>
      {days.map((day) => (
        <li key={day.day} className="stoa-timeline__day">
          <Heading className="stoa-timeline__date">
            <time dateTime={day.day} dir="auto">
              {dayText(day.first)}
            </time>
          </Heading>
          <ol className="stoa-timeline__entries">
            {day.entries.map((entry) => (
              <li key={entry.id} className={`stoa-timeline__entry${entry.emphasis ? " stoa-timeline__entry--emphasis" : ""}`}>
                <span className="stoa-timeline__when">
                  {entry.when && (
                    <time dateTime={timeOf(entry).toISOString()} dir="auto">
                      {entry.when}
                    </time>
                  )}
                </span>
                <div className="stoa-timeline__what">
                  <p className="stoa-timeline__head">
                    {entry.emphasis && (
                      <>
                        <span className="stoa-timeline__symbol" aria-hidden="true">
                          {TONE_SYMBOL.info}
                        </span>
                        <VisuallyHidden>{`${messages.timelineEmphasis} `}</VisuallyHidden>
                      </>
                    )}
                    <span className="stoa-timeline__kind">{entry.kind}</span>
                    {entry.actor && (
                      <>
                        <span className="stoa-timeline__dot" aria-hidden="true">
                          {" · "}
                        </span>
                        <VisuallyHidden>, </VisuallyHidden>
                        <bdi className="stoa-timeline__actor">{entry.actor}</bdi>
                      </>
                    )}
                  </p>
                  {entry.text !== undefined && <div className="stoa-timeline__text">{entry.text}</div>}
                </div>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
