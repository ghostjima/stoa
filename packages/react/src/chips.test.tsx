// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterChip, FilterChipGroup, I18nProvider, Tag, type TagTone } from "./index";

afterEach(cleanup);

const ARABIC = "ar-u-nu-arab";

describe("Tag", () => {
  const TONES: TagTone[] = ["neutral", "info", "positive", "warning", "negative", "accent"];

  it.each(TONES)("draws the %s tone and says it in words, with no role of its own", (tone) => {
    const { container } = render(<Tag tone={tone}>Delayed 15 min</Tag>);
    const tag = screen.getByText("Delayed 15 min");
    expect(tag.className).toBe(`stoa-tag stoa-tag--${tone} stoa-tag--regular`);
    expect(tag.getAttribute("role")).toBeNull();
    expect(container.querySelector("button, [tabindex]")).toBeNull();
  });

  it("is neutral and regular by default, and has a small size", () => {
    render(
      <>
        <Tag>Paper</Tag>
        <Tag size="small">Live</Tag>
      </>,
    );
    expect(screen.getByText("Paper").className).toBe("stoa-tag stoa-tag--neutral stoa-tag--regular");
    expect(screen.getByText("Live").className).toContain("stoa-tag--small");
  });
});

describe("FilterChip", () => {
  it("is a toggle button with aria-pressed, named by its label and its count", () => {
    const onChange = vi.fn();
    render(
      <FilterChip isSelected={false} onChange={onChange} count={12}>
        Filled
      </FilterChip>,
    );
    const chip = screen.getByRole("button", { name: "Filled 12" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    expect(chip.querySelector(".stoa-filter-chip__check")).toBeNull();
    fireEvent.click(chip);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows a check mark while on, hidden from assistive technology", () => {
    render(
      <FilterChip isSelected onChange={() => {}}>
        Filled
      </FilterChip>,
    );
    const chip = screen.getByRole("button", { name: "Filled" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(chip.querySelector(".stoa-filter-chip__check")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("toggles from the keyboard", () => {
    const onChange = vi.fn();
    render(
      <FilterChip isSelected={false} onChange={onChange}>
        Filled
      </FilterChip>,
    );
    const chip = screen.getByRole("button", { name: "Filled" });
    act(() => chip.focus());
    fireEvent.keyDown(chip, { key: " " });
    fireEvent.keyUp(chip, { key: " " });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does nothing while disabled", () => {
    const onChange = vi.fn();
    render(
      <FilterChip isSelected={false} onChange={onChange} isDisabled size="small">
        Filled
      </FilterChip>,
    );
    const chip = screen.getByRole("button", { name: "Filled" });
    expect(chip.hasAttribute("disabled")).toBe(true);
    expect(chip.className).toContain("stoa-filter-chip--small");
    fireEvent.click(chip);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("writes the count in the locale's digits", () => {
    render(
      <I18nProvider locale={ARABIC}>
        <FilterChip isSelected={false} onChange={() => {}} count={1200}>
          منفذة
        </FilterChip>
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "منفذة ١٬٢٠٠" })).toBeTruthy();
  });
});

const STATUS = [
  { id: "open", label: "Open", count: 3 },
  { id: "filled", label: "Filled", count: 12 },
  { id: "cancelled", label: "Cancelled", count: 0, isDisabled: true },
  { id: "rejected", label: "Rejected", count: 1 },
];

function Status({ initial = [] as string[], onChange = (_: string[]) => {}, overflow = "wrap" as "wrap" | "scroll" }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <FilterChipGroup
      label="Order status"
      chips={STATUS}
      value={value}
      overflow={overflow}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("FilterChipGroup", () => {
  it("is a labelled group of pressed and unpressed buttons", () => {
    render(<Status initial={["filled"]} />);
    const group = screen.getByRole("toolbar", { name: "Order status" });
    expect(group.className).toBe("stoa-filter-chips stoa-filter-chips--wrap");
    expect(screen.getByRole("button", { name: "Filled 12" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Open 3" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Cancelled 0" }).hasAttribute("disabled")).toBe(true);
  });

  it("reports the chips that are on in their own order, whichever was pressed last", () => {
    const onChange = vi.fn();
    render(<Status initial={["rejected"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Open 3" }));
    expect(onChange).toHaveBeenLastCalledWith(["open", "rejected"]);
    fireEvent.click(screen.getByRole("button", { name: "Rejected 1" }));
    expect(onChange).toHaveBeenLastCalledWith(["open"]);
  });

  it("moves between chips with the arrow keys, skipping a disabled one", () => {
    render(<Status />);
    const open = screen.getByRole("button", { name: "Open 3" });
    act(() => open.focus());
    fireEvent.keyDown(open, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Filled 12" }));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Rejected 1" }));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Filled 12" }));
  });

  it("reverses the arrow keys in a right-to-left locale", () => {
    render(
      <I18nProvider locale={ARABIC}>
        <div dir="rtl">
          <Status />
        </div>
      </I18nProvider>,
    );
    const open = screen.getByRole("button", { name: "Open ٣" });
    act(() => open.focus());
    fireEvent.keyDown(open, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Filled ١٢" }));
  });

  it("can scroll sideways inside itself instead of wrapping", () => {
    render(<Status overflow="scroll" />);
    expect(screen.getByRole("toolbar", { name: "Order status" }).className).toContain("stoa-filter-chips--scroll");
  });

  it("shows its label by default, which then names the toolbar", () => {
    render(<FilterChipGroup label="Order status" chips={STATUS} value={[]} onChange={() => {}} />);
    const toolbar = screen.getByRole("toolbar", { name: "Order status" });
    const label = screen.getByText("Order status");
    expect(label.className).toBe("stoa-field__label");
    expect(toolbar.getAttribute("aria-labelledby")).toBe(label.id);
  });

  it("keeps its label for assistive technology only with hideLabel", () => {
    const { container } = render(<FilterChipGroup label="Order status" hideLabel chips={STATUS} value={[]} onChange={() => {}} />);
    expect(screen.getByRole("toolbar", { name: "Order status" }).getAttribute("aria-label")).toBe("Order status");
    expect(container.querySelector(".stoa-field__label")).toBeNull();
  });
});
