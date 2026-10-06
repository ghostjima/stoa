// @vitest-environment jsdom
// Countdown and DeadlineCell: the words in English, Russian and Arabic
// with their plural forms, the state and its symbol, and announcements on
// a change of state only.
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Countdown, DeadlineCell, I18nProvider, deadlineState, deadlineText, stoaFormat } from "./index";

afterEach(cleanup);

const en = stoaFormat("en-US");
const ru = stoaFormat("ru-RU");
const ar = stoaFormat("ar-u-nu-arab");

describe("deadlineState", () => {
  it("is overdue below zero, a warning at the threshold or under it, normal above", () => {
    expect([deadlineState(5, 3), deadlineState(3, 3), deadlineState(0, 0), deadlineState(-0.5, 3)]).toEqual(["normal", "warning", "warning", "overdue"]);
  });
});

describe("deadlineText", () => {
  it("says the time left or overdue in English, one or many", () => {
    expect(deadlineText(en, 1, "workingDays")).toBe("1 working day left");
    expect(deadlineText(en, 3, "workingDays")).toBe("3 working days left");
    expect(deadlineText(en, -2, "days")).toBe("2 days overdue");
    expect(deadlineText(en, -1, "hours")).toBe("1 hour overdue");
    expect(deadlineText(en, 0, "workingDays")).toBe("Due today");
    expect(deadlineText(en, 0, "hours")).toBe("Due within the hour");
    expect(deadlineText(en, 1.5, "hours")).toBe("1.5 hours left");
  });

  it("takes the Russian plural forms after each count", () => {
    expect(deadlineText(ru, 1, "workingDays")).toBe("Остался 1 рабочий день");
    expect(deadlineText(ru, 3, "workingDays")).toBe("Осталось 3 рабочих дня");
    expect(deadlineText(ru, 5, "workingDays")).toBe("Осталось 5 рабочих дней");
    expect(deadlineText(ru, 21, "days")).toBe("Остался 21 день");
    expect(deadlineText(ru, 12, "hours")).toBe("Осталось 12 часов");
    expect(deadlineText(ru, -2, "workingDays")).toBe("Просрочено на 2 рабочих дня");
    expect(deadlineText(ru, -1, "hours")).toBe("Просрочено на 1 час");
    expect(deadlineText(ru, 1.5, "workingDays")).toBe("Осталось 1,5 рабочего дня");
    expect(deadlineText(ru, 0, "days")).toBe("Срок сегодня");
  });

  it("writes Arabic as a label and a count, in Arabic-Indic digits", () => {
    expect(deadlineText(ar, 3, "workingDays")).toBe("أيام العمل المتبقية: ٣");
    expect(deadlineText(ar, -2, "hours")).toBe("ساعات التأخير: ٢");
  });
});

describe("Countdown", () => {
  it("draws the words, and the state as a symbol hidden from assistive technology", () => {
    const { container, rerender } = render(<Countdown left={5} unit="workingDays" warnAt={2} />);
    const root = () => container.querySelector(".stoa-countdown")!;
    expect([root().getAttribute("data-state"), root().textContent, root().querySelector(".stoa-countdown__symbol")]).toEqual(["normal", "5 working days left", null]);
    rerender(<Countdown left={2} unit="workingDays" warnAt={2} />);
    expect(root().getAttribute("data-state")).toBe("warning");
    expect(root().querySelector(".stoa-countdown__symbol")?.textContent).toBe("!");
    expect(root().querySelector(".stoa-countdown__symbol")?.getAttribute("aria-hidden")).toBe("true");
    rerender(<Countdown left={-1} unit="workingDays" warnAt={2} />);
    expect(root().getAttribute("data-state")).toBe("overdue");
    expect(root().querySelector(".stoa-countdown__symbol")?.textContent).toBe("✗");
    expect(root().querySelector(".stoa-countdown__text")?.textContent).toBe("1 working day overdue");
  });

  it("reads out a change of state, not every tick", () => {
    const { rerender } = render(<Countdown left={4} unit="hours" warnAt={1} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    rerender(<Countdown left={3} unit="hours" warnAt={1} />);
    rerender(<Countdown left={2} unit="hours" warnAt={1} />);
    expect(status.textContent).toBe("");
    rerender(<Countdown left={1} unit="hours" warnAt={1} />);
    expect(status.textContent).toBe("1 hour left");
    rerender(<Countdown left={0} unit="hours" warnAt={1} />);
    expect(status.textContent).toBe("1 hour left");
    act(() => rerender(<Countdown left={-1} unit="hours" warnAt={1} />));
    expect(status.textContent).toBe("1 hour overdue");
  });

  it("takes the caller's words, and still follows the time left for its state", () => {
    const { container } = render(
      <Countdown left={-1} unit="days">
        Offer window closed
      </Countdown>,
    );
    expect(container.querySelector(".stoa-countdown")?.textContent).toBe("✗Offer window closed");
    expect(container.querySelector(".stoa-countdown")?.getAttribute("data-state")).toBe("overdue");
  });
});

describe("DeadlineCell", () => {
  it("is a Countdown without announcements, in the locale's words", () => {
    render(
      <I18nProvider locale="ru-RU">
        <DeadlineCell left={-3} unit="workingDays" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Просрочено на 3 рабочих дня")).toBeTruthy();
  });
});
