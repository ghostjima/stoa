// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nProvider, Kbd, ShortcutList, groupShortcuts, matchesShortcut, shortcutKeys, useShortcuts, type Shortcut, type ShortcutHelp } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SPACE = { keySpace: "Space" };
const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

describe("Kbd", () => {
  it("draws one key as a kbd element", () => {
    const { container } = render(<Kbd>Esc</Kbd>);
    const kbd = container.querySelector("kbd")!;
    expect(kbd.className).toBe("stoa-kbd");
    expect(kbd.textContent).toBe("Esc");
  });

  it("draws a combination as a kbd of kbds, left to right even in a right-to-left page", () => {
    const { container } = render(
      <div dir="rtl">
        <Kbd keys={["Ctrl", "Shift", "K"]} />
      </div>,
    );
    const combo = container.querySelector(".stoa-kbd-combo")!;
    expect(combo.tagName).toBe("KBD");
    expect(combo.getAttribute("dir")).toBe("ltr");
    expect([...combo.querySelectorAll(".stoa-kbd")].map((k) => k.textContent)).toEqual(["Ctrl", "Shift", "K"]);
    expect(combo.textContent).toBe("Ctrl+Shift+K");
  });
});

describe("shortcutKeys", () => {
  it("names the keys in the platform's order and symbols", () => {
    const shortcut = { key: "k", modifiers: ["shift", "mod"] as Shortcut["modifiers"] };
    expect(shortcutKeys(shortcut, false, SPACE)).toEqual(["Ctrl", "Shift", "K"]);
    expect(shortcutKeys(shortcut, true, SPACE)).toEqual(["⇧", "⌘", "K"]);
    expect(shortcutKeys({ key: "ArrowLeft", modifiers: ["alt"] }, false, SPACE)).toEqual(["Alt", "←"]);
    expect(shortcutKeys({ key: "Escape" }, false, SPACE)).toEqual(["Esc"]);
    expect(shortcutKeys({ key: "?" }, false, SPACE)).toEqual(["?"]);
  });

  it("names the space bar in the locale's words", () => {
    expect(shortcutKeys({ key: " " }, false, { keySpace: "مسافة" })).toEqual(["مسافة"]);
  });
});

describe("matchesShortcut", () => {
  it("needs exactly the modifiers listed, with mod as Control or Command", () => {
    const save = { key: "s", modifiers: ["mod"] as Shortcut["modifiers"] };
    expect(matchesShortcut(key({ key: "s", ctrlKey: true }), save, false)).toBe(true);
    expect(matchesShortcut(key({ key: "s", metaKey: true }), save, false)).toBe(false);
    expect(matchesShortcut(key({ key: "s", metaKey: true }), save, true)).toBe(true);
    expect(matchesShortcut(key({ key: "s", ctrlKey: true, altKey: true }), save, false)).toBe(false);
    expect(matchesShortcut(key({ key: "s" }), save, false)).toBe(false);
  });

  it("compares Shift for letters but not for a symbol that needs it", () => {
    expect(matchesShortcut(key({ key: "K", shiftKey: true }), { key: "k" }, false)).toBe(false);
    expect(matchesShortcut(key({ key: "K", shiftKey: true }), { key: "k", modifiers: ["shift"] }, false)).toBe(true);
    expect(matchesShortcut(key({ key: "?", shiftKey: true }), { key: "?" }, false)).toBe(true);
  });

  it("matches a Latin letter by its position on another layout, but not a different Latin letter", () => {
    expect(matchesShortcut(key({ key: "л", code: "KeyK" }), { key: "k" }, false)).toBe(true);
    expect(matchesShortcut(key({ key: "ن", code: "KeyK" }), { key: "k" }, false)).toBe(true);
    // AZERTY: the key labelled A sits where Q is on QWERTY.
    expect(matchesShortcut(key({ key: "a", code: "KeyQ" }), { key: "q" }, false)).toBe(false);
  });
});

function Harness({ shortcuts, onHelp, children }: { shortcuts: Shortcut[]; onHelp?: (help: ReturnType<typeof useShortcuts>) => void; children?: ReactNode }) {
  const help = useShortcuts(shortcuts);
  onHelp?.(help);
  return <>{children}</>;
}

describe("useShortcuts", () => {
  it("runs a shortcut and prevents the key's default action", () => {
    const onTrigger = vi.fn();
    render(<Harness shortcuts={[{ key: " ", description: "Play or pause", onTrigger }]} />);
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(onTrigger).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores typing in a text field, unless the shortcut allows it", () => {
    const play = vi.fn();
    const find = vi.fn();
    render(
      <Harness
        shortcuts={[
          { key: "p", description: "Play", onTrigger: play },
          { key: "f", modifiers: ["ctrl"], description: "Find", onTrigger: find, allowInFields: true },
        ]}
      >
        <input aria-label="Symbol" />
        <textarea aria-label="Note" />
        <div contentEditable suppressContentEditableWarning>
          <span>editable</span>
        </div>
        <input type="checkbox" aria-label="Live" />
      </Harness>,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Symbol" }), { key: "p" });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Note" }), { key: "p" });
    fireEvent.keyDown(screen.getByText("editable"), { key: "p" });
    expect(play).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Live" }), { key: "p" });
    expect(play).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Symbol" }), { key: "f", ctrlKey: true });
    expect(find).toHaveBeenCalledOnce();
  });

  it("leaves alone a key a control already handled, and a disabled shortcut", () => {
    const onTrigger = vi.fn();
    const live = vi.fn();
    render(
      <Harness
        shortcuts={[
          { key: "ArrowRight", description: "Step forward", onTrigger },
          { key: "l", description: "Go live", onTrigger: live, isDisabled: true },
        ]}
      />,
    );
    const handled = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(onTrigger).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "l" });
    expect(live).not.toHaveBeenCalled();
  });

  it("stops listening when unmounted or disabled", () => {
    const onTrigger = vi.fn();
    const { result, unmount } = renderHook(({ enabled }) => useShortcuts([{ key: "j", description: "Back", onTrigger }], { enabled }), {
      initialProps: { enabled: false },
    });
    fireEvent.keyDown(document.body, { key: "j" });
    expect(onTrigger).not.toHaveBeenCalled();
    expect(result.current).toHaveLength(1);
    unmount();
    fireEvent.keyDown(document.body, { key: "j" });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("calls the newest callback without listening again", () => {
    const first = vi.fn();
    const second = vi.fn();
    const add = vi.spyOn(document, "addEventListener");
    const { rerender } = render(<Harness shortcuts={[{ key: "j", description: "Back", onTrigger: first }]} />);
    rerender(<Harness shortcuts={[{ key: "j", description: "Back", onTrigger: second }]} />);
    fireEvent.keyDown(document.body, { key: "j" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
  });

  it("lists the shortcuts for a help dialog, in the locale's words", () => {
    let help: ReturnType<typeof useShortcuts> = [];
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <Harness
          onHelp={(h) => (help = h)}
          shortcuts={[
            { key: " ", description: "تشغيل أو إيقاف", group: "التشغيل", onTrigger: () => {} },
            { key: "k", modifiers: ["ctrl"], description: "بحث", onTrigger: () => {}, isDisabled: true },
          ]}
        />
      </I18nProvider>,
    );
    expect(help).toEqual([
      { keys: ["مسافة"], description: "تشغيل أو إيقاف", group: "التشغيل", isDisabled: false },
      { keys: ["Ctrl", "K"], description: "بحث", group: undefined, isDisabled: true },
    ]);
  });
});

describe("groupShortcuts and ShortcutList", () => {
  const help: ShortcutHelp[] = [
    { keys: ["?"], description: "Show shortcuts", isDisabled: false },
    { keys: ["Space"], description: "Play or pause", group: "Playback", isDisabled: false },
    { keys: ["Ctrl", "K"], description: "Search", group: "Find", isDisabled: true },
    { keys: ["→"], description: "Step forward", group: "Playback", isDisabled: false },
  ];

  it("groups help lines in the order each group first appears, ungrouped lines last", () => {
    const groups = groupShortcuts(help, "Other");
    expect(groups.map((g) => g.title)).toEqual(["Playback", "Find", "Other"]);
    expect(groups[0]!.shortcuts.map((s) => s.description)).toEqual(["Play or pause", "Step forward"]);
    expect(groupShortcuts(help.slice(1), "Other").map((g) => g.title)).toEqual(["Playback", "Find"]);
  });

  it("draws the help lines with Kbd and marks a disabled shortcut", () => {
    const { container } = render(<ShortcutList groups={groupShortcuts(help, "Other")} />);
    const find = screen.getByRole("region", { name: "Find" });
    expect(find.querySelector("dt kbd")!.className).toBe("stoa-kbd-combo");
    expect(find.querySelector(".stoa-shortcuts__row")!.hasAttribute("data-disabled")).toBe(true);
    expect(container.querySelectorAll(".stoa-shortcuts__row[data-disabled]")).toHaveLength(1);
  });
});
