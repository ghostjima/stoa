// @vitest-environment jsdom
// Dialog, Sheet, AlertDialog and the shortcuts dialog: roles and names,
// Escape, the focus trap and focus return, scroll lock, and the locale's
// words.
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AlertDialog, Button, Dialog, I18nProvider, Sheet, ShortcutList, ShortcutsDialog, UNSAFE_PortalProvider } from "./index";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("dir");
});

const ARABIC = "ar-u-nu-arab";

/** Focus a trigger and press it with Enter, as a keyboard user would, so
 * the trigger is the element focus returns to. */
function pressWithKeyboard(element: HTMLElement) {
  act(() => element.focus());
  fireEvent.keyDown(element, { key: "Enter" });
  fireEvent.keyUp(element, { key: "Enter" });
}

function DialogWithTrigger({ onSave = () => {} }: { onSave?: () => void }) {
  return (
    <Dialog
      title="Rename run"
      trigger={<Button>Rename</Button>}
      actions={(close) => (
        <>
          <Button onPress={close}>Keep name</Button>
          <Button
            variant="primary"
            onPress={() => {
              onSave();
              close();
            }}
          >
            Save
          </Button>
        </>
      )}
    >
      <p>The run keeps its history.</p>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens from its trigger as a modal dialog named by its title, with body, actions and a close button", () => {
    render(<DialogWithTrigger />);
    expect(screen.queryByRole("dialog")).toBeNull();
    pressWithKeyboard(screen.getByRole("button", { name: "Rename" }));
    const dialog = screen.getByRole("dialog", { name: "Rename run" });
    expect(screen.getByRole("heading", { level: 2, name: "Rename run" })).toBeTruthy();
    expect(within(dialog).getByText("The run keeps its history.")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeTruthy();
    expect(dialog.closest(".stoa-modal")).toBeTruthy();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<DialogWithTrigger />);
    const trigger = screen.getByRole("button", { name: "Rename" });
    pressWithKeyboard(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("keeps focus inside: Tab wraps from the last control to the first, and focus sent outside comes back", () => {
    render(
      <>
        <button type="button">Outside</button>
        <DialogWithTrigger />
      </>,
    );
    pressWithKeyboard(screen.getByRole("button", { name: "Rename" }));
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Close" });
    const save = within(dialog).getByRole("button", { name: "Save" });
    act(() => save.focus());
    fireEvent.keyDown(save, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(save);
    act(() => screen.getByRole("button", { name: "Outside", hidden: true }).focus());
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("locks the page's scroll while open", () => {
    render(<DialogWithTrigger />);
    expect(document.documentElement.style.overflow).toBe("");
    pressWithKeyboard(screen.getByRole("button", { name: "Rename" }));
    expect(document.documentElement.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("gives the actions a close function, and the close button closes too", async () => {
    const onSave = vi.fn();
    render(<DialogWithTrigger onSave={onSave} />);
    const trigger = screen.getByRole("button", { name: "Rename" });
    pressWithKeyboard(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    pressWithKeyboard(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on a press outside it, unless it is not dismissable", () => {
    const pressOutside = () => {
      const overlay = document.querySelector(".stoa-overlay")!;
      fireEvent.pointerDown(overlay, { button: 0, pointerId: 1 });
      fireEvent.pointerUp(overlay, { button: 0, pointerId: 1 });
      fireEvent.click(overlay);
    };
    const { unmount } = render(
      <Dialog title="Details" defaultOpen>
        <p>Body</p>
      </Dialog>,
    );
    pressOutside();
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    render(
      <Dialog title="Details" defaultOpen isDismissable={false}>
        <p>Body</p>
      </Dialog>,
    );
    pressOutside();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("opens and closes from the caller's state, reporting the change", () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onPress={() => setOpen(true)}>Details</Button>
          <Dialog title="Details" isOpen={open} onOpenChange={setOpen}>
            <p>Body</p>
          </Dialog>
        </>
      );
    }
    render(<Controlled />);
    pressWithKeyboard(screen.getByRole("button", { name: "Details" }));
    const dialog = screen.getByRole("dialog", { name: "Details" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says Close in the locale's words", () => {
    render(
      <I18nProvider locale={ARABIC}>
        <Dialog title="تفاصيل" defaultOpen>
          <p>نص</p>
        </Dialog>
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "إغلاق" })).toBeTruthy();
  });

  it("renders and names itself the same in a right-to-left page", () => {
    document.documentElement.dir = "rtl";
    render(
      <I18nProvider locale={ARABIC}>
        <Dialog title="تفاصيل" defaultOpen>
          <p>نص</p>
        </Dialog>
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "تفاصيل" });
    expect(dialog.closest(".stoa-overlay")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Sheet", () => {
  it("is a modal dialog from the inline end by default on a wide screen, and from the bottom when asked", () => {
    const { unmount } = render(
      <Sheet title="Filters" defaultOpen>
        <p>Venue</p>
      </Sheet>,
    );
    let dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog.closest(".stoa-sheet")?.className).toContain("stoa-sheet--auto");
    expect(dialog.closest(".stoa-overlay")?.className).toContain("stoa-overlay--sheet");
    unmount();
    render(
      <Sheet title="Filters" placement="bottom" defaultOpen>
        <p>Venue</p>
      </Sheet>,
    );
    dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog.closest(".stoa-sheet")?.className).toContain("stoa-sheet--bottom");
  });

  it("traps focus, closes on Escape and returns focus to its trigger, as a Dialog does", async () => {
    render(
      <Sheet title="Filters" placement="end" trigger={<Button>Filter</Button>}>
        <Button>Apply</Button>
      </Sheet>,
    );
    const trigger = screen.getByRole("button", { name: "Filter" });
    pressWithKeyboard(trigger);
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    const apply = within(dialog).getByRole("button", { name: "Apply" });
    act(() => apply.focus());
    fireEvent.keyDown(apply, { key: "Tab" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Close" }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("AlertDialog", () => {
  function Confirm({
    onConfirm = () => {},
    onCancel,
    tone,
    autoFocus,
  }: {
    onConfirm?: () => void;
    onCancel?: () => void;
    tone?: "destructive" | "neutral";
    autoFocus?: "cancel" | "confirm";
  }) {
    return (
      <AlertDialog
        title="Delete this run?"
        confirmLabel="Delete run"
        tone={tone}
        autoFocus={autoFocus}
        onConfirm={onConfirm}
        onCancel={onCancel}
        trigger={<Button>Delete</Button>}
      >
        <p>Its history cannot be restored.</p>
      </AlertDialog>
    );
  }

  it("is an alertdialog named by its title, with focus on the safe action", () => {
    render(<Confirm tone="destructive" />);
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete this run?" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("draws a destructive primary action in the negative style, a neutral one in the primary style", () => {
    const { unmount } = render(<Confirm tone="destructive" />);
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Delete run" }).className).toContain("stoa-button--danger");
    unmount();
    render(<Confirm tone="neutral" />);
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    const confirm = screen.getByRole("button", { name: "Delete run" });
    expect(confirm.className).toContain("stoa-button--primary");
    expect(confirm.className).not.toContain("stoa-button--danger");
  });

  it("can start on the primary action where confirming is harmless", () => {
    render(<Confirm autoFocus="confirm" />);
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete run" }));
  });

  it("confirms and closes from the primary action, and returns focus to the trigger", async () => {
    const onConfirm = vi.fn();
    render(<Confirm onConfirm={onConfirm} />);
    const trigger = screen.getByRole("button", { name: "Delete" });
    pressWithKeyboard(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Delete run" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("cancels on the safe action and on Escape without confirming", () => {
    const onConfirm = vi.fn();
    render(<Confirm onConfirm={onConfirm} />);
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel on the safe action and on Escape, and only onConfirm on the primary action", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<Confirm onConfirm={onConfirm} onCancel={onCancel} />);
    const trigger = screen.getByRole("button", { name: "Delete" });
    pressWithKeyboard(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    pressWithKeyboard(trigger);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
    pressWithKeyboard(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Delete run" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledTimes(2);
    // A confirmation earlier does not count for the next opening.
    pressWithKeyboard(trigger);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("calls onCancel when opened by state, and not when the caller closes it", () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            Close from outside
          </button>
          <AlertDialog
            title="Leave the run?"
            confirmLabel="Leave"
            onConfirm={() => {}}
            onCancel={onCancel}
            isOpen={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          >
            <p>Unsaved marks are lost.</p>
          </AlertDialog>
        </>
      );
    }
    const { unmount } = render(<Controlled />);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    unmount();
    onCancel.mockClear();
    render(<Controlled />);
    act(() => screen.getByRole("button", { name: "Close from outside", hidden: true }).click());
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("does not close on a press outside it", () => {
    render(<Confirm />);
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    const overlay = document.querySelector(".stoa-overlay")!;
    fireEvent.pointerDown(overlay, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(overlay, { button: 0, pointerId: 1 });
    fireEvent.click(overlay);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("keeps Tab between its two actions", () => {
    render(<Confirm />);
    pressWithKeyboard(screen.getByRole("button", { name: "Delete" }));
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Delete run" });
    fireEvent.keyDown(cancel, { key: "Tab" });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(confirm, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
  });

  it("says Cancel in the locale's words, unless given its own", () => {
    document.documentElement.dir = "rtl";
    const { unmount } = render(
      <I18nProvider locale={ARABIC}>
        <AlertDialog title="حذف؟" confirmLabel="حذف" onConfirm={() => {}} defaultOpen>
          <p>لا يمكن التراجع.</p>
        </AlertDialog>
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeTruthy();
    unmount();
    render(
      <AlertDialog title="Leave?" confirmLabel="Leave" cancelLabel="Stay" onConfirm={() => {}} defaultOpen>
        <p>Unsaved changes are lost.</p>
      </AlertDialog>,
    );
    expect(screen.getByRole("button", { name: "Stay" })).toBeTruthy();
  });
});

describe("shortcuts", () => {
  const GROUPS = [
    {
      title: "Playback",
      shortcuts: [
        { keys: ["Space"], description: "Play or pause" },
        { keys: ["Shift", "→"], description: "Step forward" },
      ],
    },
    { title: "Help", shortcuts: [{ keys: ["?"], description: "Show shortcuts" }] },
  ];

  it("lists each group as a named section, keys under each term, as nested kbd elements", () => {
    const { container } = render(<ShortcutList groups={GROUPS} />);
    const playback = screen.getByRole("region", { name: "Playback" });
    expect(screen.getByRole("heading", { level: 3, name: "Help" })).toBeTruthy();
    const terms = [...playback.querySelectorAll("dt")];
    expect(terms.map((dt) => dt.textContent)).toEqual(["Space", "Shift+→"]);
    expect([...playback.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(["Play or pause", "Step forward"]);
    const outer = terms[1]!.querySelector("kbd")!;
    expect(outer.getAttribute("dir")).toBe("ltr");
    expect([...outer.querySelectorAll("kbd.stoa-kbd")].map((kbd) => kbd.textContent)).toEqual(["Shift", "→"]);
    expect(container.querySelectorAll(".stoa-kbd")).toHaveLength(4);
  });

  it("keeps key names left to right in a right-to-left page", () => {
    document.documentElement.dir = "rtl";
    render(<ShortcutList groups={GROUPS} />);
    expect(screen.getByRole("region", { name: "Playback" }).querySelector("kbd")!.getAttribute("dir")).toBe("ltr");
  });

  it("opens as a dialog from its trigger and closes on Escape", async () => {
    render(<ShortcutsDialog title="Keyboard shortcuts" groups={GROUPS} trigger={<Button>Shortcuts</Button>} />);
    const trigger = screen.getByRole("button", { name: "Shortcuts" });
    pressWithKeyboard(trigger);
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(dialog).getByRole("region", { name: "Help" })).toBeTruthy();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("UNSAFE_PortalProvider from stoa-react", () => {
  it("puts Stoa's overlays into the container it names, the same React Aria context Stoa's components read", () => {
    const frame = document.createElement("div");
    document.body.appendChild(frame);
    render(
      <UNSAFE_PortalProvider getContainer={() => frame}>
        <Dialog title="Order details" defaultOpen>
          <p>Limit 101.50</p>
        </Dialog>
      </UNSAFE_PortalProvider>,
    );
    expect(frame.contains(screen.getByRole("dialog", { name: "Order details" }))).toBe(true);
    frame.remove();
  });
});
