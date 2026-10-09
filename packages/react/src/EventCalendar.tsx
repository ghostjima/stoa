import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocale } from "react-aria-components";
import { Button } from "./Controls";
import { VisuallyHidden } from "./LiveRegion";
import { useBreakpoint } from "./media";
import { useStoaFormat, type CalendarEventKind, type CalendarEventMark } from "./locale";

export type { CalendarEventKind, CalendarEventMark } from "./locale";

/** The kinds, in the order the key lists them. */
export const CALENDAR_EVENT_KINDS: readonly CalendarEventKind[] = ["coupon", "amortisation", "deadline", "offer", "maturity", "rating", "default"];

/** Each kind's symbol: its shape tells it apart, its colour repeats it. */
export const CALENDAR_EVENT_SYMBOL: Record<CalendarEventKind, string> = {
  coupon: "●",
  amortisation: "◐",
  deadline: "⚑",
  offer: "◆",
  maturity: "■",
  rating: "↕",
  default: "✗",
};

export type CalendarEvent = {
  /** Stable key. */
  id: string;
  /** The day it falls on, as an ISO date ("2026-10-07"). */
  date: string;
  kind: CalendarEventKind;
  /** What happens, in a few words ("Coupon 3 of 12, 32.41 RUB"), shown
   * after the kind's word in the day's list. */
  title: string;
  /** More about it, under the title in the day's list (a deadline to act
   * by, a link to the offer form). */
  detail?: ReactNode;
  /** Marks an entry that is not a known event: "synthetic" (made up for a
   * scenario) or "projected" (worked out ahead, such as a floating
   * coupon at today's index). Said in words beside the kind's word in
   * the day's list, and after the kind in the day's cell as read. */
  mark?: CalendarEventMark;
};

export type EventCalendarProps = {
  /** What the calendar holds ("Events of OFZ 26238"), shown above it and
   * the start of the grid's name, which goes on with the month. */
  label: string;
  /** Keep the label for assistive technology only, where a visible
   * heading names the calendar. */
  hideLabel?: boolean;
  events: CalendarEvent[];
  /** The month shown, as "2026-10". With `onMonthChange` the caller holds
   * it; otherwise `defaultMonth`, else the selected day's month, else
   * today's. */
  month?: string;
  defaultMonth?: string;
  onMonthChange?: (month: string) => void;
  /** The day whose events are listed, as an ISO date, or null for none.
   * With `onSelectedDateChange` the caller holds it. */
  selectedDate?: string | null;
  defaultSelectedDate?: string | null;
  onSelectedDateChange?: (date: string) => void;
  /** "grid", a month of seven columns with the chosen day's events under
   * it; "list", the month's days with events one under the other; "auto"
   * (the default) the list on a narrow screen and the grid otherwise. */
  view?: "auto" | "grid" | "list";
  /** The first day of the week, 0 for Sunday to 6 for Saturday; the
   * locale's by default (Monday in Russian, Sunday in American English,
   * Saturday in Arabic without a region). */
  firstDayOfWeek?: number;
  /** Today, as an ISO date, marked in the grid; the device's date by
   * default. */
  today?: string;
  /** The level of the month's heading, 3 by default; the days' headings
   * are a level below it. */
  headingLevel?: 2 | 3 | 4 | 5;
};

type Ymd = { y: number; m: number; d: number };

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const parse = (iso: string): Ymd => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
};
const toIso = (y: number, m: number, d: number) => {
  const at = new Date(Date.UTC(y, m - 1, d));
  return `${pad(at.getUTCFullYear(), 4)}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
};
const utc = (iso: string) => {
  const { y, m, d } = parse(iso);
  return Date.UTC(y, m - 1, d);
};
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const addDays = (iso: string, n: number) => {
  const { y, m, d } = parse(iso);
  return toIso(y, m, d + n);
};
/** The same day of a month `n` months away, or that month's last day. */
const addMonths = (iso: string, n: number) => {
  const { y, m, d } = parse(iso);
  const first = parse(toIso(y, m + n, 1));
  return toIso(first.y, first.m, Math.min(d, daysIn(first.y, first.m)));
};
const monthOf = (iso: string) => iso.slice(0, 7);
const weekday = (iso: string) => new Date(utc(iso)).getUTCDay();
const localToday = () => {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

/** The first day of the week in a locale, 0 for Sunday to 6 for Saturday,
 * from Intl's week data where the engine has it, else from the region
 * (or the language's usual region): Sunday in the Americas and East Asia,
 * Saturday in much of the Arab world, Monday elsewhere. */
export function weekStartOf(locale: string): number {
  try {
    const tag = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = typeof tag.getWeekInfo === "function" ? tag.getWeekInfo() : tag.weekInfo;
    if (info && Number.isInteger(info.firstDay)) return info.firstDay % 7;
    const region = tag.maximize().region ?? "";
    if (["US", "CA", "MX", "BR", "JP", "KR", "TW", "HK", "IL", "PH", "SA", "IN"].includes(region)) return 0;
    if (["EG", "AE", "DZ", "BH", "IQ", "JO", "KW", "LY", "OM", "QA", "SD", "SY"].includes(region)) return 6;
  } catch {
    // An unknown tag: Monday.
  }
  return 1;
}

/** A value the caller may hold, or leave to the component. */
function useHeld<T>(held: T | undefined, initial: T, onChange: ((value: T) => void) | undefined): [T, (value: T) => void] {
  const [own, setOwn] = useState(initial);
  const value = held !== undefined ? held : own;
  return [
    value,
    (next: T) => {
      if (held === undefined) setOwn(next);
      onChange?.(next);
    },
  ];
}

function KindSymbol({ kind }: { kind: CalendarEventKind }) {
  return (
    <span className={`stoa-calendar__symbol stoa-calendar__symbol--${kind}`} aria-hidden="true">
      {CALENDAR_EVENT_SYMBOL[kind]}
    </span>
  );
}

/** The kinds a day holds, each once, in the key's order. */
const kindsOf = (events: CalendarEvent[]) => CALENDAR_EVENT_KINDS.filter((kind) => events.some((e) => e.kind === kind));

/** The kinds a day holds as read in its cell, in the key's order: each
 * kind once for its unmarked events and once for each mark its events
 * carry ("Coupon (projected)"). */
const kindsAsRead = (events: CalendarEvent[]) =>
  kindsOf(events).flatMap((kind) => {
    const marks = events.filter((e) => e.kind === kind).map((e) => e.mark ?? null);
    return [null, "synthetic" as const, "projected" as const].filter((mark) => marks.includes(mark)).map((mark) => ({ kind, mark }));
  });

/**
 * Dated events on a calendar: a bond's coupons, offers, amortisations,
 * maturity, rating changes and a default, and the deadlines to act by
 * before them (a kind of their own, on their own day). Each kind is a
 * symbol and a word, never a colour alone: the symbols in the days, a key
 * under the grid that names them, and the word beside each event in a
 * day's list. An entry marked synthetic or projected says so in words
 * beside its kind's word, and its day is read with the mark.
 *
 * The month is an ARIA grid with one tab stop (the selected day, else
 * today, else the month's first day with events, else its first day).
 * The arrow keys move a day or a week, mirrored right to left; Home and
 * End go to the start and end of the week, Page Up and Page Down a month,
 * with Shift a year; Enter, Space or a press chooses the day, whose events
 * are listed under the grid. Each day is read with its full date, "today"
 * when it is, and the kinds of its events with their marks. The month's
 * name and the week follow the locale, and Previous and Next change the
 * month, which is announced. On a narrow screen the month is a list of its days with
 * events instead. A month without events says so.
 */
export function EventCalendar({
  label,
  hideLabel = false,
  events,
  month: heldMonth,
  defaultMonth,
  onMonthChange,
  selectedDate: heldSelected,
  defaultSelectedDate = null,
  onSelectedDateChange,
  view = "auto",
  firstDayOfWeek,
  today: todayProp,
  headingLevel = 3,
}: EventCalendarProps) {
  const { locale, messages, integer } = useStoaFormat();
  const { direction } = useLocale();
  const breakpoint = useBreakpoint();
  const labelId = useId();
  const monthId = useId();
  const today = todayProp ?? localToday();
  const [selected, setSelected] = useHeld<string | null>(heldSelected, defaultSelectedDate, (date) => {
    if (date !== null) onSelectedDateChange?.(date);
  });
  const [month, setMonth] = useHeld<string>(heldMonth, defaultMonth ?? monthOf(selected ?? today), onMonthChange);
  const [focused, setFocused] = useState<string | null>(null);
  const grid = useRef<HTMLTableElement>(null);
  const focusAfterRender = useRef(false);
  const start = firstDayOfWeek ?? weekStartOf(locale);
  const asList = view === "list" || (view === "auto" && breakpoint === "narrow");

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const day = map.get(event.date);
      if (day) day.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);
  const keyKinds = useMemo(() => kindsOf(events), [events]);

  const formats = useMemo(() => {
    const options = { timeZone: "UTC" } as const;
    return {
      month: new Intl.DateTimeFormat(locale, { ...options, month: "long", year: "numeric" }),
      long: new Intl.DateTimeFormat(locale, { ...options, weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      weekdayShort: new Intl.DateTimeFormat(locale, { ...options, weekday: "short" }),
      weekdayLong: new Intl.DateTimeFormat(locale, { ...options, weekday: "long" }),
    };
  }, [locale]);
  const capital = (text: string) => text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
  const { y, m } = parse(`${month}-01`);
  const monthName = capital(formats.month.format(utc(`${month}-01`)));
  const longDate = (iso: string) => formats.long.format(utc(iso));
  const kindWords = (kinds: { kind: CalendarEventKind; mark: CalendarEventMark | null }[]) =>
    kinds.map(({ kind, mark }) => (mark ? `${messages.calendarKind[kind]} ${messages.calendarMark[mark]}` : messages.calendarKind[kind]));

  const monthDays = Array.from({ length: daysIn(y, m) }, (_, i) => toIso(y, m, i + 1));
  const eventDays = monthDays.filter((day) => byDate.has(day));
  const tabStop =
    focused && monthOf(focused) === month
      ? focused
      : selected && monthOf(selected) === month
        ? selected
        : monthOf(today) === month
          ? today
          : (eventDays[0] ?? monthDays[0]!);

  useEffect(() => {
    if (!focusAfterRender.current) return;
    focusAfterRender.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-date="${tabStop}"]`)?.focus();
  });

  const goToMonth = (next: string) => {
    setFocused(null);
    setMonth(next);
  };
  const moveTo = (day: string) => {
    if (monthOf(day) !== month) setMonth(monthOf(day));
    setFocused(day);
    focusAfterRender.current = true;
  };
  const choose = (day: string) => {
    setFocused(day);
    setSelected(day);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const from = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!from || e.altKey || e.ctrlKey || e.metaKey) return;
    const forward = direction === "rtl" ? -1 : 1;
    const column = (weekday(from) - start + 7) % 7;
    let to: string | null = null;
    switch (e.key) {
      case "ArrowRight":
        to = addDays(from, forward);
        break;
      case "ArrowLeft":
        to = addDays(from, -forward);
        break;
      case "ArrowDown":
        to = addDays(from, 7);
        break;
      case "ArrowUp":
        to = addDays(from, -7);
        break;
      case "Home":
        to = addDays(from, -column);
        break;
      case "End":
        to = addDays(from, 6 - column);
        break;
      case "PageUp":
        to = addMonths(from, e.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        to = addMonths(from, e.shiftKey ? 12 : 1);
        break;
      case "Enter":
      case " ":
        choose(from);
        e.preventDefault();
        return;
      default:
        return;
    }
    e.preventDefault();
    moveTo(to);
  };

  const Heading = `h${headingLevel}` as const;
  const DayHeading = `h${Math.min(6, headingLevel + 1)}` as "h3" | "h4" | "h5" | "h6";

  const eventList = (dayEvents: CalendarEvent[]) => (
    <ul className="stoa-calendar__events">
      {dayEvents.map((event) => (
        <li key={event.id} className="stoa-calendar__event">
          <KindSymbol kind={event.kind} />
          <div className="stoa-calendar__event-body">
            <p className="stoa-calendar__event-head">
              <span className="stoa-calendar__kind">{messages.calendarKind[event.kind]}</span>
              {event.mark && (
                <>
                  {" "}
                  <span className={`stoa-calendar__mark stoa-calendar__mark--${event.mark}`}>{messages.calendarMark[event.mark]}</span>
                </>
              )}
              <span aria-hidden="true">{" · "}</span>
              <VisuallyHidden>: </VisuallyHidden>
              <span className="stoa-calendar__title">{event.title}</span>
            </p>
            {event.detail !== undefined && event.detail !== null && <div className="stoa-calendar__detail">{event.detail}</div>}
          </div>
        </li>
      ))}
    </ul>
  );

  const previous = addMonths(`${month}-01`, -1);
  const next = addMonths(`${month}-01`, 1);
  const head = (
    <div className="stoa-calendar__head">
      <Button
        variant="ghost"
        size="small"
        className="stoa-calendar__nav"
        aria-label={`${messages.calendarPrevious}: ${capital(formats.month.format(utc(previous)))}`}
        onPress={() => goToMonth(monthOf(previous))}
      >
        <span aria-hidden="true">{direction === "rtl" ? "›" : "‹"}</span>
      </Button>
      <Heading id={monthId} className="stoa-calendar__month" aria-live="polite">
        {monthName}
      </Heading>
      <Button
        variant="ghost"
        size="small"
        className="stoa-calendar__nav"
        aria-label={`${messages.calendarNext}: ${capital(formats.month.format(utc(next)))}`}
        onPress={() => goToMonth(monthOf(next))}
      >
        <span aria-hidden="true">{direction === "rtl" ? "‹" : "›"}</span>
      </Button>
    </div>
  );

  const empty = eventDays.length === 0 && <p className="stoa-calendar__empty">{messages.calendarMonthEmpty(monthName)}</p>;

  const key = keyKinds.length > 0 && (
    <div className="stoa-calendar__key">
      <span className="stoa-calendar__key-label">{messages.calendarKey}</span>
      <ul className="stoa-calendar__key-list">
        {keyKinds.map((kind) => (
          <li key={kind} className="stoa-calendar__key-item">
            <KindSymbol kind={kind} />
            {messages.calendarKind[kind]}
          </li>
        ))}
      </ul>
    </div>
  );

  if (asList) {
    return (
      <section className="stoa-calendar stoa-calendar--list" aria-labelledby={`${labelId} ${monthId}`}>
        <div id={labelId} className={hideLabel ? "stoa-visually-hidden" : "stoa-calendar__label"}>
          {label}
        </div>
        {head}
        {empty || (
          <ol className="stoa-calendar__days">
            {eventDays.map((day) => (
              <li key={day} className="stoa-calendar__day-group" data-today={day === today || undefined}>
                <DayHeading className="stoa-calendar__date">
                  <time dateTime={day}>
                    {capital(longDate(day))}
                    {day === today && <span className="stoa-calendar__today-word">{` · ${messages.calendarToday}`}</span>}
                  </time>
                </DayHeading>
                {eventList(byDate.get(day) ?? [])}
              </li>
            ))}
          </ol>
        )}
        {key}
      </section>
    );
  }

  // The weeks of the month: blank cells before the first day and after
  // the last, so each row is a whole week from the locale's first day.
  const lead = (weekday(monthDays[0]!) - start + 7) % 7;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...monthDays];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  // A week that starts on the locale's first day: any one will do.
  const sample = addDays("2026-01-04", start);
  const columns = Array.from({ length: 7 }, (_, i) => utc(addDays(sample, i)));
  const chosen = selected ? byDate.get(selected) ?? [] : [];

  return (
    <section className="stoa-calendar stoa-calendar--grid" aria-labelledby={`${labelId} ${monthId}`}>
      <div id={labelId} className={hideLabel ? "stoa-visually-hidden" : "stoa-calendar__label"}>
        {label}
      </div>
      {head}
      <table ref={grid} role="grid" className="stoa-calendar__grid" aria-labelledby={`${labelId} ${monthId}`} onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {columns.map((at) => (
              <th key={at} scope="col" abbr={formats.weekdayLong.format(at)} className="stoa-calendar__weekday">
                {formats.weekdayShort.format(at)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((day, i) => {
                if (day === null) return <td key={`blank-${i}`} role="gridcell" className="stoa-calendar__cell stoa-calendar__cell--blank" />;
                const dayEvents = byDate.get(day) ?? [];
                const kinds = kindsOf(dayEvents);
                const isToday = day === today;
                const isSelected = day === selected;
                return (
                  <td
                    key={day}
                    role="gridcell"
                    data-date={day}
                    tabIndex={day === tabStop ? 0 : -1}
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    className={`stoa-calendar__cell${kinds.length > 0 ? " stoa-calendar__cell--events" : ""}`}
                    data-today={isToday || undefined}
                    onClick={() => choose(day)}
                    onFocus={() => {
                      if (focused !== day) setFocused(day);
                    }}
                  >
                    <span className="stoa-calendar__number" aria-hidden="true">
                      {integer(parse(day).d)}
                    </span>
                    {kinds.length > 0 && (
                      <span className="stoa-calendar__marks" aria-hidden="true">
                        {kinds.map((kind) => (
                          <KindSymbol key={kind} kind={kind} />
                        ))}
                      </span>
                    )}
                    <VisuallyHidden>{messages.calendarCell(longDate(day), isToday, kindWords(kindsAsRead(dayEvents)))}</VisuallyHidden>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {key}
      {empty}
      <div className="stoa-calendar__chosen">
        {selected ? (
          <>
            <DayHeading className="stoa-calendar__date">
              <time dateTime={selected}>{capital(longDate(selected))}</time>
            </DayHeading>
            {chosen.length > 0 ? eventList(chosen) : <p className="stoa-calendar__none">{messages.calendarDayEmpty}</p>}
          </>
        ) : (
          eventDays.length > 0 && <p className="stoa-calendar__none">{messages.calendarChoose}</p>
        )}
      </div>
    </section>
  );
}
