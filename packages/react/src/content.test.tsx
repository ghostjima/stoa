// @vitest-environment jsdom
// LogView, CodeView and Metric, and StatBar with Metric items: direction,
// focus and names, copying and its announcement, digits and thresholds.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CodeView, I18nProvider, LogView, Metric, StatBar } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("dir");
});

const ARABIC = "ar-u-nu-arab";

function mockClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: spy }, configurable: true });
  return spy;
}

describe("LogView", () => {
  const LINES = ["10:00:01 open AAPL", "10:00:02 seek 10:30", "10:00:03 close"];

  it("is a focusable region named by its label, left to right, one line per entry", () => {
    render(<LogView label="Engine log" lines={LINES} />);
    const region = screen.getByRole("region", { name: "Engine log" });
    expect(region.tagName).toBe("PRE");
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.getAttribute("dir")).toBe("ltr");
    expect([...region.querySelectorAll(".stoa-code__line")].map((line) => line.textContent?.trimEnd())).toEqual(LINES);
    expect(region.textContent).toBe(LINES.join("\n"));
    act(() => region.focus());
    expect(document.activeElement).toBe(region);
  });

  it("isolates a line's message, so an Arabic message keeps its own direction after a time and a level", async () => {
    const writeText = mockClipboard(() => Promise.resolve());
    render(<LogView label="Engine log" lines={[{ time: "10:00:02", level: "INFO", text: "تم تحميل السجل." }, "10:00:03 close"]} />);
    const region = screen.getByRole("region", { name: "Engine log" });
    const line = region.querySelector(".stoa-code__line")!;
    expect(line.querySelector(".stoa-code__time")?.textContent).toBe("10:00:02");
    expect(line.querySelector(".stoa-code__level")?.textContent).toBe("INFO");
    expect(line.querySelector("bdi:last-of-type")?.textContent).toBe("تم تحميل السجل.");
    expect(line.querySelector("bdi:last-of-type")?.hasAttribute("dir")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("10:00:02 INFO تم تحميل السجل.\n10:00:03 close");
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
  });

  it("isolates the time (left to right) and the level (its own direction), so Arabic ones do not join the message's run", () => {
    document.documentElement.dir = "rtl";
    render(
      <I18nProvider locale={ARABIC}>
        <LogView label="سجل الوكيل" lines={[{ time: "١٠:٢٥:٠٢", level: "الوكيل", text: "تم تحميل السجل." }]} />
      </I18nProvider>,
    );
    const line = screen.getByRole("region").querySelector(".stoa-code__line")!;
    const time = line.querySelector(".stoa-code__time")!;
    const level = line.querySelector(".stoa-code__level")!;
    // A dir attribute isolates an element (unicode-bidi: isolate in the
    // browser's own stylesheet); bdi isolates with the direction of its text.
    expect(time.getAttribute("dir")).toBe("ltr");
    expect(level.tagName).toBe("BDI");
    expect(level.hasAttribute("dir")).toBe(false);
    expect(line.textContent).toBe("١٠:٢٥:٠٢ الوكيل تم تحميل السجل.");
  });

  it("stays left to right in a right-to-left page", () => {
    document.documentElement.dir = "rtl";
    render(<LogView label="Engine log" lines={LINES} />);
    expect(screen.getByRole("region", { name: "Engine log" }).getAttribute("dir")).toBe("ltr");
  });

  it("scrolls within the height of maxLines lines", () => {
    render(<LogView label="Engine log" lines={LINES} maxLines={5} />);
    expect(screen.getByRole("region").style.getPropertyValue("--code-lines")).toBe("5");
  });

  it("copies the whole log and announces it politely", async () => {
    const writeText = mockClipboard(() => Promise.resolve());
    render(<LogView label="Engine log" lines={LINES} />);
    const copy = screen.getByRole("button", { name: "Copy" });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    fireEvent.click(copy);
    expect(writeText).toHaveBeenCalledWith(LINES.join("\n"));
    await waitFor(() => expect(status.textContent).toBe("Copied"));
    // The button's description is the log's label, so two Copy buttons on
    // a page can be told apart.
    expect(document.getElementById(copy.getAttribute("aria-describedby")!)?.textContent).toBe("Engine log");
  });

  it("says so when the copy fails", async () => {
    mockClipboard(() => Promise.reject(new Error("denied")));
    render(<LogView label="Engine log" lines={LINES} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copy failed"));
  });

  it("clears the result after a few seconds", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    render(<LogView label="Engine log" lines={LINES} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await act(async () => {});
    expect(screen.getByRole("status").textContent).toBe("Copied");
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole("status").textContent).toBe("");
    vi.useRealTimers();
  });

  it("can leave out the Copy button", () => {
    render(<LogView label="Engine log" lines={LINES} copyable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says Copy and Copied in the locale's words", async () => {
    mockClipboard(() => Promise.resolve());
    render(
      <I18nProvider locale={ARABIC}>
        <LogView label="السجل" lines={LINES} />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "نسخ" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("تم النسخ"));
  });
});

describe("CodeView", () => {
  const CODE = "const x = 1;\n\nexport default x;";

  it("is a focusable, left-to-right region of code named by its label", () => {
    document.documentElement.dir = "rtl";
    render(<CodeView label="Example" code={CODE} />);
    const region = screen.getByRole("region", { name: "Example" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.getAttribute("dir")).toBe("ltr");
    expect(region.querySelector("code")?.textContent).toBe(CODE);
    expect(region.querySelector(".stoa-code__number")).toBeNull();
  });

  it("numbers its lines when asked, hidden from assistive technology", () => {
    render(<CodeView label="Example" code={CODE} lineNumbers />);
    const numbers = [...document.querySelectorAll(".stoa-code__number")];
    expect(numbers.map((n) => n.textContent)).toEqual(["1", "2", "3"]);
    for (const n of numbers) expect(n.getAttribute("aria-hidden")).toBe("true");
  });

  it("copies the code without its line numbers", async () => {
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CodeView label="Example" code={CODE} lineNumbers />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(CODE);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
  });
});

describe("Metric", () => {
  it("is a description list: the label as term, the value with its unit, basis and threshold as descriptions", () => {
    const { container } = render(
      <Metric
        label="Frame time"
        value={16.94}
        fractionDigits={1}
        unit="ms"
        basis="p95 over 60 s"
        threshold={{ tone: "negative", label: "Over budget" }}
      />,
    );
    const list = container.querySelector("dl.stoa-metric")!;
    expect(list.querySelector("dt")?.textContent).toBe("Frame time");
    expect([...list.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(["16.9 ms", "✗ Over budget", "p95 over 60 s"]);
    expect(list.querySelector(".stoa-badge--negative")).toBeTruthy();
  });

  it("shows each threshold tone as a symbol and a word", () => {
    const tones = [
      ["positive", "✓"],
      ["negative", "✗"],
      ["neutral", "·"],
    ] as const;
    for (const [tone, symbol] of tones) {
      const { container, unmount } = render(<Metric label="Fill" value={3} threshold={{ tone, label: "Word" }} />);
      const badge = container.querySelector(`.stoa-badge--${tone}`)!;
      expect(badge.textContent).toBe(`${symbol} Word`);
      expect(badge.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });

  it("leaves out what it is not given, and formats a whole number by default", () => {
    const { container } = render(<Metric label="Orders" value={1200} />);
    expect([...container.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(["1,200"]);
  });

  it("writes the value in the locale's digits, numbers and preformatted text alike, in a right-to-left page", () => {
    document.documentElement.dir = "rtl";
    const { container } = render(
      <I18nProvider locale={ARABIC}>
        <Metric label="زمن الإطار" value={16.94} fractionDigits={1} unit="ms" />
        <Metric label="الوقت" value="10:30:05" />
      </I18nProvider>,
    );
    const numbers = [...container.querySelectorAll(".stoa-metric__number")].map((n) => n.textContent);
    expect(numbers).toEqual(["١٦٫٩", "١٠:٣٠:٠٥"]);
  });
});

describe("StatBar with Metric items", () => {
  it("renders plain and Metric items in one named description list", () => {
    const { container } = render(
      <StatBar
        label="Counters"
        items={[
          { label: "frames/s", value: "60" },
          { kind: "metric", label: "frame p95", value: 16.9, fractionDigits: 1, unit: "ms", threshold: { tone: "positive", label: "Within budget" } },
        ]}
      />,
    );
    const list = container.querySelector("dl")!;
    expect(list.getAttribute("aria-label")).toBe("Counters");
    expect([...list.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(["frames/s", "frame p95"]);
    expect([...list.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(["60", "16.9 ms", "✓ Within budget"]);
    expect(list.querySelectorAll(".stoa-statbar__item--metric")).toHaveLength(1);
    expect(list.querySelector("dl dl")).toBeNull();
  });

  it("formats Metric items in the locale's digits", () => {
    const { container } = render(
      <I18nProvider locale={ARABIC}>
        <StatBar label="العدادات" items={[{ kind: "metric", label: "الإطارات", value: 60 }]} />
      </I18nProvider>,
    );
    expect(container.querySelector("dd")?.textContent).toBe("٦٠");
  });
});
