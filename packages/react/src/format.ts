// An application's own values in the interface's locale: money, percents,
// signed values, dates, times, durations and lists, through Intl.
//
// Two rules on top of Intl, the same in every locale:
// - a negative number is written with the minus sign (U+2212), not the
//   hyphen-minus Intl writes, so a column of signed values reads alike
//   and the sign is as wide as the plus;
// - a value never breaks across lines: the spaces inside a date, a time,
//   an amount or one part of a duration are non-breaking (U+00A0). Intl
//   already writes the group separator and the space before a currency
//   sign or a percent sign that way in Russian.
// Values in a right-to-left page still need their own direction: set them
// in `Ltr` or `bdi`, as Stoa's own components do.
import { useMemo } from "react";
import { useLocale } from "react-aria-components";

export type MoneyOptions = {
  /** ISO 4217 code; roubles by default. */
  currency?: string;
  /** Digits after the decimal separator: 2 by default, 0 for whole units. */
  fractionDigits?: number;
  /** A plus for an amount above zero, as for income beside costs. */
  signed?: boolean;
};

export type DateStyle = "short" | "long" | "numeric";

export type DurationUnit = "day" | "hour" | "minute" | "second";

export type DurationOptions = {
  /** "short" ("2 дн. 5 ч", "2 days, 5 hr") by default; "long" spells the
   * units out, "narrow" ("2d 5h") is the shortest. */
  style?: "short" | "long" | "narrow";
  /** The largest unit written; days by default. */
  largest?: DurationUnit;
  /** The smallest unit written, to which the duration is rounded; minutes
   * by default. */
  smallest?: DurationUnit;
};

export type StoaFormatters = {
  locale: string;
  /** A number with a sign: "+1,25", "−0,42", and "0,00" without one. */
  signed(value: number, fractionDigits?: number): string;
  /** An amount of money with its currency's sign: "1 234,50 ₽",
   * "₽1,234.50". */
  money(value: number, options?: MoneyOptions): string;
  /** A fraction as a percent: 0.0752 is "7,52 %", "7.52%". */
  percent(fraction: number, fractionDigits?: number): string;
  /** A fraction as a percent with a sign: "+0,25 %", "−0.42%". */
  signedPercent(fraction: number, fractionDigits?: number): string;
  /** A date: "short" ("4 сент. 2026 г.", "Sep 4, 2026") by default,
   * "long" with the month's full name, "numeric" ("04.09.2026",
   * "09/04/2026"). */
  date(value: Date | number, style?: DateStyle): string;
  /** A time of day on the locale's clock: "14:05", "2:05 PM"; with
   * `seconds`, "14:05:09". */
  time(value: Date | number, options?: { seconds?: boolean }): string;
  /** A short date and a time: "4 сент. 2026 г., 14:05". */
  dateTime(value: Date | number): string;
  /** A length of time in milliseconds, in days, hours, minutes or seconds
   * ("2 дн. 5 ч 30 мин", "2 days, 5 hr, 30 min"); its size only, so a
   * negative one is written as its positive. Units that come to zero are
   * left out, and a duration under the smallest unit is that unit's 0. */
  duration(milliseconds: number, options?: DurationOptions): string;
  /** Items joined as the language joins them: "А, Б и В", "A, B, and C";
   * "disjunction" with "или", "or". */
  list(items: string[], type?: "conjunction" | "disjunction"): string;
};

export type StoaFormattersOptions = {
  /** The time zone dates and times are written in ("Europe/Moscow",
   * "UTC"); the browser's by default. */
  timeZone?: string;
};

const MINUS = "−";
const NBSP = " ";

/** Intl's hyphen-minus written as the minus sign. Only a hyphen-minus
 * before a digit, or before a currency sign that comes before the digits,
 * is a sign; a date's or a word's hyphen stays. */
const withMinus = (text: string) => text.replace(/-(?=[\p{Sc}\s ‎‏؜]*[\p{Nd}])/u, MINUS);

/** Every space in `text` non-breaking. */
const unbroken = (text: string) => text.replace(/[  ]/g, NBSP);

const UNIT_MS: Record<DurationUnit, number> = { day: 86_400_000, hour: 3_600_000, minute: 60_000, second: 1000 };
const UNITS: DurationUnit[] = ["day", "hour", "minute", "second"];

const cache = new Map<string, StoaFormatters>();

/** The formatters for a locale ("ru-RU", "en-US"), built once per locale
 * and time zone. */
export function stoaFormatters(locale: string, { timeZone }: StoaFormattersOptions = {}): StoaFormatters {
  const key = `${locale}|${timeZone ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.ListFormat>();
  const once = <T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.ListFormat>(id: string, build: () => T): T => {
    let f = made.get(id) as T | undefined;
    if (!f) {
      f = build();
      made.set(id, f);
    }
    return f;
  };
  const fixed = (digits: number, extra: Intl.NumberFormatOptions = {}) => ({ minimumFractionDigits: digits, maximumFractionDigits: digits, ...extra });
  const dates: Record<DateStyle, Intl.DateTimeFormatOptions> = {
    short: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
  };
  const formatters: StoaFormatters = {
    locale,
    signed: (value, digits = 2) =>
      withMinus(once(`signed-${digits}`, () => new Intl.NumberFormat(locale, fixed(digits, { signDisplay: "exceptZero" }))).format(value)),
    money: (value, { currency = "RUB", fractionDigits = 2, signed = false } = {}) =>
      unbroken(
        withMinus(
          once(
            `money-${currency}-${fractionDigits}-${signed}`,
            () =>
              new Intl.NumberFormat(locale, {
                style: "currency",
                currency,
                currencyDisplay: "narrowSymbol",
                ...fixed(fractionDigits),
                signDisplay: signed ? "exceptZero" : "auto",
              }),
          ).format(value),
        ),
      ),
    percent: (fraction, digits = 2) =>
      unbroken(withMinus(once(`percent-${digits}`, () => new Intl.NumberFormat(locale, fixed(digits, { style: "percent" }))).format(fraction))),
    signedPercent: (fraction, digits = 2) =>
      unbroken(
        withMinus(
          once(`signed-percent-${digits}`, () => new Intl.NumberFormat(locale, fixed(digits, { style: "percent", signDisplay: "exceptZero" }))).format(fraction),
        ),
      ),
    date: (value, style = "short") => unbroken(once(`date-${style}`, () => new Intl.DateTimeFormat(locale, { ...dates[style], timeZone })).format(value)),
    time: (value, { seconds = false } = {}) =>
      unbroken(
        once(
          `time-${seconds}`,
          () => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", second: seconds ? "2-digit" : undefined, timeZone }),
        ).format(value),
      ),
    dateTime: (value) =>
      unbroken(once("date-time", () => new Intl.DateTimeFormat(locale, { ...dates.short, hour: "numeric", minute: "2-digit", timeZone })).format(value)),
    duration: (milliseconds, { style = "short", largest = "day", smallest = "minute" } = {}) => {
      const units = UNITS.slice(UNITS.indexOf(largest), UNITS.indexOf(smallest) + 1);
      const last = units[units.length - 1] ?? "minute";
      let rest = Math.round(Math.abs(milliseconds) / UNIT_MS[last]) * UNIT_MS[last];
      const part = (unit: DurationUnit, amount: number) =>
        unbroken(once(`unit-${unit}-${style}`, () => new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: style })).format(amount));
      const parts: string[] = [];
      for (const unit of units) {
        const amount = Math.floor(rest / UNIT_MS[unit]);
        rest -= amount * UNIT_MS[unit];
        if (amount > 0) parts.push(part(unit, amount));
      }
      if (parts.length === 0) return part(last, 0);
      return once(`duration-list-${style}`, () => new Intl.ListFormat(locale, { type: "unit", style })).format(parts);
    },
    list: (items, type = "conjunction") => once(`list-${type}`, () => new Intl.ListFormat(locale, { type, style: "long" })).format(items),
  };
  cache.set(key, formatters);
  return formatters;
}

/** The formatters for the locale React Aria is set to (`I18nProvider`),
 * the one Stoa's own words and digits follow. */
export function useFormatters(options: StoaFormattersOptions = {}): StoaFormatters {
  const { locale } = useLocale();
  const { timeZone } = options;
  return useMemo(() => stoaFormatters(locale, { timeZone }), [locale, timeZone]);
}
