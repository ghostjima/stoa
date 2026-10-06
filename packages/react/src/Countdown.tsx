import { useEffect, useRef, useState } from "react";
import { LiveRegion } from "./LiveRegion";
import { useStoaFormat, type DeadlineUnit, type PluralCategory, type StoaFormat } from "./locale";

export type { DeadlineUnit } from "./locale";

/** Where a deadline stands: time to spare, close ("warning": at or under
 * the caller's threshold, the deadline itself included), or passed. */
export type DeadlineState = "normal" | "warning" | "overdue";

/** The state of a deadline with `left` units of time to go (negative once
 * it has passed), warning at `warnAt` units or fewer. */
export function deadlineState(left: number, warnAt: number): DeadlineState {
  if (left < 0) return "overdue";
  return left <= warnAt ? "warning" : "normal";
}

/** The deadline in words, in the locale: "3 working days left", "Due
 * today", "2 working days overdue"; "Осталось 3 рабочих дня", "Срок
 * сегодня", "Просрочено на 2 рабочих дня". `left` is counted by the caller
 * in `unit`: working days by its own calendar, calendar days or hours. A
 * fraction is written with the decimals it has, up to one. */
export function deadlineText(format: StoaFormat, left: number, unit: DeadlineUnit): string {
  const { messages, locale } = format;
  if (left === 0) return messages.deadlineDue(unit);
  const size = Math.abs(left);
  const whole = Number.isInteger(size);
  const count = whole ? format.integer(size) : format.decimal(size, 1);
  const plural = new Intl.PluralRules(locale, whole ? {} : { minimumFractionDigits: 1 }).select(size) as PluralCategory;
  return left > 0 ? messages.deadlineLeft(count, unit, plural) : messages.deadlineOverdue(count, unit, plural);
}

/** A deadline's symbol, the same as a StatusBadge's for the tone it takes:
 * an exclamation mark when close, a cross once passed, none with time to
 * spare. */
const SYMBOL: Record<DeadlineState, string | null> = { normal: null, warning: "!", overdue: "✗" };

export type CountdownProps = {
  /** Time left, in `unit`: counted by the caller (working days by its own
   * production calendar, for example), negative once the deadline has
   * passed. */
  left: number;
  unit: DeadlineUnit;
  /** At this many units left or fewer, the deadline is close: a warning.
   * 0 by default: a warning on the day (or in the hour) it falls due. */
  warnAt?: number;
  /** Read out when the state changes (normal to warning, warning to
   * overdue), politely; on by default. Off for a cell among many, where a
   * change in every row would be read out. */
  announce?: boolean;
  /** The words for the deadline, when the locale's do not fit ("Offer
   * window closes in 3 days"); the state, the symbol and the announcement
   * still follow `left`. */
  children?: string;
};

/**
 * The time left before a deadline, in words, with its state shown by a
 * symbol and the words, and repeated in colour: nothing extra with time to
 * spare, an exclamation mark in the warning colour when close, a cross and
 * the falling colour once passed. The caller supplies the time left, in
 * working days, days or hours, and updates it as it likes (every minute,
 * for a live countdown); the text follows silently, and only a change of
 * state is read out, so a ticking countdown never floods a screen reader.
 */
export function Countdown({ left, unit, warnAt = 0, announce = true, children }: CountdownProps) {
  const format = useStoaFormat();
  const state = deadlineState(left, warnAt);
  const text = children ?? deadlineText(format, left, unit);
  const symbol = SYMBOL[state];
  // The text read out: set when the state changes, not on every tick.
  const [news, setNews] = useState("");
  const seen = useRef(state);
  useEffect(() => {
    if (seen.current === state) return;
    seen.current = state;
    setNews(text);
  }, [state, text]);
  return (
    <>
      <span className={`stoa-countdown stoa-countdown--${state}`} data-state={state}>
        {symbol && (
          <span className="stoa-countdown__symbol" aria-hidden="true">
            {symbol}
          </span>
        )}
        <span className="stoa-countdown__text">{text}</span>
      </span>
      {announce && <LiveRegion announceEvery={0}>{news}</LiveRegion>}
    </>
  );
}

/** A Countdown for a cell of a table or a list, where many deadlines sit
 * together: the same words, symbol and colour, and no announcements,
 * which a whole column would flood. */
export function DeadlineCell(props: Omit<CountdownProps, "announce">) {
  return <Countdown {...props} announce={false} />;
}
