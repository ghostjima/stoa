// @vitest-environment jsdom
// The formatters' exact output in Russian and English, spaces and signs
// included: NBSP is U+00A0, MINUS is U+2212. Intl's data comes from the
// ICU that Node carries; the expected strings are Node 22's.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { I18nProvider, stoaFormatters, useFormatters } from "./index";

const NBSP = " ";
const MINUS = "−";
const ru = stoaFormatters("ru-RU", { timeZone: "UTC" });
const en = stoaFormatters("en-US", { timeZone: "UTC" });
/** 4 September 2026, 14:05:09 UTC. */
const AT = Date.UTC(2026, 8, 4, 14, 5, 9);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("money", () => {
  it("writes roubles with the sign after the amount in Russian and before it in English, grouped", () => {
    expect(ru.money(1234567.5)).toBe(`1${NBSP}234${NBSP}567,50${NBSP}₽`);
    expect(en.money(1234567.5)).toBe("₽1,234,567.50");
  });

  it("writes a negative amount with the minus sign, and a signed one with a plus", () => {
    expect(ru.money(-12.5)).toBe(`${MINUS}12,50${NBSP}₽`);
    expect(en.money(-12.5)).toBe(`${MINUS}₽12.50`);
    expect(ru.money(12.5, { signed: true })).toBe(`+12,50${NBSP}₽`);
    expect(en.money(0, { signed: true })).toBe("₽0.00");
  });

  it("takes another currency and whole units", () => {
    expect(ru.money(1500, { currency: "USD", fractionDigits: 0 })).toBe(`1${NBSP}500${NBSP}$`);
    expect(en.money(1500, { currency: "USD", fractionDigits: 0 })).toBe("$1,500");
  });
});

describe("percent and signed values", () => {
  it("writes a fraction as a percent, with a non-breaking space before the sign in Russian", () => {
    expect(ru.percent(0.0752)).toBe(`7,52${NBSP}%`);
    expect(en.percent(0.0752)).toBe("7.52%");
    expect(ru.percent(0.153, 1)).toBe(`15,3${NBSP}%`);
  });

  it("writes signs with the minus sign and the plus, and zero without a sign", () => {
    expect(ru.signedPercent(-0.0042)).toBe(`${MINUS}0,42${NBSP}%`);
    expect(en.signedPercent(0.0025)).toBe("+0.25%");
    expect(ru.signed(1.25)).toBe("+1,25");
    expect(en.signed(-0.42)).toBe(`${MINUS}0.42`);
    expect(en.signed(0)).toBe("0.00");
    expect(ru.signed(-1234.5, 1)).toBe(`${MINUS}1${NBSP}234,5`);
  });
});

describe("dates and times", () => {
  it("writes a date in three styles, unbroken", () => {
    expect(ru.date(AT)).toBe(`4${NBSP}сент.${NBSP}2026${NBSP}г.`);
    expect(en.date(AT)).toBe(`Sep${NBSP}4,${NBSP}2026`);
    expect(ru.date(AT, "long")).toBe(`4${NBSP}сентября${NBSP}2026${NBSP}г.`);
    expect(en.date(AT, "long")).toBe(`September${NBSP}4,${NBSP}2026`);
    expect(ru.date(AT, "numeric")).toBe("04.09.2026");
    expect(en.date(AT, "numeric")).toBe("09/04/2026");
    expect(ru.date(new Date(AT))).toBe(ru.date(AT));
  });

  it("writes a time on the locale's clock, with seconds when asked", () => {
    expect(ru.time(AT)).toBe("14:05");
    expect(en.time(AT)).toBe(`2:05${NBSP}PM`);
    expect(ru.time(AT, { seconds: true })).toBe("14:05:09");
    expect(ru.dateTime(AT)).toBe(`4${NBSP}сент.${NBSP}2026${NBSP}г.,${NBSP}14:05`);
    expect(en.dateTime(AT)).toBe(`Sep${NBSP}4,${NBSP}2026,${NBSP}2:05${NBSP}PM`);
  });

  it("writes them in the time zone it was given", () => {
    expect(stoaFormatters("ru-RU", { timeZone: "Europe/Moscow" }).time(AT)).toBe("17:05");
  });
});

describe("durations", () => {
  const span = 2 * DAY + 5 * HOUR + 30 * MINUTE;

  it("writes days, hours and minutes, each number bound to its unit", () => {
    expect(ru.duration(span)).toBe(`2${NBSP}дн. 5${NBSP}ч 30${NBSP}мин`);
    expect(en.duration(span)).toBe(`2${NBSP}days, 5${NBSP}hr, 30${NBSP}min`);
    expect(ru.duration(span, { style: "long" })).toBe(`2${NBSP}дня 5${NBSP}часов 30${NBSP}минут`);
    expect(en.duration(span, { style: "narrow" })).toBe("2d 5h 30m");
  });

  it("rounds to the smallest unit, leaves out units that come to zero, and folds days into hours when asked", () => {
    expect(ru.duration(3 * HOUR + 29_000)).toBe(`3${NBSP}ч`);
    expect(en.duration(span, { smallest: "hour" })).toBe(`2${NBSP}days, 6${NBSP}hr`);
    expect(en.duration(span, { largest: "hour", smallest: "hour" })).toBe(`54${NBSP}hr`);
    expect(ru.duration(90_000, { smallest: "second" })).toBe(`1${NBSP}мин 30${NBSP}с`);
  });

  it("writes its size only, and zero in the smallest unit", () => {
    expect(en.duration(-span)).toBe(en.duration(span));
    expect(ru.duration(20_000)).toBe(`0${NBSP}мин`);
    expect(en.duration(0, { smallest: "day" })).toBe(`0${NBSP}days`);
  });
});

describe("lists", () => {
  it("joins items as each language does", () => {
    expect(ru.list(["купон", "оферта", "погашение"])).toBe("купон, оферта и погашение");
    expect(en.list(["coupon", "offer", "maturity"])).toBe("coupon, offer, and maturity");
    expect(ru.list(["ОФЗ", "корпоративные"], "disjunction")).toBe("ОФЗ или корпоративные");
    expect(en.list(["one"])).toBe("one");
  });
});

describe("useFormatters", () => {
  it("follows the locale of the I18nProvider above it", () => {
    let seen = "";
    function Probe() {
      seen = useFormatters({ timeZone: "UTC" }).money(1000);
      return null;
    }
    render(
      <I18nProvider locale="ru-RU">
        <Probe />
      </I18nProvider>,
    );
    expect(seen).toBe(`1${NBSP}000,00${NBSP}₽`);
  });

  it("builds one set of formatters per locale and time zone", () => {
    expect(stoaFormatters("ru-RU", { timeZone: "UTC" })).toBe(ru);
    expect(stoaFormatters("ru-RU")).not.toBe(ru);
  });
});
