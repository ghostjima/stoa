import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../screenText";
import { DATA_STATES, SCREENS } from "./model";
import { COMPONENT_WORDS } from "./words";

/** Every leaf of a dictionary as [path, value]: strings, arrays of
 * strings, and functions, which are called with sample arguments. */
function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") {
    // Counts and formatted numbers: 1 and 5 cover the plural forms that
    // differ in Russian; the text arguments stand for numbers and times.
    const fn = value as (...args: unknown[]) => string;
    return [1, 5].map((n) => [`${path}(${n})`, fn.length === 2 && path.endsWith("depthValue") ? fn(n, String(n)) : fn(String(n), String(n))]);
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => leaves(item, `${path}[${index}]`));
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  }
  throw new Error(`${path}: not a word`);
}

/** The shape of a dictionary: every key path, with array lengths. */
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`];
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => shape(item, path ? `${path}.${key}` : key));
  }
  return [`${path}:${typeof value}`];
}

const isSentenceKey = (path: string) => /Text(\(\d+\))?$/.test(path.replace(/\[\d+\]$/, ""));

describe("the component screens' words", () => {
  it("have the same keys, kinds and list lengths in every language", () => {
    const english = shape(COMPONENT_WORDS.en).sort();
    for (const { id } of LANGUAGES) expect(shape(COMPONENT_WORDS[id]).sort(), id).toEqual(english);
  });

  it("are never empty", () => {
    for (const { id } of LANGUAGES) {
      for (const [path, text] of leaves(COMPONENT_WORDS[id])) expect(text.trim(), `${id} ${path}`).not.toBe("");
    }
  });

  it("write titles and labels with a capital and no full stop, and sentences with a capital", () => {
    for (const { id } of LANGUAGES) {
      for (const [path, text] of leaves(COMPONENT_WORDS[id])) {
        // Units follow a number, and parts sit around a key inside a
        // sentence: neither is a title.
        if (path.includes(".units.") || /Part$/.test(path)) continue;
        const first = text.trim()[0]!;
        // Arabic has no capitals; a letter that has a case starts with
        // its capital. Digits and symbols ("T+1", "±") are left as they are.
        if (first.toLocaleLowerCase(id) !== first.toLocaleUpperCase(id)) {
          expect(first, `${id} ${path}: "${text}"`).toBe(first.toLocaleUpperCase(id));
        }
        if (!isSentenceKey(path)) expect(text, `${id} ${path}`).not.toMatch(/\.$/);
      }
    }
  });
});

describe("the side panel's settings", () => {
  it("label every screen and state with a capital and no full stop", () => {
    for (const { label } of [...SCREENS, ...DATA_STATES]) {
      expect(label[0], label).toBe(label[0]!.toUpperCase());
      expect(label).not.toMatch(/\.$/);
    }
  });
});
