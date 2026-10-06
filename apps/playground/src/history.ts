// The override layer with undo and redo. Every edit replaces the whole
// override map, so a step back is one map back: the base is never touched.
//
// A step is a change a person would want back, not a keystroke: edits to
// the same field join the step that is still open for it, so typing a
// colour is one step and a slider drag is one step, not one per character
// or per pixel.
import type { Overrides } from "./tokenModel";

/** How long after an edit to a field the next edit to that field still
 * belongs to the same step. A longer pause starts a new one. */
export const COALESCE_MS = 500;

/** The step still taking edits: which field, when it last took one, and
 * whether it is held open by a gesture in progress (a slider drag), which
 * stays one step however long the drag lasts. */
type OpenStep = { id: string; at: number; held: boolean };

export type History = {
  past: Overrides[];
  present: Overrides;
  future: Overrides[];
  open: OpenStep | null;
};

/** When an edit arrives: the moment it happened, and whether it is part of
 * a gesture that has not ended yet. */
export type EditOptions = { at?: number; held?: boolean };

export const emptyHistory = (): History => ({ past: [], present: {}, future: [], open: null });

function same(a: Overrides, b: Overrides): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

/** Record a new override map as its own step. An edit that changes nothing
 * is not a step. */
export function commit(history: History, next: Overrides): History {
  if (same(history.present, next)) return history;
  return { past: [...history.past, history.present], present: next, future: [], open: null };
}

export const canUndo = (history: History) => history.past.length > 0;
export const canRedo = (history: History) => history.future.length > 0;

export function undo(history: History): History {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    open: null,
  };
}

export function redo(history: History): History {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return { past: [...history.past, history.present], present: next, future: rest, open: null };
}

/** Set one token's override. Consecutive edits to the same field are one
 * step while its step is open: within `COALESCE_MS` of the last edit, or
 * for as long as a gesture holds it open. */
export function setOverride(history: History, id: string, value: string, options: EditOptions = {}): History {
  const { at = Date.now(), held = false } = options;
  const next = { ...history.present, [id]: value };
  if (same(history.present, next)) return history;
  const open = history.open;
  const joins = open !== null && open.id === id && (open.held || at - open.at < COALESCE_MS);
  return {
    past: joins ? history.past : [...history.past, history.present],
    present: next,
    future: [],
    open: { id, at, held },
  };
}

/** The gesture ended: the slider was released. The step stops being held
 * open, so the next edit joins it only if it comes within `COALESCE_MS`. */
export function endEdit(history: History, at = Date.now()): History {
  const open = history.open;
  if (open === null || !open.held) return history;
  return { ...history, open: { ...open, at, held: false } };
}

export function clearOverride(history: History, id: string): History {
  const next = { ...history.present };
  delete next[id];
  return commit(history, next);
}

export function clearAll(history: History): History {
  return commit(history, {});
}
