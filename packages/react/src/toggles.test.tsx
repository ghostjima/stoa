// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Checkbox, CheckboxGroup, I18nProvider, Switch } from "./index";

afterEach(cleanup);

const describedBy = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

describe("Switch", () => {
  it("is a switch named by its visible label, off or on", () => {
    const { rerender } = render(
      <Switch isSelected={false} onChange={() => {}}>
        Live updates
      </Switch>,
    );
    const input = screen.getByRole("switch", { name: "Live updates" }) as HTMLInputElement;
    expect(input.checked).toBe(false);
    expect(screen.getByText("Live updates")).toBeTruthy();
    rerender(
      <Switch isSelected onChange={() => {}}>
        Live updates
      </Switch>,
    );
    expect(input.checked).toBe(true);
    expect(input.closest(".stoa-switch__button")?.hasAttribute("data-selected")).toBe(true);
  });

  it("toggles on a click and on Space", () => {
    const onChange = vi.fn();
    render(
      <Switch isSelected={false} onChange={onChange}>
        Live updates
      </Switch>,
    );
    const input = screen.getByRole("switch", { name: "Live updates" });
    fireEvent.click(input);
    expect(onChange).toHaveBeenLastCalledWith(true);
    act(() => input.focus());
    fireEvent.keyDown(input, { key: " " });
    fireEvent.keyUp(input, { key: " " });
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows the focus ring on its track after keyboard focus", () => {
    render(
      <Switch isSelected={false} onChange={() => {}}>
        Live updates
      </Switch>,
    );
    const input = screen.getByRole("switch", { name: "Live updates" });
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => input.focus());
    expect(input.closest(".stoa-switch__button")?.hasAttribute("data-focus-visible")).toBe(true);
  });

  it("announces its description", () => {
    render(
      <Switch isSelected onChange={() => {}} description="Prices move as trades arrive.">
        Live updates
      </Switch>,
    );
    expect(describedBy(screen.getByRole("switch", { name: "Live updates" }))).toEqual(["Prices move as trades arrive."]);
  });

  it("is disabled with its reason shown and announced, after the description", () => {
    const onChange = vi.fn();
    render(
      <Switch isSelected={false} onChange={onChange} isDisabled description="Prices move as trades arrive." disabledReason="Needs a live feed.">
        Live updates
      </Switch>,
    );
    const input = screen.getByRole("switch", { name: "Live updates" });
    expect(input.hasAttribute("disabled")).toBe(true);
    expect(describedBy(input)).toEqual(["Prices move as trades arrive.", "Needs a live feed."]);
    // A click on the label, as a pointer would land: jsdom dispatches a
    // click on a disabled input itself, which no browser does.
    fireEvent.click(screen.getByText("Live updates"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the reason out of sight and out of the name while enabled", () => {
    render(
      <Switch isSelected={false} onChange={() => {}} disabledReason="Needs a live feed." size="small">
        Live updates
      </Switch>,
    );
    expect(screen.queryByText("Needs a live feed.")).toBeNull();
    const input = screen.getByRole("switch", { name: "Live updates" });
    expect(input.closest(".stoa-switch")?.className).toContain("stoa-switch--small");
  });

  it("reads correctly in a right-to-left page", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <Switch isSelected onChange={() => {}} description="تتحرك الأسعار مع الصفقات.">
            تحديث مباشر
          </Switch>
        </div>
      </I18nProvider>,
    );
    const input = screen.getByRole("switch", { name: "تحديث مباشر" });
    expect(describedBy(input)).toEqual(["تتحرك الأسعار مع الصفقات."]);
  });
});

describe("Checkbox", () => {
  it("is a checkbox named by its label: unchecked, checked and mixed", () => {
    const { rerender } = render(<Checkbox isSelected={false} onChange={() => {}}>Show fees</Checkbox>);
    const input = screen.getByRole("checkbox", { name: "Show fees" }) as HTMLInputElement;
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);
    expect(document.querySelector(".stoa-checkbox__mark")).toBeNull();

    rerender(<Checkbox isSelected onChange={() => {}}>Show fees</Checkbox>);
    expect(input.checked).toBe(true);
    expect(document.querySelector(".stoa-checkbox__box")?.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".stoa-checkbox__mark path")?.getAttribute("d")).toBe("M3 8.5l3.2 3L13 4.5");

    rerender(<Checkbox isSelected={false} isIndeterminate onChange={() => {}}>Show fees</Checkbox>);
    expect(input.indeterminate).toBe(true);
    expect(document.querySelector(".stoa-checkbox__mark path")?.getAttribute("d")).toBe("M3.5 8h9");
  });

  it("toggles on a click, and a mixed box becomes checked", () => {
    const onChange = vi.fn();
    render(
      <Checkbox isSelected={false} isIndeterminate onChange={onChange}>
        All columns
      </Checkbox>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "All columns" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows the focus ring after keyboard focus, and announces a description", () => {
    render(
      <Checkbox isSelected={false} onChange={() => {}} description="Commission and exchange fees.">
        Show fees
      </Checkbox>,
    );
    const input = screen.getByRole("checkbox", { name: "Show fees" });
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => input.focus());
    expect(input.closest(".stoa-checkbox__button")?.hasAttribute("data-focus-visible")).toBe(true);
    expect(describedBy(input)).toEqual(["Commission and exchange fees."]);
  });

  it("does nothing while disabled", () => {
    const onChange = vi.fn();
    render(
      <Checkbox isSelected={false} onChange={onChange} isDisabled>
        Show fees
      </Checkbox>,
    );
    const input = screen.getByRole("checkbox", { name: "Show fees" });
    expect(input.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByText("Show fees"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

function Columns({ onChange = (_: string[]) => {}, isDisabled = false }) {
  const [value, setValue] = useState(["price"]);
  return (
    <CheckboxGroup
      label="Show columns"
      description="At least one column stays."
      value={value}
      isDisabled={isDisabled}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    >
      <Checkbox value="price">Price</Checkbox>
      <Checkbox value="size">Size</Checkbox>
      <Checkbox value="time">Time</Checkbox>
    </CheckboxGroup>
  );
}

describe("CheckboxGroup", () => {
  it("is a group named by its visible label and described, holding the checked values", () => {
    render(<Columns />);
    const group = screen.getByRole("group", { name: "Show columns" });
    expect(describedBy(group)).toEqual(["At least one column stays."]);
    expect((screen.getByRole("checkbox", { name: "Price" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Size" }) as HTMLInputElement).checked).toBe(false);
  });

  it("reports the checked values as boxes are pressed", () => {
    const onChange = vi.fn();
    render(<Columns onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Time" }));
    expect(onChange).toHaveBeenLastCalledWith(["price", "time"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Price" }));
    expect(onChange).toHaveBeenLastCalledWith(["time"]);
  });

  it("disables every box at once", () => {
    render(<Columns isDisabled />);
    for (const name of ["Price", "Size", "Time"]) {
      expect(screen.getByRole("checkbox", { name }).hasAttribute("disabled")).toBe(true);
    }
  });

  it("keeps its label for assistive technology only with hideLabel", () => {
    render(
      <CheckboxGroup label="Show columns" hideLabel value={[]} onChange={() => {}}>
        <Checkbox value="price">Price</Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByRole("group", { name: "Show columns" })).toBeTruthy();
    expect(screen.getByText("Show columns").className).toBe("stoa-visually-hidden");
  });
});
