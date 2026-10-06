// @vitest-environment jsdom
// RecordList: a listbox of records with one picked, the keyboard, a
// disabled record, the empty list, and the locale.
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider, RecordList, type RecordListItem } from "./index";

afterEach(cleanup);

const BONDS: RecordListItem[] = [
  { id: "a", label: "RU000A1001", description: "Gazprom, 2027", meta: "7.52%" },
  { id: "b", label: "RU000A1002", description: "Sber, 2026", meta: "8.10%" },
  { id: "c", label: "RU000A1003", description: "Matured", isDisabled: true },
  { id: "d", label: "XS0000004", description: "Lukoil, 2030", meta: "6.95%" },
];

function Bonds({ onChange = () => {}, initial = "a" as string | null, items = BONDS }: { onChange?: (id: string) => void; initial?: string | null; items?: RecordListItem[] }) {
  const [value, setValue] = useState(initial);
  return (
    <RecordList
      label="Bonds"
      items={items}
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange(id);
      }}
    />
  );
}

const option = (name: RegExp | string) => screen.getByRole("option", { name });
const press = (key: string) => {
  fireEvent.keyDown(document.activeElement!, { key });
  fireEvent.keyUp(document.activeElement!, { key });
};

describe("RecordList", () => {
  it("is a listbox named by its label, each record an option named by its label and described by its second line", () => {
    render(<Bonds />);
    const list = screen.getByRole("listbox", { name: "Bonds" });
    expect(list.className).toBe("stoa-record-list");
    expect(within(list).getAllByRole("option")).toHaveLength(4);
    const first = option("RU000A1001");
    expect(document.getElementById(first.getAttribute("aria-describedby")!)?.textContent).toBe("Gazprom, 2027");
    expect(first.textContent).toContain("7.52%");
  });

  it("marks the picked record as selected, and only that one", () => {
    render(<Bonds initial="b" />);
    expect(option("RU000A1002").getAttribute("aria-selected")).toBe("true");
    expect(option("RU000A1001").getAttribute("aria-selected")).toBe("false");
    cleanup();
    render(<Bonds initial={null} />);
    expect(screen.getAllByRole("option").every((o) => o.getAttribute("aria-selected") === "false")).toBe(true);
  });

  it("moves the focus with the arrows, Home and End, skipping a disabled record, and picks with Enter", () => {
    const onChange = vi.fn();
    render(<Bonds onChange={onChange} />);
    act(() => option("RU000A1001").focus());
    press("ArrowDown");
    expect(document.activeElement).toBe(option("RU000A1002"));
    expect(onChange).not.toHaveBeenCalled();
    press("ArrowDown");
    expect(document.activeElement).toBe(option("XS0000004"));
    press("Home");
    expect(document.activeElement).toBe(option("RU000A1001"));
    press("End");
    press("Enter");
    expect(onChange).toHaveBeenLastCalledWith("d");
    expect(option("XS0000004").getAttribute("aria-selected")).toBe("true");
  });

  it("picks with a click, keeps a picked record picked when it is pressed again, and ignores a disabled one", () => {
    const onChange = vi.fn();
    render(<Bonds onChange={onChange} />);
    fireEvent.click(option("RU000A1002"));
    expect(onChange).toHaveBeenLastCalledWith("b");
    fireEvent.click(option("RU000A1002"));
    expect(option("RU000A1002").getAttribute("aria-selected")).toBe("true");
    const disabled = option("RU000A1003");
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(disabled);
    expect(onChange).not.toHaveBeenCalledWith("c");
  });

  it("is one tab stop", () => {
    render(
      <>
        <Bonds initial="b" />
        <button type="button">After</button>
      </>,
    );
    const stops = screen.getAllByRole("option").filter((o) => o.getAttribute("tabindex") === "0");
    expect(stops.length).toBeLessThanOrEqual(1);
  });

  it("says it is empty in the locale's words, or the caller's", () => {
    render(<Bonds items={[]} initial={null} />);
    expect(screen.getByRole("listbox", { name: "Bonds" }).textContent).toBe("No items.");
    cleanup();
    render(<RecordList label="Bonds" items={[]} value={null} onChange={() => {}} emptyText="No bonds match." />);
    expect(screen.getByRole("listbox").textContent).toBe("No bonds match.");
  });

  it("speaks Arabic and moves with the arrows in a right-to-left page", () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <RecordList label="السندات" items={[]} value={null} onChange={onChange} />
          <RecordList
            label="الأوامر"
            items={[
              { id: "1", label: "شراء AAPL", meta: "٥٠٠" },
              { id: "2", label: "بيع MSFT", meta: "٢٠٠" },
            ]}
            value="1"
            onChange={onChange}
          />
        </div>
      </I18nProvider>,
    );
    expect(screen.getByRole("listbox", { name: "السندات" }).textContent).toBe("لا عناصر.");
    act(() => option("شراء AAPL").focus());
    press("ArrowDown");
    press("Enter");
    expect(onChange).toHaveBeenLastCalledWith("2");
  });
});
