// @vitest-environment jsdom
// ReorderableList and StepList: roles and names, the move and remove
// buttons, announcements, focus at the ends of the list, every step
// status, and the locale's words and digits.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Button, I18nProvider, ReorderableList, StepList, type ReorderableItem, type Step } from "./index";
import { reorderItems } from "./ReorderableList";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("dir");
});

const ARABIC = "ar-u-nu-arab";

const START: ReorderableItem[] = [
  { id: "a", textValue: "Fetch" },
  { id: "b", textValue: "Parse" },
  { id: "c", textValue: "Check" },
];

function List({ initial = START, removable = false, allowsDragging = true }: { initial?: ReorderableItem[]; removable?: boolean; allowsDragging?: boolean }) {
  const [items, setItems] = useState(initial);
  return (
    <ReorderableList
      label="Pipeline"
      items={items}
      onReorder={setItems}
      onRemove={removable ? (item) => setItems((all) => all.filter((other) => other.id !== item.id)) : undefined}
      allowsDragging={allowsDragging}
      renderItem={(item) => <span>{item.textValue}</span>}
    />
  );
}

const order = () => screen.getAllByRole("row").map((row) => row.querySelector(".stoa-reorder__content")?.textContent);
const status = () => document.querySelector(".stoa-reorder [role=status]")?.textContent;

describe("ReorderableList", () => {
  it("is a grid named by its label, one row per item, with move buttons named after each item", () => {
    render(<List />);
    const grid = screen.getByRole("grid", { name: "Pipeline" });
    expect(within(grid).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Move up: Parse" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move down: Parse" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("disables Move up on the first item and Move down on the last", () => {
    render(<List />);
    expect(screen.getByRole("button", { name: "Move up: Fetch" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Move down: Fetch" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Move down: Check" }).hasAttribute("disabled")).toBe(true);
  });

  it("moves an item with its buttons and announces its new position politely", () => {
    render(<List />);
    fireEvent.click(screen.getByRole("button", { name: "Move down: Fetch" }));
    expect(order()).toEqual(["Parse", "Fetch", "Check"]);
    expect(status()).toBe("Fetch moved to position 2 of 3.");
    fireEvent.click(screen.getByRole("button", { name: "Move up: Check" }));
    expect(order()).toEqual(["Parse", "Check", "Fetch"]);
    expect(status()).toBe("Check moved to position 2 of 3.");
  });

  it("moves an item from the keyboard: Enter on its focused button", () => {
    render(<List />);
    const down = screen.getByRole("button", { name: "Move down: Parse" });
    act(() => down.focus());
    fireEvent.keyDown(down, { key: "Enter" });
    fireEvent.keyUp(down, { key: "Enter" });
    expect(order()).toEqual(["Fetch", "Check", "Parse"]);
  });

  it("sends focus to the other move button when a move reaches an end of the list", () => {
    render(<List />);
    const down = screen.getByRole("button", { name: "Move down: Parse" });
    act(() => down.focus());
    fireEvent.click(down);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move up: Parse" }));
    const up = screen.getByRole("button", { name: "Move up: Fetch" });
    expect(up.hasAttribute("disabled")).toBe(true);
    const upCheck = screen.getByRole("button", { name: "Move up: Check" });
    act(() => upCheck.focus());
    fireEvent.click(upCheck);
    expect(order()).toEqual(["Check", "Fetch", "Parse"]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move down: Check" }));
  });

  it("removes an item with its own Remove button and announces it", () => {
    render(<List removable />);
    fireEvent.click(screen.getByRole("button", { name: "Remove: Parse" }));
    expect(order()).toEqual(["Fetch", "Check"]);
    expect(status()).toBe("Parse removed.");
  });

  it("gives each row a drag button when dragging is on, and none when it is off", () => {
    const { container, unmount } = render(<List />);
    expect(container.querySelectorAll('.stoa-reorder__handle')).toHaveLength(3);
    expect(screen.getAllByRole("row")[0]!.dataset.allowsDragging).toBe("true");
    unmount();
    const off = render(<List allowsDragging={false} />);
    expect(off.container.querySelector(".stoa-reorder__handle")).toBeNull();
  });

  it("drags an item from the keyboard: Enter on its drag button, an arrow to the drop target, Enter to drop", async () => {
    render(<List />);
    const handle = screen.getByRole("button", { name: "Drag Fetch" });
    act(() => handle.focus());
    fireEvent.keyDown(handle, { key: "Enter" });
    fireEvent.keyUp(handle, { key: "Enter" });
    // React Aria moves focus to the first drop target after a timeout.
    await waitFor(() => expect(document.activeElement).not.toBe(handle));
    const target = () => document.activeElement as HTMLElement;
    fireEvent.keyDown(target(), { key: "ArrowDown" });
    fireEvent.keyUp(target(), { key: "ArrowDown" });
    expect(target().getAttribute("aria-label")).toBe("Insert between Parse and Check");
    fireEvent.keyDown(target(), { key: "Enter" });
    fireEvent.keyUp(target(), { key: "Enter" });
    await waitFor(() => expect(order()).toEqual(["Parse", "Fetch", "Check"]));
    expect(status()).toBe("Fetch moved to position 2 of 3.");
  });

  it("moves between rows with the arrow keys", () => {
    render(<List />);
    const [first, second] = screen.getAllByRole("row");
    act(() => first!.focus());
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second);
  });

  it("moves into a row's buttons with the arrow toward the end of the line, reversed in right-to-left", () => {
    render(<List allowsDragging={false} />);
    let row = screen.getAllByRole("row")[1]!;
    act(() => row.focus());
    fireEvent.keyDown(row, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move up: Parse" }));
    cleanup();
    document.documentElement.dir = "rtl";
    render(
      <I18nProvider locale={ARABIC}>
        <List allowsDragging={false} />
      </I18nProvider>,
    );
    row = screen.getAllByRole("row")[1]!;
    act(() => row.focus());
    fireEvent.keyDown(row, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "تحريك للأعلى: Parse" }));
  });

  it("says when it has no items", () => {
    render(<List initial={[]} />);
    expect(screen.getByRole("grid", { name: "Pipeline" }).textContent).toBe("No items.");
  });

  it("names its buttons and announces moves in the locale's words and digits, in a right-to-left page", () => {
    document.documentElement.dir = "rtl";
    render(
      <I18nProvider locale={ARABIC}>
        <List removable />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "تحريك للأعلى: Parse" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "إزالة: Parse" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "تحريك للأسفل: Fetch" }));
    expect(status()).toBe("نُقل Fetch إلى الموضع ٢ من ٣.");
  });

  it("says an empty list in the locale's words", () => {
    render(
      <I18nProvider locale={ARABIC}>
        <List initial={[]} />
      </I18nProvider>,
    );
    expect(screen.getByRole("grid").textContent).toBe("لا عناصر.");
  });
});

describe("reorderItems (the drop handler)", () => {
  it("puts the dragged items before or after the target, in their order", () => {
    const ids = (items: ReorderableItem[]) => items.map((item) => item.id);
    expect(ids(reorderItems(START, new Set(["a"]), "c", "after"))).toEqual(["b", "c", "a"]);
    expect(ids(reorderItems(START, new Set(["c"]), "a", "before"))).toEqual(["c", "a", "b"]);
    expect(ids(reorderItems(START, new Set(["a", "b"]), "c", "after"))).toEqual(["c", "a", "b"]);
    expect(ids(reorderItems(START, new Set(["a"]), "missing", "after"))).toEqual(["a", "b", "c"]);
  });
});

const STEPS: Step[] = [
  { id: "1", title: "Fetch prices", status: "done" },
  { id: "2", title: "Parse book", status: "running", progress: 0.5, explanation: "Level 2 of 4" },
  { id: "3", title: "Choose venue", status: "awaiting", actions: <Button>Approve</Button> },
  { id: "4", title: "Send order", status: "waiting" },
  { id: "5", title: "Hedge", status: "skipped" },
  { id: "6", title: "Rebalance", status: "undone" },
  { id: "7", title: "Report", status: "error", explanation: "The report service did not answer." },
];

describe("StepList", () => {
  it("is a named, ordered list with one numbered item per step", () => {
    render(<StepList label="Order steps" steps={STEPS} />);
    const list = screen.getByRole("list", { name: "Order steps" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(items.map((item) => item.querySelector(".stoa-step__number")?.textContent)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("shows every status as a symbol, hidden from assistive technology, and a word", () => {
    render(<StepList label="Order steps" steps={STEPS} />);
    const statuses = [...document.querySelectorAll(".stoa-step__status")];
    expect(statuses.map((s) => s.textContent)).toEqual([
      "✓ Done",
      "◐ Running",
      "? Awaiting decision",
      "○ Waiting",
      "↷ Skipped",
      "↺ Undone",
      "✗ Error",
    ]);
    for (const s of statuses) expect(s.querySelector(".stoa-step__symbol")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getAllByRole("listitem").map((item) => item.className)).toEqual(STEPS.map((step) => `stoa-step stoa-step--${step.status}`));
  });

  it("shows the explanation, the actions and a progress bar named by the step's title", () => {
    render(<StepList label="Order steps" steps={STEPS} />);
    expect(screen.getByText("Level 2 of 4").className).toBe("stoa-step__explanation");
    const progress = screen.getByRole("progressbar", { name: "Parse book" });
    expect(progress.getAttribute("aria-valuenow")).toBe("50");
    expect(progress.textContent).toBe("50%");
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    const choose = screen.getAllByRole("listitem")[2]!;
    expect(within(choose).getByRole("button", { name: "Approve" })).toBeTruthy();
  });

  it("says statuses and numbers in the locale's words and digits, in a right-to-left page", () => {
    document.documentElement.dir = "rtl";
    render(
      <I18nProvider locale={ARABIC}>
        <StepList label="الخطوات" steps={STEPS} />
      </I18nProvider>,
    );
    const statuses = [...document.querySelectorAll(".stoa-step__status")].map((s) => s.textContent?.slice(2));
    expect(statuses).toEqual(["تم", "قيد التنفيذ", "بانتظار قرار", "في الانتظار", "تم التخطي", "تم التراجع", "خطأ"]);
    expect(screen.getAllByRole("listitem")[6]!.querySelector(".stoa-step__number")?.textContent).toBe("٧");
    // ICU puts an Arabic letter mark after the percent sign.
    expect(screen.getByRole("progressbar").textContent?.replace("\u061c", "")).toBe("٥٠٪");
  });

  it("becomes a ReorderableList with `reorderable`, reporting steps in their new order", () => {
    const onReorder = vi.fn();
    const onRemove = vi.fn();
    render(<StepList label="Order steps" steps={STEPS.slice(0, 3)} reorderable onReorder={onReorder} onRemove={onRemove} />);
    const grid = screen.getByRole("grid", { name: "Order steps" });
    expect(within(grid).getAllByRole("row")[1]!.className).toContain("stoa-step--running");
    fireEvent.click(screen.getByRole("button", { name: "Move up: Parse book" }));
    expect(onReorder).toHaveBeenCalledWith([STEPS[1], STEPS[0], STEPS[2]]);
    fireEvent.click(screen.getByRole("button", { name: "Remove: Choose venue" }));
    expect(onRemove).toHaveBeenCalledWith(STEPS[2]);
  });

  it("names a reorderable step by its text value when its title is not a string", () => {
    render(
      <StepList
        label="Proof"
        reorderable
        steps={[
          { id: "x", title: <em>Expand</em>, textValue: "Expand", status: "done" },
          { id: "y", title: <em>Collect terms</em>, status: "waiting" },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Move down: Expand" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move up: y" })).toBeTruthy();
  });

  it("pulses a running step only on the motion tokens, and not under reduced motion", () => {
    // jsdom applies no stylesheet; the rules themselves are the contract.
    // Reduced motion (the media query or data-motion="reduce") sets every
    // duration token to 0ms in tokens.css, which stops the pulse; no rule
    // here overrides the animation itself.
    const css = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");
    const tokens = readFileSync(join(import.meta.dirname, "../../tokens/dist/tokens.css"), "utf8");
    const running = ".stoa-step__status--running .stoa-step__symbol";
    expect(css).toContain(`${running} {\n  animation: stoa-pulse var(--stoa-motion-duration-flash) var(--stoa-motion-easing-standard) infinite alternate;`);
    expect(tokens).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*--stoa-motion-duration-flash: 0ms;/);
    expect(tokens).toMatch(/\[data-motion="reduce"\] \{[^}]*--stoa-motion-duration-flash: 0ms;/);
  });
});
