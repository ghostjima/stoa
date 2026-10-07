// @vitest-environment jsdom
// RecordList: a listbox of records with one picked, the keyboard, a
// disabled record, the empty list, and the locale.
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider, RecordList, type RecordListHandle, type RecordListItem } from "./index";

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
              { id: "1", label: "شراء ACME", meta: "٥٠٠" },
              { id: "2", label: "بيع ZYLO", meta: "٢٠٠" },
            ]}
            value="1"
            onChange={onChange}
          />
        </div>
      </I18nProvider>,
    );
    expect(screen.getByRole("listbox", { name: "السندات" }).textContent).toBe("لا عناصر.");
    act(() => option("شراء ACME").focus());
    press("ArrowDown");
    press("Enter");
    expect(onChange).toHaveBeenLastCalledWith("2");
  });
});

describe("RecordList: focusRecord", () => {
  /** An application that focuses a record as soon as the list mounts, as
   * one does when a detail closes on a narrow screen and the list comes
   * back. `seen` records how many options existed when it asked. */
  function FocusOnMount({ id, seen }: { id: string; seen: number[] }) {
    const list = useRef<RecordListHandle>(null);
    useEffect(() => {
      seen.push(document.querySelectorAll('[role="option"][data-key]').length);
      list.current?.focusRecord(id);
    }, [id, seen]);
    return <RecordList ref={list} label="Bonds" items={BONDS} value="a" onChange={() => {}} />;
  }

  it("focuses a record asked for right after mount, once React Aria's options exist", async () => {
    const seen: number[] = [];
    await act(async () => {
      render(<FocusOnMount id="d" seen={seen} />);
    });
    // Asked before the options existed: only the rows drawn in their place.
    expect(seen).toEqual([0]);
    expect(document.activeElement).toBe(option("XS0000004"));
    // The focus moved; the pick did not.
    expect(option("XS0000004").getAttribute("aria-selected")).toBe("false");
    expect(option("RU000A1001").getAttribute("aria-selected")).toBe("true");
    // From there the arrow keys go on from the focused record.
    press("ArrowUp");
    expect(document.activeElement).toBe(option("RU000A1002"));
  });

  it("focuses a record at once when the options already exist", async () => {
    const list = { current: null as RecordListHandle | null };
    await act(async () => {
      render(<RecordList ref={(handle) => void (list.current = handle)} label="Bonds" items={BONDS} value="a" onChange={() => {}} />);
    });
    act(() => list.current?.focusRecord("b"));
    expect(document.activeElement).toBe(option("RU000A1002"));
  });

  it("does nothing for a record the list does not hold, and does not wait for it", async () => {
    const list = { current: null as RecordListHandle | null };
    const { rerender } = render(<RecordList ref={(handle) => void (list.current = handle)} label="Bonds" items={BONDS} value="a" onChange={() => {}} />);
    await act(async () => {});
    act(() => list.current?.focusRecord("zz"));
    expect(document.activeElement).toBe(document.body);
    // Not focused later either, when such a record arrives.
    await act(async () => {
      rerender(<RecordList ref={(handle) => void (list.current = handle)} label="Bonds" items={[...BONDS, { id: "zz", label: "RU000A1099" }]} value="a" onChange={() => {}} />);
    });
    expect(document.activeElement).toBe(document.body);
  });
});

