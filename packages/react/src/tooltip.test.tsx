// @vitest-environment jsdom
// Tooltip: the term is a button, the tooltip opens on focus, hover and
// press, describes the term while open, and closes on Escape.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, Tooltip } from "./index";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const YTM = "Yield to maturity: the return if the bond is held until it is repaid.";

function setup() {
  render(
    <p>
      <button type="button">Before</button> The <Tooltip content={YTM}>YTM</Tooltip> is 7.5%.
    </p>,
  );
  return screen.getByRole("button", { name: "YTM" });
}

/** Moves keyboard focus to an element, as Tab would: React Aria shows a
 * tooltip on focus only after a keyboard interaction. */
function tabTo(element: HTMLElement) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab" });
  act(() => element.focus());
  fireEvent.keyUp(element, { key: "Tab" });
}

describe("Tooltip", () => {
  it("is a button named by the term, with no tooltip until asked", () => {
    const term = setup();
    expect(term.className).toBe("stoa-tooltip-term");
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(term.hasAttribute("aria-describedby")).toBe(false);
  });

  it("opens at once on keyboard focus, describes the term, and closes on Escape", () => {
    const term = setup();
    tabTo(term);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toBe(YTM);
    expect(term.getAttribute("aria-describedby")).toBe(tip.id);
    fireEvent.keyDown(term, { key: "Escape" });
    act(() => vi.runAllTimers());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on a press, as on a touch screen, and a second press closes it", () => {
    const term = setup();
    fireEvent.pointerDown(term, { pointerType: "touch", pointerId: 1, button: 0 });
    fireEvent.pointerUp(term, { pointerType: "touch", pointerId: 1, button: 0 });
    fireEvent.click(term);
    expect(screen.getByRole("tooltip").textContent).toBe(YTM);
    fireEvent.pointerDown(term, { pointerType: "touch", pointerId: 1, button: 0 });
    fireEvent.pointerUp(term, { pointerType: "touch", pointerId: 1, button: 0 });
    fireEvent.click(term);
    act(() => vi.runAllTimers());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on hover after a short delay", () => {
    const term = setup();
    // React Aria takes a hover from the pointer events React listens to.
    fireEvent.pointerMove(document.body, { pointerType: "mouse" });
    fireEvent.pointerOver(term, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("opens beside the term at its end in a right-to-left page, in Arabic", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <Tooltip content="العائد حتى الاستحقاق." placement="end" defaultOpen>
            العائد
          </Tooltip>
        </div>
      </I18nProvider>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toBe("العائد حتى الاستحقاق.");
    expect(screen.getByRole("button", { name: "العائد" }).getAttribute("aria-describedby")).toBe(tip.id);
  });

  it("draws an arrow on the side it opened on, hidden from assistive technology", () => {
    render(
      <Tooltip content={YTM} placement="bottom" defaultOpen>
        YTM
      </Tooltip>,
    );
    const arrow = screen.getByRole("tooltip").querySelector(".stoa-tooltip__arrow")!;
    expect(arrow.getAttribute("data-placement")).toBe("bottom");
    expect(arrow.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("tooltip").textContent).toBe(YTM);
  });
});
