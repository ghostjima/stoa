// @vitest-environment jsdom
// LogView's copy is plain text, and its "jump to latest" control speaks
// the locale's words. Following the newest line, wrapping and where an
// Arabic line starts are measured in a browser (e2e/log.e2e.ts).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CodeView, LogView, messagesFor } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockClipboard() {
  const spy = vi.fn((_text: string) => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText: spy }, configurable: true });
  return spy;
}

// Every invisible bidi control: LRM, RLM, ALM, the embeddings and
// overrides (LRE, RLE, PDF, LRO, RLO) and the isolates (LRI, RLI, FSI,
// PDI).
const CONTROLS = "\u200e\u200f\u061c\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069";

describe("LogView's copy", () => {
  it("is plain text, without the invisible bidi controls an application put in its lines", () => {
    const writeText = mockClipboard();
    render(
      <LogView
        label="Agent log"
        lines={[
          { time: "\u206610:25:01\u2069", level: "\u2068INFO\u2069", text: "\u200fتم تحميل السجل\u200f." },
          `10:25:02 ${CONTROLS}done`,
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("10:25:01 INFO تم تحميل السجل.\n10:25:02 done");
  });

  it("leaves CodeView's code exactly as given: a control there may be part of the code", () => {
    const writeText = mockClipboard();
    render(<CodeView label="snippet" code={'const mark = "\u200f";'} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith('const mark = "\u200f";');
  });
});

describe("LogView's jump to latest", () => {
  it("is named in each of Stoa's languages", () => {
    expect(messagesFor("en").jumpToLatest).toBe("Jump to latest");
    expect(messagesFor("ru").jumpToLatest).toBe("К последним строкам");
    expect(messagesFor("ar").jumpToLatest).toBe("الانتقال إلى الأحدث");
  });
});
