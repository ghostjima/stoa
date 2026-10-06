// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, Slider, type SliderProps } from "./index";

afterEach(cleanup);

function Controlled(props: Partial<SliderProps> & { onValue?: (value: number) => void }) {
  const [value, setValue] = useState(props.value ?? 20);
  return (
    <Slider
      label="Depth"
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onValue?.(next);
      }}
    />
  );
}

const percent = (v: number) => `${v} %`;

describe("Slider", () => {
  it("is a slider named by its visible label, with min, max and the value", () => {
    render(<Controlled min={0} max={50} />);
    const input = screen.getByRole("slider", { name: "Depth" });
    expect(screen.getByText("Depth").className).toContain("stoa-field__label");
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("50");
    expect(input.getAttribute("aria-valuetext")).toBe("20");
    expect(document.querySelector(".stoa-range__output")?.textContent).toBe("20");
  });

  it("keeps its label for assistive technology only with hideLabel, the value still shown", () => {
    render(<Controlled hideLabel />);
    expect(screen.getByRole("slider", { name: "Depth" })).toBeTruthy();
    expect(screen.getByText("Depth").className).toBe("stoa-visually-hidden");
    expect(document.querySelector(".stoa-range__output")?.textContent).toBe("20");
  });

  it("shows and announces the formatted value", () => {
    render(<Controlled format={percent} />);
    const input = screen.getByRole("slider", { name: "Depth" });
    expect(input.getAttribute("aria-valuetext")).toBe("20 %");
    expect(document.querySelector(".stoa-range__output")?.textContent).toBe("20 %");
  });

  it("steps with the arrow keys by its step, and stops at the ends", () => {
    const onValue = vi.fn();
    render(<Controlled step={5} min={0} max={30} value={25} format={percent} onValue={onValue} />);
    const input = screen.getByRole("slider", { name: "Depth" });
    act(() => input.focus());
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onValue).toHaveBeenLastCalledWith(30);
    expect(input.getAttribute("aria-valuetext")).toBe("30 %");
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onValue).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "Home" });
    expect(onValue).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(input, { key: "End" });
    expect(onValue).toHaveBeenLastCalledWith(30);
  });

  it("fills the track up to the thumb", () => {
    render(<Controlled min={0} max={50} value={10} />);
    expect((document.querySelector(".stoa-range__fill") as HTMLElement).style.inlineSize).toBe("20%");
  });

  it("announces its hint", () => {
    render(<Controlled hint="Levels shown on each side of the book." />);
    const input = screen.getByRole("slider", { name: "Depth" });
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain("Levels shown on each side of the book.");
  });

  it("shows the focus ring on its thumb after keyboard focus", () => {
    render(<Controlled />);
    const input = screen.getByRole("slider", { name: "Depth" });
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => input.focus());
    expect(document.querySelector(".stoa-range__thumb")?.hasAttribute("data-focus-visible")).toBe(true);
  });

  it("is disabled: not focusable by keys and marked for the stylesheet", () => {
    const onValue = vi.fn();
    render(<Controlled isDisabled size="small" onValue={onValue} />);
    const input = screen.getByRole("slider", { name: "Depth" });
    expect(input.hasAttribute("disabled")).toBe(true);
    const root = input.closest(".stoa-range")!;
    expect(root.hasAttribute("data-disabled")).toBe(true);
    expect(root.className).toContain("stoa-range--small");
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onValue).not.toHaveBeenCalled();
  });

  it("follows the reading direction and the locale's digits in Arabic", () => {
    const onValue = vi.fn();
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <Controlled label="العمق" value={20} onValue={onValue} />
        </div>
      </I18nProvider>,
    );
    const input = screen.getByRole("slider", { name: "العمق" });
    expect(document.querySelector(".stoa-range__output")?.textContent).toBe("٢٠");
    // The fill is laid out in the direction React Aria places the thumb by.
    expect(document.querySelector(".stoa-range__track")?.getAttribute("dir")).toBe("rtl");
    act(() => input.focus());
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    expect(onValue).toHaveBeenLastCalledWith(21);
  });
});
