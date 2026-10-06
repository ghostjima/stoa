// @vitest-environment jsdom
// The feedback and layout components; the toasts have their own file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  AppHeader,
  Button,
  Callout,
  EmptyState,
  I18nProvider,
  LiveRegion,
  PageShell,
  ProgressBar,
  Skeleton,
  SkeletonBlock,
  SkeletonLines,
  VisuallyHidden,
  type FeedbackTone,
} from "./index";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ARABIC = "ar-u-nu-arab";

/** Arabic words and digits, in a right-to-left container. */
function Arabic({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale={ARABIC}>
      <div dir="rtl">{children}</div>
    </I18nProvider>
  );
}

/** Presses a React Aria button from the keyboard. */
function pressKey(element: HTMLElement, key: string) {
  act(() => element.focus());
  fireEvent.keyDown(element, { key });
  fireEvent.keyUp(element, { key });
}

describe("LiveRegion", () => {
  it("is a polite status by default and an alert when assertive, hidden unless asked to show", () => {
    render(<LiveRegion>Saved</LiveRegion>);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-atomic")).toBe("true");
    expect(status.className).toBe("stoa-visually-hidden");
    expect(status.textContent).toBe("Saved");
    cleanup();
    render(
      <LiveRegion politeness="assertive" visible>
        Connection lost
      </LiveRegion>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
    expect(alert.className).toBe("stoa-live-region");
  });

  it("is in the document empty before its first text, so that text is announced", () => {
    // The first commit renders an empty region; the effect fills it. Read
    // the DOM from a ref callback, which runs at commit before effects.
    let atCommit: string | null = null;
    render(
      <div ref={(node) => { atCommit ??= node?.querySelector("[role='status']")?.textContent ?? null; }}>
        <LiveRegion>Ready</LiveRegion>
      </div>,
    );
    expect(atCommit).toBe("");
    expect(screen.getByRole("status").textContent).toBe("Ready");
  });

  it("follows fast changes at most every announceEvery ms, and ends on the latest text", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const { rerender } = render(<LiveRegion announceEvery={1000}>1 order</LiveRegion>);
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("1 order");
    rerender(<LiveRegion announceEvery={1000}>2 orders</LiveRegion>);
    act(() => vi.advanceTimersByTime(300));
    rerender(<LiveRegion announceEvery={1000}>3 orders</LiveRegion>);
    act(() => vi.advanceTimersByTime(300));
    expect(region.textContent).toBe("1 order");
    act(() => vi.advanceTimersByTime(400));
    expect(region.textContent).toBe("3 orders");
  });
});

describe("VisuallyHidden", () => {
  it("keeps its text for assistive technology, over Stoa's hidden class", () => {
    render(
      <button type="button">
        ×<VisuallyHidden id="close-word">Close</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole("button", { name: "×Close" })).toBeTruthy();
    const hidden = document.getElementById("close-word")!;
    expect(hidden.tagName).toBe("SPAN");
    expect(hidden.className).toBe("stoa-visually-hidden");
  });
});

describe("Skeleton", () => {
  it("hides its shapes from assistive technology and announces one loading label", () => {
    const { container } = render(
      <Skeleton label="Loading trades">
        <SkeletonBlock blockSize="var(--stoa-space-12)" />
        <SkeletonLines count={4} />
      </Skeleton>,
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.textContent).toBe("Loading trades");
    expect(statuses[0]!.getAttribute("aria-live")).toBe("polite");
    const shapes = container.querySelector(".stoa-skeleton__shapes")!;
    expect(shapes.getAttribute("aria-hidden")).toBe("true");
    expect(shapes.querySelectorAll(".stoa-skeleton__line")).toHaveLength(4);
    expect((shapes.querySelector(".stoa-skeleton__block") as HTMLElement).style.blockSize).toBe("var(--stoa-space-12)");
  });

  it("draws three lines and says the locale's loading word by default", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll(".stoa-skeleton__line")).toHaveLength(3);
    expect(screen.getByRole("status").textContent).toBe("Loading…");
    cleanup();
    render(
      <Arabic>
        <Skeleton />
      </Arabic>,
    );
    expect(screen.getByRole("status").textContent).toBe("جارٍ التحميل…");
  });
});

describe("ProgressBar", () => {
  it("is a progressbar named by its label, with a percentage shown and announced", () => {
    const { container } = render(<ProgressBar label="Loading AAPL" value={45} />);
    const bar = screen.getByRole("progressbar", { name: "Loading AAPL" });
    expect(bar.getAttribute("aria-valuenow")).toBe("45");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe("45%");
    expect(container.querySelector(".stoa-progress__value")?.textContent).toBe("45%");
    expect((container.querySelector(".stoa-progress__fill") as HTMLElement).style.inlineSize).toBe("45%");
  });

  it("reads an amount out of a total when it formats the value", () => {
    const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
    render(<ProgressBar label="Loading AAPL" value={1.2e6} maxValue={4.8e6} formatValue={mb} />);
    const bar = screen.getByRole("progressbar", { name: "Loading AAPL" });
    // Each amount is isolated (FSI ... PDI), so it keeps its own direction
    // inside a sentence of the other direction.
    expect(bar.getAttribute("aria-valuetext")).toBe("⁨1.2 MB⁩ of ⁨4.8 MB⁩");
    expect(screen.getByText("⁨1.2 MB⁩ of ⁨4.8 MB⁩")).toBeTruthy();
  });

  it("lays out its value text in the direction of its words, not of the frame around it", () => {
    const { container } = render(
      <I18nProvider locale="en-Arab">
        <div dir="rtl">
          <ProgressBar label="File" value={3.1} maxValue={4.3} formatValue={(v) => `${v} MB`} />
        </div>
      </I18nProvider>,
    );
    // A dir attribute also isolates the value text from the frame's run.
    expect(container.querySelector(".stoa-progress__value")?.getAttribute("dir")).toBe("ltr");
    cleanup();
    const arabic = render(
      <Arabic>
        <ProgressBar label="ملف" value={3} maxValue={8} formatValue={(n) => `${n}`} />
      </Arabic>,
    );
    expect(arabic.container.querySelector(".stoa-progress__value")?.getAttribute("dir")).toBe("rtl");
  });

  it("has no value while indeterminate, and the bar moves only through the motion tokens", () => {
    const { container } = render(<ProgressBar label="Starting the engine" isIndeterminate />);
    const bar = screen.getByRole("progressbar", { name: "Starting the engine" });
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.hasAttribute("aria-valuetext")).toBe(false);
    expect(container.querySelector(".stoa-progress__value")).toBeNull();
    expect(bar.className).toContain("stoa-progress--indeterminate");
    expect((container.querySelector(".stoa-progress__fill") as HTMLElement).style.inlineSize).toBe("");
  });

  it("writes the value in the locale's words and digits", () => {
    render(
      <Arabic>
        <ProgressBar label="تحميل" value={45} />
        <ProgressBar label="تنزيل" value={3} maxValue={8} formatValue={(n) => `${n}`} />
      </Arabic>,
    );
    expect(screen.getByRole("progressbar", { name: "تحميل" }).getAttribute("aria-valuetext")).toBe(
      // Arabic-Indic digits and percent sign; ICU closes it with an Arabic
      // letter mark, so the expectation comes from Intl too.
      new Intl.NumberFormat(ARABIC, { style: "percent" }).format(0.45),
    );
    expect(new Intl.NumberFormat(ARABIC, { style: "percent" }).format(0.45)).toMatch(/^٤٥٪/);
    expect(screen.getByRole("progressbar", { name: "تنزيل" }).getAttribute("aria-valuetext")).toBe("⁨3⁩ من ⁨8⁩");
  });
});

describe("Callout", () => {
  const TONES: [FeedbackTone, string, string][] = [
    ["info", "◆", "Note"],
    ["positive", "✓", "Success"],
    ["warning", "!", "Warning"],
    ["negative", "✗", "Error"],
  ];

  it.each(TONES)("draws the %s tone as a symbol and reads it as a word, not by colour alone", (tone, symbol, word) => {
    const { container } = render(
      <Callout tone={tone} title="Feed">
        The feed is fifteen minutes behind.
      </Callout>,
    );
    const callout = container.querySelector(".stoa-callout")!;
    expect(callout.className).toContain(`stoa-callout--${tone}`);
    const mark = callout.querySelector(".stoa-tone-symbol")!;
    expect(mark.textContent).toBe(symbol);
    expect(mark.getAttribute("aria-hidden")).toBe("true");
    const hidden = callout.querySelector(".stoa-visually-hidden")!;
    expect(hidden.textContent).toBe(`${word}:`);
    // Read in order: the tone word, then the title, then the body.
    expect(callout.textContent).toBe(`${symbol}${word}:FeedThe feed is fifteen minutes behind.`);
  });

  it("draws no tone as a letter of any script, so an Arabic interface shows no Latin letter", () => {
    for (const [tone] of TONES) {
      const { container } = render(<Callout tone={tone}>Text</Callout>);
      expect(container.querySelector(".stoa-tone-symbol")!.textContent, tone).not.toMatch(/\p{L}/u);
      cleanup();
    }
  });

  it("is a polite status by default, an alert only when asked, and no live region for a static note", () => {
    render(<Callout>Saved.</Callout>);
    expect(screen.getByRole("status").textContent).toContain("Saved.");
    cleanup();
    render(
      <Callout tone="negative" role="alert">
        Could not load the session.
      </Callout>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Could not load the session.");
    expect(screen.queryByRole("status")).toBeNull();
    cleanup();
    const { container } = render(
      <Callout role="none" title="On rounding">
        Prices are rounded to the tick.
      </Callout>,
    );
    expect(container.querySelector(".stoa-callout")!.hasAttribute("role")).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("draws the title only when given one, and puts the action below the body", () => {
    const onRetry = vi.fn();
    const { container } = render(
      <Callout tone="negative" action={<Button onPress={onRetry}>Retry</Button>}>
        Could not load AAPL.
      </Callout>,
    );
    expect(container.querySelector(".stoa-callout__title")).toBeNull();
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry.closest(".stoa-callout__action")).toBeTruthy();
    pressKey(retry, "Enter");
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("has no close button unless it can be dismissed; the close button is named and works by pointer and keyboard", () => {
    render(<Callout>Saved.</Callout>);
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    const onDismiss = vi.fn();
    render(<Callout onDismiss={onDismiss}>Saved.</Callout>);
    const close = screen.getByRole("button", { name: "Dismiss" });
    expect(close.querySelector("[aria-hidden='true']")?.textContent).toBe("×");
    fireEvent.click(close);
    pressKey(close, "Enter");
    pressKey(close, " ");
    expect(onDismiss).toHaveBeenCalledTimes(3);
  });

  it("speaks Arabic in an Arabic locale and keeps its reading order in a right-to-left page", () => {
    const { container } = render(
      <Arabic>
        <Callout tone="warning" title="البيانات متأخرة" onDismiss={() => {}}>
          التأخير خمس عشرة دقيقة.
        </Callout>
      </Arabic>,
    );
    expect(container.querySelector(".stoa-visually-hidden")?.textContent).toBe("تحذير:");
    expect(screen.getByRole("button", { name: "إغلاق" })).toBeTruthy();
    // Symbol, body, close button in document order; the logical CSS puts
    // the symbol at the right edge in this direction.
    const [symbol, body, close] = [...container.querySelector(".stoa-callout")!.children];
    expect(symbol!.classList.contains("stoa-tone-symbol")).toBe(true);
    expect(body!.className).toBe("stoa-callout__body");
    expect(close!.classList.contains("stoa-dismiss")).toBe(true);
  });
});

describe("EmptyState", () => {
  it("shows a title, a description and an action, in that order", () => {
    const onLoad = vi.fn();
    const { container } = render(
      <EmptyState title="No orders yet" description="Orders you place appear here." action={<Button onPress={onLoad}>Load a session</Button>} />,
    );
    const parts = [...container.querySelector(".stoa-empty-state")!.children].map((child) => child.className);
    expect(parts).toEqual(["stoa-empty-state__title", "stoa-empty-state__description", "stoa-empty-state__action"]);
    expect(screen.getByText("No orders yet")).toBeTruthy();
    pressKey(screen.getByRole("button", { name: "Load a session" }), "Enter");
    expect(onLoad).toHaveBeenCalledOnce();
  });

  it("leaves out the parts it is not given", () => {
    const { container } = render(<EmptyState title="Nothing to audit" />);
    expect(container.querySelector(".stoa-empty-state__description")).toBeNull();
    expect(container.querySelector(".stoa-empty-state__action")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders in a right-to-left page with its text as given", () => {
    render(
      <Arabic>
        <EmptyState title="لا أوامر بعد" />
      </Arabic>,
    );
    expect(screen.getByText("لا أوامر بعد").closest("[dir='rtl']")).toBeTruthy();
  });
});

describe("PageShell", () => {
  it("has a banner, one main and a footer, with a skip link first that moves focus to main", () => {
    render(
      <PageShell header={<AppHeader title="Tyche Replay" actions={<button type="button">Dark</button>} />} footer="Data provided by IEX.">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole("banner")).toBeTruthy();
    const main = screen.getByRole("main");
    expect(main.textContent).toBe("Content");
    expect(main.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByRole("contentinfo").textContent).toBe("Data provided by IEX.");

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    const focusable = document.querySelectorAll("a[href], button");
    expect(focusable[0]).toBe(skip);
    expect(skip.getAttribute("href")).toBe(`#${main.id}`);
    act(() => skip.focus());
    fireEvent.click(skip);
    expect(document.activeElement).toBe(main);
  });

  it("has no footer landmark without a footer", () => {
    render(
      <PageShell header={<AppHeader title="Themis Steps" />}>
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("names the skip link in the locale's language, in a right-to-left page", () => {
    render(
      <Arabic>
        <PageShell header={<AppHeader title="تايكي" />}>
          <p>المحتوى</p>
        </PageShell>
      </Arabic>,
    );
    const skip = screen.getByRole("link", { name: "انتقل إلى المحتوى الرئيسي" });
    fireEvent.click(skip);
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });
});

describe("the feedback and layout styles", () => {
  // jsdom applies no stylesheet, so these rules are read as text: the
  // block appended for this group, from its marker to the end of the file.
  const css = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");
  const block = css.slice(css.indexOf("/* ==== Feedback and layout ==== */"));

  it("is in the stylesheet", () => {
    expect(block.length).toBeGreaterThan(100);
  });

  it("uses logical properties only, so right-to-left needs no overrides", () => {
    const physical = /(^|[\s;{])(margin|padding|border|inset)-(left|right|top|bottom)\b|(^|[\s;{])(left|right|top|bottom)\s*:|text-align:\s*(left|right)|float:\s*(left|right)/m;
    expect(block.match(physical)).toBeNull();
  });

  it("sets the tone's border colour after the rules whose border shorthand would reset it", () => {
    const tone = block.indexOf(".stoa-callout--info, .stoa-toast--info {");
    expect(tone).toBeGreaterThan(block.indexOf(".stoa-callout {"));
    expect(tone).toBeGreaterThan(block.indexOf(".stoa-toast {"));
  });

  it("animates and transitions only on the motion duration tokens, which reduced motion sets to zero", () => {
    const declarations = [...block.matchAll(/(?:^|[\s;{])(animation|transition)\s*:\s*([^;]+);/g)];
    expect(declarations.length).toBeGreaterThan(0);
    for (const [, , value] of declarations) expect(value).toMatch(/var\(--stoa-motion-duration-[a-z]+\)/);
  });
});
