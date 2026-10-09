// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EventCalendar, I18nProvider, weekStartOf, type CalendarEvent } from "./index";

afterEach(cleanup);

const EVENTS: CalendarEvent[] = [
  { id: "c", date: "2026-10-07", kind: "coupon", title: "Coupon 5 of 12" },
  { id: "o", date: "2026-10-15", kind: "offer", title: "Put offer at 100%", detail: "Request by 9 October." },
  { id: "a", date: "2026-10-15", kind: "amortisation", title: "20% of face paid back" },
  { id: "d", date: "2026-11-19", kind: "default", title: "Default" },
];

const cell = (date: string) => document.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
const tabStops = () => [...document.querySelectorAll<HTMLElement>('[role="gridcell"][tabindex="0"]')].map((el) => el.dataset.date);
const press = (key: string, init: Partial<KeyboardEventInit> = {}) => {
  const target = document.activeElement as HTMLElement;
  fireEvent.keyDown(target, { key, ...init });
};

describe("weekStartOf", () => {
  it("follows the locale: Sunday in American English, Monday in Russian and British English, Saturday in Arabic", () => {
    expect(weekStartOf("en-US")).toBe(0);
    expect(weekStartOf("ru-RU")).toBe(1);
    expect(weekStartOf("en-GB")).toBe(1);
    expect(weekStartOf("ar-u-nu-arab")).toBe(6);
  });
});

describe("EventCalendar: the grid", () => {
  it("is a grid named by its label and month, with the week from the locale's first day", () => {
    render(<EventCalendar label="Bond events" events={EVENTS} today="2026-10-07" view="grid" />);
    const grid = screen.getByRole("grid", { name: "Bond events October 2026" });
    const heads = within(grid).getAllByRole("columnheader");
    expect(heads.map((h) => h.textContent)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(heads[0]!.getAttribute("abbr")).toBe("Sunday");
    // 1 October 2026 is a Thursday: four blank cells before it.
    const first = within(grid).getAllByRole("row")[1]!;
    expect(within(first).getAllByRole("gridcell").map((c) => c.dataset.date ?? "")).toEqual(["", "", "", "", "2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  it("starts the week on Monday in Russian, with the month's name capitalised", () => {
    render(
      <I18nProvider locale="ru-RU">
        <EventCalendar label="События" events={EVENTS} today="2026-10-07" view="grid" />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["пн", "вт", "ср", "чт", "пт", "сб", "вс"]);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Октябрь 2026 г.");
  });

  it("starts the week on Saturday in Arabic, with Arabic-Indic day numbers", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <EventCalendar label="الأحداث" events={EVENTS} today="2026-10-07" view="grid" />
      </I18nProvider>,
    );
    const heads = screen.getAllByRole("columnheader");
    expect(heads[0]!.getAttribute("abbr")).toBe("السبت");
    expect(cell("2026-10-07").querySelector(".stoa-calendar__number")!.textContent).toBe("٧");
  });

  it("reads each day with its full date, today, and its events' kinds as words; draws a symbol per kind", () => {
    render(<EventCalendar label="Bond events" events={EVENTS} today="2026-10-07" view="grid" />);
    expect(cell("2026-10-07").textContent).toContain("Today, Wednesday, October 7, 2026: Coupon");
    expect(cell("2026-10-07").getAttribute("aria-current")).toBe("date");
    expect(cell("2026-10-15").textContent).toContain("Thursday, October 15, 2026: Amortisation, Offer");
    expect(cell("2026-10-16").textContent).toContain("Friday, October 16, 2026");
    const marks = cell("2026-10-15").querySelector(".stoa-calendar__marks")!;
    expect(marks.getAttribute("aria-hidden")).toBe("true");
    expect(marks.textContent).toBe("◐◆");
    // The key names every kind the events hold.
    expect([...document.querySelectorAll(".stoa-calendar__key-item")].map((i) => i.textContent)).toEqual(["●Coupon", "◐Amortisation", "◆Offer", "✗Default"]);
  });

  it("has one tab stop: the selected day, else today, else the first day with events, else the first day", () => {
    render(<EventCalendar label="E" events={EVENTS} today="2026-10-07" defaultSelectedDate="2026-10-15" view="grid" />);
    expect(tabStops()).toEqual(["2026-10-15"]);
    cleanup();
    render(<EventCalendar label="E" events={EVENTS} today="2026-10-07" view="grid" />);
    expect(tabStops()).toEqual(["2026-10-07"]);
    cleanup();
    render(<EventCalendar label="E" events={EVENTS} today="2026-09-01" defaultMonth="2026-11" view="grid" />);
    expect(tabStops()).toEqual(["2026-11-19"]);
    cleanup();
    render(<EventCalendar label="E" events={EVENTS} today="2026-09-01" defaultMonth="2026-12" view="grid" />);
    expect(tabStops()).toEqual(["2026-12-01"]);
  });

  it("moves a day, a week, to the ends of the week, a month and a year with the keys, into the next month as needed", () => {
    render(<EventCalendar label="E" events={EVENTS} today="2026-10-07" view="grid" />);
    act(() => cell("2026-10-07").focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(cell("2026-10-08"));
    press("ArrowDown");
    expect(document.activeElement).toBe(cell("2026-10-15"));
    press("Home");
    expect(document.activeElement).toBe(cell("2026-10-11"));
    press("End");
    expect(document.activeElement).toBe(cell("2026-10-17"));
    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");
    expect(document.activeElement).toBe(cell("2026-09-26"));
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("September 2026");
    press("PageDown");
    expect(document.activeElement).toBe(cell("2026-10-26"));
    press("PageDown", { shiftKey: true });
    expect(document.activeElement).toBe(cell("2027-10-26"));
    press("PageUp", { shiftKey: true });
    press("PageUp");
    expect(document.activeElement).toBe(cell("2026-09-26"));
    expect(tabStops()).toEqual(["2026-09-26"]);
  });

  it("keeps the day of the month on Page Down where it can, else the month's last day", () => {
    render(<EventCalendar label="E" events={EVENTS} today="2026-01-31" view="grid" />);
    act(() => cell("2026-01-31").focus());
    press("PageDown");
    expect(document.activeElement).toBe(cell("2026-02-28"));
  });

  it("mirrors the left and right arrows right to left", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <EventCalendar label="E" events={EVENTS} today="2026-10-07" view="grid" />
      </I18nProvider>,
    );
    act(() => cell("2026-10-07").focus());
    press("ArrowLeft");
    expect(document.activeElement).toBe(cell("2026-10-08"));
    press("ArrowRight");
    press("ArrowRight");
    expect(document.activeElement).toBe(cell("2026-10-06"));
  });

  it("chooses a day with Enter, Space or a press, and lists its events under the grid with their words", () => {
    const onSelect = vi.fn();
    render(<EventCalendar label="E" events={EVENTS} today="2026-10-07" view="grid" onSelectedDateChange={onSelect} />);
    expect(screen.getByText("Choose a day to see its events.")).toBeTruthy();
    act(() => cell("2026-10-07").focus());
    press("ArrowDown");
    press("ArrowRight");
    press("Enter");
    expect(onSelect).toHaveBeenLastCalledWith("2026-10-15");
    expect(cell("2026-10-15").getAttribute("aria-selected")).toBe("true");
    const day = screen.getByRole("heading", { level: 4 });
    expect(day.textContent).toBe("Thursday, October 15, 2026");
    const items = [...document.querySelectorAll(".stoa-calendar__chosen .stoa-calendar__event")].map((li) => li.textContent);
    expect(items).toEqual(["◆Offer · : Put offer at 100%Request by 9 October.", "◐Amortisation · : 20% of face paid back"]);
    press(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
    fireEvent.click(cell("2026-10-16"));
    expect(onSelect).toHaveBeenLastCalledWith("2026-10-16");
    expect(screen.getByText("No events on this day.")).toBeTruthy();
  });

  it("changes the month with Previous and Next, named with the month they go to", () => {
    const onMonth = vi.fn();
    render(<EventCalendar label="E" events={EVENTS} today="2026-10-07" view="grid" onMonthChange={onMonth} />);
    fireEvent.click(screen.getByRole("button", { name: "Next month: November 2026" }));
    expect(onMonth).toHaveBeenLastCalledWith("2026-11");
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("November 2026");
    expect(screen.getByRole("heading", { level: 3 }).getAttribute("aria-live")).toBe("polite");
    fireEvent.click(screen.getByRole("button", { name: "Previous month: October 2026" }));
    expect(onMonth).toHaveBeenLastCalledWith("2026-10");
  });

  it("stays on a month the caller holds, and tells it of a change", () => {
    const onMonth = vi.fn();
    render(<EventCalendar label="E" events={EVENTS} today="2026-10-07" view="grid" month="2026-10" onMonthChange={onMonth} />);
    fireEvent.click(screen.getByRole("button", { name: "Next month: November 2026" }));
    expect(onMonth).toHaveBeenCalledWith("2026-11");
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("October 2026");
  });

  it("says when a month has no events", () => {
    render(<EventCalendar label="E" events={EVENTS} today="2026-10-07" defaultMonth="2026-12" view="grid" />);
    expect(screen.getByText("December 2026: no events.")).toBeTruthy();
  });
});

describe("EventCalendar: deadlines and marks", () => {
  const ACT_BY: CalendarEvent[] = [
    { id: "d", date: "2026-10-09", kind: "deadline", title: "Last day to ask for redemption" },
    { id: "o", date: "2026-10-15", kind: "offer", title: "Put offer at 100%" },
    { id: "c", date: "2026-10-21", kind: "coupon", title: "Coupon 7 of 12", mark: "projected" },
    { id: "c2", date: "2026-10-21", kind: "coupon", title: "Coupon 3 of 6" },
    { id: "r", date: "2026-10-28", kind: "rating", title: "Rating lowered", mark: "synthetic" },
  ];

  it("draws a deadline as a kind of its own, on its own day, with its symbol and word in the cell, the key and the list", () => {
    render(<EventCalendar label="E" events={ACT_BY} today="2026-10-07" defaultSelectedDate="2026-10-09" view="grid" />);
    expect(cell("2026-10-09").textContent).toContain("Friday, October 9, 2026: Deadline");
    expect(cell("2026-10-09").querySelector(".stoa-calendar__marks")!.textContent).toBe("⚑");
    expect(cell("2026-10-15").textContent).toContain("Thursday, October 15, 2026: Offer");
    expect([...document.querySelectorAll(".stoa-calendar__key-item")].map((i) => i.textContent)).toEqual(["●Coupon", "⚑Deadline", "◆Offer", "↕Rating change"]);
    expect([...document.querySelectorAll(".stoa-calendar__chosen .stoa-calendar__event")].map((li) => li.textContent)).toEqual(["⚑Deadline · : Last day to ask for redemption"]);
  });

  it("says an entry's mark beside its kind's word in the day's list, and reads its day with it", () => {
    render(<EventCalendar label="E" events={ACT_BY} today="2026-10-07" defaultSelectedDate="2026-10-21" view="grid" />);
    expect(cell("2026-10-21").textContent).toContain("Wednesday, October 21, 2026: Coupon, Coupon (projected)");
    expect(cell("2026-10-28").textContent).toContain("Wednesday, October 28, 2026: Rating change (synthetic)");
    // One symbol per kind in the cell, as before.
    expect(cell("2026-10-21").querySelector(".stoa-calendar__marks")!.textContent).toBe("●");
    const items = [...document.querySelectorAll(".stoa-calendar__chosen .stoa-calendar__event")];
    expect(items.map((li) => li.querySelector(".stoa-calendar__event-head")!.textContent)).toEqual(["Coupon (projected) · : Coupon 7 of 12", "Coupon · : Coupon 3 of 6"]);
    expect(items[0]!.querySelector(".stoa-calendar__mark")!.className).toContain("stoa-calendar__mark--projected");
  });

  it("says the deadline and the marks in Russian and Arabic", () => {
    render(
      <I18nProvider locale="ru-RU">
        <EventCalendar label="События" events={ACT_BY} today="2026-10-07" view="list" />
      </I18nProvider>,
    );
    const heads = () => [...document.querySelectorAll(".stoa-calendar__event-head")].map((p) => p.textContent);
    expect(heads()).toEqual([
      "Крайний срок · : Last day to ask for redemption",
      "Оферта · : Put offer at 100%",
      "Купон (прогноз) · : Coupon 7 of 12",
      "Купон · : Coupon 3 of 6",
      "Изменение рейтинга (синтетическое) · : Rating lowered",
    ]);
    cleanup();
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <EventCalendar label="الأحداث" events={ACT_BY} today="2026-10-07" view="grid" />
      </I18nProvider>,
    );
    expect(cell("2026-10-09").textContent).toContain("آخر موعد");
    expect(cell("2026-10-21").textContent).toContain("كوبون (متوقَّع)");
    expect(cell("2026-10-28").textContent).toContain("تغيّر التصنيف (اصطناعي)");
  });
});

describe("EventCalendar: the list", () => {
  it("lists the month's days with events, each date a heading, today marked in words", () => {
    render(<EventCalendar label="Bond events" events={EVENTS} today="2026-10-07" view="list" />);
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.getByRole("region", { name: "Bond events October 2026" })).toBeTruthy();
    const days = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(days).toEqual(["Wednesday, October 7, 2026 · today", "Thursday, October 15, 2026"]);
    expect(screen.getAllByRole("listitem").filter((li) => li.classList.contains("stoa-calendar__event")).map((li) => li.querySelector(".stoa-calendar__kind")!.textContent)).toEqual([
      "Coupon",
      "Offer",
      "Amortisation",
    ]);
  });

  it("says when there is nothing to list, in the locale's words", () => {
    render(
      <I18nProvider locale="ru-RU">
        <EventCalendar label="События" events={[]} today="2026-10-07" view="list" />
      </I18nProvider>,
    );
    expect(screen.getByText("Октябрь 2026 г.: событий нет.")).toBeTruthy();
  });
});
