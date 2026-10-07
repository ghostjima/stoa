// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, RadioGroup, type RadioOption } from "./index";

afterEach(cleanup);

const describedBy = (element: Element) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

type Decision = "approve" | "modify" | "defer";
const OPTIONS: RadioOption<Decision>[] = [
  { value: "approve", label: "Approve", description: "Goes to the signatory as drafted." },
  { value: "modify", label: "Modify" },
  { value: "defer", label: "Defer", description: "Wait for facts.", isDisabled: true },
];

function Controlled({ onChange, initial = null }: { onChange?: (v: Decision) => void; initial?: Decision | null }) {
  const [value, setValue] = useState<Decision | null>(initial);
  return (
    <RadioGroup
      label="Decision"
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("RadioGroup", () => {
  it("is a radio group named by its visible label, one radio per option", () => {
    render(<Controlled initial="modify" />);
    const group = screen.getByRole("radiogroup", { name: "Decision" });
    expect(screen.getByText("Decision").className).toBe("stoa-field__label");
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(["approve", "modify", "defer"]);
    expect(radios.map((r) => r.checked)).toEqual([false, true, false]);
    expect(group.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("keeps its label for assistive technology only with hideLabel", () => {
    render(<RadioGroup label="Decision" hideLabel options={OPTIONS} value={null} onChange={() => {}} />);
    expect(screen.getByText("Decision").className).toBe("stoa-visually-hidden");
    expect(screen.getByRole("radiogroup", { name: "Decision" })).toBeTruthy();
  });

  it("reads each option's description with that option only", () => {
    render(<Controlled />);
    expect(describedBy(screen.getByRole("radio", { name: "Approve" }))).toEqual(["Goes to the signatory as drafted."]);
    expect(describedBy(screen.getByRole("radio", { name: "Modify" }))).toEqual([]);
    expect(describedBy(screen.getByRole("radio", { name: "Defer" }))).toEqual(["Wait for facts."]);
  });

  it("chooses an option on a click; a disabled option is a disabled input", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Modify" }));
    expect(onChange).toHaveBeenLastCalledWith("modify");
    expect((screen.getByRole("radio", { name: "Defer" }) as HTMLInputElement).disabled).toBe(true);
  });

  it("is one tab stop, on the chosen option", () => {
    render(<Controlled initial="modify" />);
    const tabbable = (screen.getAllByRole("radio") as HTMLInputElement[]).filter((r) => r.tabIndex >= 0 && !r.disabled).map((r) => r.value);
    expect(tabbable).toEqual(["modify"]);
    // The radios share a name, so with none chosen the browser itself
    // makes the group one stop (a browser test checks it).
    const names = new Set((screen.getAllByRole("radio") as HTMLInputElement[]).map((r) => r.name));
    expect(names.size).toBe(1);
  });

  it("moves and chooses with the arrow keys, skipping a disabled option, mirrored right to left", () => {
    const onChange = vi.fn();
    const { unmount } = render(<Controlled initial="approve" onChange={onChange} />);
    const approve = screen.getByRole("radio", { name: "Approve" });
    act(() => approve.focus());
    fireEvent.keyDown(approve, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("modify");
    // Defer is disabled: the next one round is Approve again.
    fireEvent.keyDown(screen.getByRole("radio", { name: "Modify" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("approve");
    unmount();

    const rtl = vi.fn();
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <Controlled initial="approve" onChange={rtl} />
      </I18nProvider>,
    );
    const first = screen.getByRole("radio", { name: "Approve" });
    act(() => first.focus());
    // In a right-to-left locale the left arrow goes forward.
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(rtl).toHaveBeenLastCalledWith("modify");
  });

  it("sets its options in a row with orientation horizontal", () => {
    const { container } = render(<RadioGroup label="Yield to" orientation="horizontal" options={OPTIONS} value={null} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup").getAttribute("aria-orientation")).toBe("horizontal");
    expect(container.querySelector(".stoa-radio-group--horizontal")).not.toBeNull();
  });

  it("is marked invalid with its message read as the group's description, after its own", () => {
    render(
      <RadioGroup
        label="Stream"
        description="It sets the rules for the reply."
        options={OPTIONS}
        value={null}
        onChange={() => {}}
        isRequired
        isInvalid
        errorMessage="Choose a stream."
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Stream" });
    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(group.getAttribute("aria-required")).toBe("true");
    expect(describedBy(group)).toEqual(["It sets the rules for the reply.", "Choose a stream."]);
    expect(screen.getByRole("radio", { name: "Approve" }).closest(".stoa-radio__button")?.hasAttribute("data-invalid")).toBe(true);
  });

  it("disables every option with isDisabled, keeping the choice shown", () => {
    render(<RadioGroup label="Decision" options={OPTIONS} value="modify" onChange={() => {}} isDisabled />);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.every((r) => r.disabled)).toBe(true);
    expect(radios[1]!.checked).toBe(true);
  });
});
