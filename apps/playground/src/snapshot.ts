// Reading a snapshot back into the override layer.
//
// A snapshot on disk was written by an older version of this app as often
// as by the current one, so nothing here trusts its shape: a field that is
// missing or the wrong type falls back rather than reaching the app. Older
// snapshots may also carry a `parameters` field from the parameter model
// this app no longer has; it is ignored.
import type { Overrides } from "./tokenModel";

export type SnapshotState = {
  overrides: Overrides;
};

function overridesFrom(value: unknown): Overrides {
  if (typeof value !== "object" || value === null) return {};
  const out: Overrides = {};
  for (const [id, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text === "string") out[id] = text;
  }
  return out;
}

/** The overrides a snapshot restores. */
export function readSnapshot(snapshot: unknown): SnapshotState {
  const body = (typeof snapshot === "object" && snapshot !== null ? snapshot : {}) as Record<string, unknown>;
  return { overrides: overridesFrom(body.overrides) };
}
