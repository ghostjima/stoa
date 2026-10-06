import { describe, expect, it } from "vitest";
import {
  COALESCE_MS,
  canRedo,
  canUndo,
  clearAll,
  clearOverride,
  commit,
  emptyHistory,
  endEdit,
  redo,
  setOverride,
  undo,
} from "./history";

describe("the override history", () => {
  it("steps back and forward through edits", () => {
    let history = setOverride(emptyHistory(), "primitive:color.teal.600", "oklch(0.5 0.2 160)");
    history = setOverride(history, "primitive:color.red.600", "oklch(0.5 0.2 20)");
    expect(Object.keys(history.present)).toHaveLength(2);

    history = undo(history);
    expect(history.present).toEqual({ "primitive:color.teal.600": "oklch(0.5 0.2 160)" });
    expect(canRedo(history)).toBe(true);

    history = redo(history);
    expect(Object.keys(history.present)).toHaveLength(2);
    expect(canRedo(history)).toBe(false);
  });

  it("does not record an edit that changes nothing", () => {
    const first = setOverride(emptyHistory(), "primitive:radius.md", "6px");
    const again = setOverride(first, "primitive:radius.md", "6px");
    expect(again).toBe(first);
    expect(again.past).toHaveLength(1);
  });

  it("drops the future when a new edit follows an undo", () => {
    let history = setOverride(emptyHistory(), "primitive:radius.md", "6px");
    history = undo(history);
    history = setOverride(history, "primitive:radius.lg", "10px");
    expect(canRedo(history)).toBe(false);
    expect(history.present).toEqual({ "primitive:radius.lg": "10px" });
  });

  it("resets one override and all of them, each as one step back", () => {
    let history = setOverride(emptyHistory(), "primitive:radius.md", "6px");
    history = setOverride(history, "primitive:radius.lg", "10px");
    history = clearOverride(history, "primitive:radius.md");
    expect(history.present).toEqual({ "primitive:radius.lg": "10px" });

    history = clearAll(history);
    expect(history.present).toEqual({});
    expect(undo(history).present).toEqual({ "primitive:radius.lg": "10px" });
  });

  it("makes one step of the keystrokes typed into one field", () => {
    const id = "primitive:color.teal.600";
    let history = setOverride(emptyHistory(), id, "oklch(", { at: 1000 });
    history = setOverride(history, id, "oklch(0.5", { at: 1100 });
    history = setOverride(history, id, "oklch(0.5 0.2 160)", { at: 1300 });

    expect(history.past).toHaveLength(1);
    expect(history.present).toEqual({ [id]: "oklch(0.5 0.2 160)" });
    expect(undo(history).present).toEqual({});
  });

  it("starts a new step after a pause in one field", () => {
    const id = "primitive:radius.md";
    let history = setOverride(emptyHistory(), id, "6px", { at: 1000 });
    history = setOverride(history, id, "7px", { at: 1000 + COALESCE_MS });

    expect(history.past).toHaveLength(2);
    expect(undo(history).present).toEqual({ [id]: "6px" });
  });

  it("keeps each field's edits to itself", () => {
    let history = setOverride(emptyHistory(), "primitive:radius.md", "6px", { at: 1000 });
    history = setOverride(history, "primitive:radius.lg", "10px", { at: 1010 });
    history = setOverride(history, "primitive:radius.md", "7px", { at: 1020 });

    expect(history.past).toHaveLength(3);
  });

  it("makes one step of a slider drag, however long it lasts", () => {
    const id = "density:compact.rowHeight";
    let history = setOverride(emptyHistory(), id, "24px", { at: 1000, held: true });
    for (const [index, value] of ["25px", "26px", "27px"].entries()) {
      // Far enough apart that a pause would otherwise split the drag.
      history = setOverride(history, id, value, { at: 1000 + (index + 1) * (COALESCE_MS * 3), held: true });
    }
    history = endEdit(history, 9000);

    expect(history.past).toHaveLength(1);
    expect(history.present).toEqual({ [id]: "27px" });
    expect(undo(history).present).toEqual({});
  });

  it("ends the step when the drag is released, so the next drag is its own", () => {
    const id = "density:compact.rowHeight";
    let history = setOverride(emptyHistory(), id, "24px", { at: 1000, held: true });
    history = endEdit(history, 1200);
    history = setOverride(history, id, "30px", { at: 1200 + COALESCE_MS, held: true });

    expect(history.past).toHaveLength(2);
    expect(undo(history).present).toEqual({ [id]: "24px" });
  });

  it("does not fold an edit into the step an undo just left", () => {
    const id = "primitive:radius.md";
    let history = setOverride(emptyHistory(), id, "6px", { at: 1000 });
    history = undo(history);
    history = setOverride(history, id, "8px", { at: 1010 });

    expect(history.past).toHaveLength(1);
    expect(undo(history).present).toEqual({});
  });

  it("ends nothing when no gesture is open", () => {
    const history = setOverride(emptyHistory(), "primitive:radius.md", "6px", { at: 1000 });
    expect(endEdit(history, 1100)).toBe(history);
    expect(endEdit(emptyHistory(), 1100)).toEqual(emptyHistory());
  });

  it("has nothing to undo or redo when empty", () => {
    const history = emptyHistory();
    expect(canUndo(history)).toBe(false);
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
    expect(commit(history, {})).toBe(history);
    expect(clearAll(history)).toBe(history);
  });
});
