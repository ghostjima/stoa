// @vitest-environment jsdom
// ToastQueue and ToastRegion: announcement, expiry, pausing, the action.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AlertDialog, DEFAULT_TOAST_TIMEOUT, I18nProvider, ToastQueue, ToastRegion } from "./index";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** A region with a button before it that holds focus, as on a page. */
function setup(locale = "en-US") {
  const queue = new ToastQueue();
  render(
    <I18nProvider locale={locale}>
      <button type="button">Place order</button>
      <ToastRegion queue={queue} />
    </I18nProvider>,
  );
  const page = screen.getByRole("button", { name: "Place order" });
  act(() => page.focus());
  return { queue, page };
}

const add = (queue: ToastQueue, ...args: Parameters<ToastQueue["add"]>) => {
  let key = "";
  act(() => {
    key = queue.add(...args);
  });
  return key;
};

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** Presses a React Aria button from the keyboard. */
function pressKey(element: HTMLElement, key: string) {
  act(() => element.focus());
  fireEvent.keyDown(element, { key });
  fireEvent.keyUp(element, { key });
}

describe("ToastRegion", () => {
  it("draws nothing until a toast arrives, then a named region with the toast, without taking focus", () => {
    const { queue, page } = setup();
    expect(screen.queryByRole("region")).toBeNull();
    add(queue, { tone: "positive", text: "Order placed." });
    const region = screen.getByRole("region", { name: "Notifications" });
    const toast = screen.getByRole("alertdialog", { name: "Success: Order placed." });
    expect(region.contains(toast)).toBe(true);
    expect(toast.className).toContain("stoa-toast--positive");
    expect(toast.querySelector(".stoa-tone-symbol")?.getAttribute("aria-hidden")).toBe("true");
    expect(document.activeElement).toBe(page);
  });

  it("announces each toast through a polite live region that stays in the document, with no alert", () => {
    const { queue } = setup();
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    add(queue, { tone: "warning", text: "Feed delayed." });
    expect(status.textContent).toBe("Warning: Feed delayed.");
    expect(screen.queryByRole("alert")).toBeNull();
    // The same text again replaces the node, so it is read again.
    const first = status.firstElementChild;
    add(queue, { tone: "warning", text: "Feed delayed." });
    expect(status.textContent).toBe("Warning: Feed delayed.");
    expect(status.firstElementChild).not.toBe(first);
  });

  it("closes a toast after 8 seconds by default and calls onExpire once", () => {
    expect(DEFAULT_TOAST_TIMEOUT).toBe(8000);
    const { queue } = setup();
    const onExpire = vi.fn();
    add(queue, { text: "Saved.", onExpire });
    advance(7900);
    expect(screen.getByRole("alertdialog", { name: "Note: Saved." })).toBeTruthy();
    advance(200);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it("takes its own timeout, or none at all", () => {
    const { queue } = setup();
    add(queue, { text: "Short.", timeout: 2000 });
    add(queue, { text: "Stays.", timeout: null });
    advance(2100);
    expect(screen.queryByRole("alertdialog", { name: "Note: Short." })).toBeNull();
    advance(600_000);
    expect(screen.getByRole("alertdialog", { name: "Note: Stays." })).toBeTruthy();
  });

  it("stops the time while the pointer is over the region, and goes on when it leaves", () => {
    const { queue } = setup();
    const onExpire = vi.fn();
    add(queue, { text: "Saved.", onExpire });
    advance(5000);
    const region = screen.getByRole("region", { name: "Notifications" });
    fireEvent.pointerEnter(region, { pointerType: "mouse" });
    advance(60_000);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.pointerLeave(region, { pointerType: "mouse" });
    advance(2900);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    advance(200);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it("stops the time while focus is inside the region", () => {
    const { queue, page } = setup();
    add(queue, { text: "Order cancelled.", action: { label: "Undo", onAction: () => {} } });
    const undo = screen.getByRole("button", { name: "Undo" });
    act(() => undo.focus());
    advance(60_000);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    act(() => page.focus());
    advance(DEFAULT_TOAST_TIMEOUT + 100);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("runs the action from the keyboard, then closes the toast without calling onExpire", () => {
    const { queue } = setup();
    const onAction = vi.fn();
    const onExpire = vi.fn();
    add(queue, { tone: "info", text: "Order cancelled.", action: { label: "Undo", onAction }, onExpire });
    const toast = screen.getByRole("alertdialog", { name: "Note: Order cancelled." });
    // The toast itself is a Tab stop, then its action, then its close button.
    expect(toast.getAttribute("tabindex")).toBe("0");
    const buttons = [...toast.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(buttons).toEqual(["Undo", "Dismiss"]);
    pressKey(screen.getByRole("button", { name: "Undo" }), "Enter");
    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    advance(DEFAULT_TOAST_TIMEOUT * 2);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("closes from its close button, or from the queue, without calling onExpire", () => {
    const { queue } = setup();
    const onExpire = vi.fn();
    add(queue, { text: "First.", onExpire });
    const second = add(queue, { text: "Second.", onExpire });
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[1]!);
    expect(screen.queryByRole("alertdialog", { name: "Note: First." })).toBeNull();
    act(() => queue.close(second));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    advance(DEFAULT_TOAST_TIMEOUT * 2);
    expect(onExpire).not.toHaveBeenCalled();
    // Closing a key that is gone does nothing.
    act(() => queue.close(second));
  });

  it("shows the newest toast first", () => {
    const { queue } = setup();
    add(queue, { text: "First." });
    add(queue, { text: "Second." });
    expect(screen.getAllByRole("alertdialog").map((t) => t.textContent)).toEqual([
      expect.stringContaining("Second."),
      expect.stringContaining("First."),
    ]);
  });

  it("speaks Arabic and lays out right to left in an Arabic locale", () => {
    const { queue } = setup("ar-u-nu-arab");
    add(queue, { tone: "negative", text: "تعذر الحفظ." });
    const region = screen.getByRole("region", { name: "الإشعارات" });
    expect(region.getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("alertdialog", { name: "خطأ: تعذر الحفظ." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "إغلاق" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("خطأ: تعذر الحفظ.");
  });

  it("takes a caller's region name", () => {
    const queue = new ToastQueue();
    render(<ToastRegion queue={queue} label="Order updates" />);
    add(queue, { text: "Filled." });
    expect(screen.getByRole("region", { name: "Order updates" })).toBeTruthy();
  });

  it("is an alertdialog that is not modal, as React Aria makes it, told from an AlertDialog by its region and aria-modal", () => {
    const queue = new ToastQueue();
    render(
      <>
        <ToastRegion queue={queue} />
        <AlertDialog isOpen title="Delete the run?" confirmLabel="Delete run" onConfirm={() => {}}>
          It cannot be undone.
        </AlertDialog>
      </>,
    );
    add(queue, { text: "Run saved." });
    const confirmation = screen.getByRole("alertdialog", { name: "Delete the run?" });
    expect(confirmation.getAttribute("aria-modal")).not.toBe("false");
    // The modal hides the page behind it, the toasts too; hidden: true finds them.
    const region = screen.getByRole("region", { name: "Notifications", hidden: true });
    const toast = within(region).getByRole("alertdialog", { name: "Note: Run saved.", hidden: true });
    expect(toast.getAttribute("aria-modal")).toBe("false");
    expect(region.contains(confirmation)).toBe(false);
  });

  it("draws a description under its text that can update itself while shown, without announcing it", () => {
    function Countdown({ from }: { from: number }) {
      const [left, setLeft] = useState(from);
      useEffect(() => {
        const timer = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
        return () => clearInterval(timer);
      }, []);
      return <>Undo possible for {left} s</>;
    }
    const { queue } = setup();
    add(queue, { text: "Step deleted.", description: <Countdown from={30} />, timeout: null });
    const toast = screen.getByRole("alertdialog", { name: "Note: Step deleted." });
    const description = document.getElementById(toast.getAttribute("aria-describedby")!)!;
    expect(description.textContent).toBe("Undo possible for 30 s");
    expect(description.className).toBe("stoa-toast__description");
    advance(3000);
    expect(description.textContent).toBe("Undo possible for 27 s");
    // The live region said the text once; the description is not news.
    expect(screen.getByRole("status").textContent).toBe("Note: Step deleted.");
  });

  it("draws an Arabic description under an Arabic text, right to left", () => {
    const { queue } = setup("ar-u-nu-arab");
    add(queue, { text: "حُذفت الخطوة ٣.", description: "يمكن التراجع خلال ٣٠ ثانية", timeout: null });
    const toast = screen.getByRole("alertdialog", { name: "ملاحظة: حُذفت الخطوة ٣." });
    expect(document.getElementById(toast.getAttribute("aria-describedby")!)?.textContent).toBe("يمكن التراجع خلال ٣٠ ثانية");
    expect(screen.getByRole("region", { name: "الإشعارات" }).getAttribute("dir")).toBe("rtl");
  });
});
