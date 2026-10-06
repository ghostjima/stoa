// The word-level diff behind TextDiff: tokens in any script, the longest
// common subsequence kept, deletions before insertions, whitespace between
// two changes joined into one, and the share of changed characters.
import { describe, expect, it } from "vitest";
import { DIFF_MAX_CELLS, characterCount, diffStats, diffTokens, diffWords, type DiffPart } from "./index";

/** The two texts a diff was made from, joined back from its parts. */
const sides = (parts: DiffPart[]) => ({
  before: parts.filter((p) => p.kind !== "inserted").map((p) => p.text).join(""),
  after: parts.filter((p) => p.kind !== "deleted").map((p) => p.text).join(""),
});

describe("diffTokens", () => {
  it("cuts a text into words, whitespace runs and single punctuation marks, and joins back to it", () => {
    expect(diffTokens("Dear client,\n  we  reviewed it.")).toEqual(["Dear", " ", "client", ",", "\n  ", "we", "  ", "reviewed", " ", "it", "."]);
    expect(diffTokens("161-FZ, art. 8")).toEqual(["161", "-", "FZ", ",", " ", "art", ".", " ", "8"]);
    expect(diffTokens("")).toEqual([]);
  });

  it("keeps an Arabic word with its vowel marks as one token", () => {
    const word = "سيُنفَّذ";
    expect(diffTokens(`${word} التحويل.`)).toEqual([word, " ", "التحويل", "."]);
  });
});

describe("diffWords", () => {
  it("gives one equal part for identical texts, and nothing for two empty ones", () => {
    expect(diffWords("Same text.", "Same text.")).toEqual([{ kind: "equal", text: "Same text." }]);
    expect(diffWords("", "")).toEqual([]);
  });

  it("is all inserted from an empty text, and all deleted to one", () => {
    expect(diffWords("", "New text")).toEqual([{ kind: "inserted", text: "New text" }]);
    expect(diffWords("Old text", "")).toEqual([{ kind: "deleted", text: "Old text" }]);
  });

  it("marks a replaced word in English, the deletion before the insertion", () => {
    expect(diffWords("The transfer will be made tomorrow.", "The transfer will be made today.")).toEqual([
      { kind: "equal", text: "The transfer will be made " },
      { kind: "deleted", text: "tomorrow" },
      { kind: "inserted", text: "today" },
      { kind: "equal", text: "." },
    ]);
  });

  it("marks inserted and deleted words in Russian, matching words rather than the spaces between them", () => {
    expect(diffWords("Мы рассмотрели вашу жалобу.", "Мы внимательно рассмотрели жалобу.")).toEqual([
      { kind: "equal", text: "Мы " },
      { kind: "inserted", text: "внимательно " },
      { kind: "equal", text: "рассмотрели" },
      { kind: "deleted", text: " вашу" },
      { kind: "equal", text: " жалобу." },
    ]);
  });

  it("marks a replaced and a deleted word in Arabic, keeping the vowel marks whole", () => {
    expect(diffWords("سيُنفَّذ التحويل غدًا بالتأكيد.", "سيُنفَّذ التحويل اليوم.")).toEqual([
      { kind: "equal", text: "سيُنفَّذ التحويل " },
      { kind: "deleted", text: "غدًا بالتأكيد" },
      { kind: "inserted", text: "اليوم" },
      { kind: "equal", text: "." },
    ]);
  });

  it("joins the whitespace between two changes, so a reworded phrase is one replacement", () => {
    expect(diffWords("a b c", "x y z")).toEqual([
      { kind: "deleted", text: "a b c" },
      { kind: "inserted", text: "x y z" },
    ]);
  });

  it("joins a lone punctuation mark between two changes into them", () => {
    // The full stop after "161-FZ" matches the one after "art.": without
    // the join, ", art" and " 8, part 3.4." would be two insertions.
    expect(diffWords("Under 161-FZ.\nConfirm it.", "Under 161-FZ, art. 8, part 3.4.\nConfirm it by Friday.")).toEqual([
      { kind: "equal", text: "Under 161-FZ" },
      { kind: "deleted", text: "." },
      { kind: "inserted", text: ", art. 8, part 3.4." },
      { kind: "equal", text: "\nConfirm it" },
      { kind: "inserted", text: " by Friday" },
      { kind: "equal", text: "." },
    ]);
  });

  it("is all deleted and all inserted when nothing is shared", () => {
    expect(diffWords("Alpha beta.", "Гамма, дельта!")).toEqual([
      { kind: "deleted", text: "Alpha beta." },
      { kind: "inserted", text: "Гамма, дельта!" },
    ]);
  });

  it("keeps line breaks, and joins back to both texts", () => {
    const before = "Dear client,\nWe reviewed it.\nRegards";
    const after = "Dear client,\n\nWe have reviewed it.\nRegards";
    const parts = diffWords(before, after);
    expect(sides(parts)).toEqual({ before, after });
    expect(parts.filter((p) => p.kind !== "equal")).toEqual([
      { kind: "deleted", text: "\n" },
      { kind: "inserted", text: "\n\n" },
      { kind: "inserted", text: " have" },
    ]);
  });

  it("is deterministic: the same texts give the same parts", () => {
    const before = "a b a b a";
    const after = "b a b a b";
    expect(diffWords(before, after)).toEqual(diffWords(before, after));
    expect(sides(diffWords(before, after))).toEqual({ before, after });
  });

  it("shows a middle too large to search as one replacement, still joining back to both texts", () => {
    const words = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");
    const side = Math.ceil(Math.sqrt(DIFF_MAX_CELLS) / 2) + 10;
    const before = `Start ${words("a", side)} end`;
    const after = `Start ${words("b", side)} end`;
    const parts = diffWords(before, after);
    expect(parts.map((p) => p.kind)).toEqual(["equal", "deleted", "inserted", "equal"]);
    expect(sides(parts)).toEqual({ before, after });
  });
});

describe("diffStats", () => {
  it("counts characters as code points, and the share over both texts", () => {
    expect(characterCount("ab")).toBe(2);
    expect(characterCount("غدًا")).toBe(4);
    expect(characterCount("𝟙")).toBe(1);
    // "tomorrow" (8) deleted, "today" (5) inserted; 26 + 1 equal in each.
    const stats = diffStats(diffWords("The transfer will be made tomorrow.", "The transfer will be made today."));
    expect(stats).toEqual({ deleted: 8, inserted: 5, total: 2 * 27 + 13, changed: 13 / 67 });
  });

  it("is 0 for identical or empty texts, and 1 when nothing is shared", () => {
    expect(diffStats(diffWords("Same", "Same")).changed).toBe(0);
    expect(diffStats(diffWords("", "")).changed).toBe(0);
    expect(diffStats(diffWords("", "New")).changed).toBe(1);
    expect(diffStats(diffWords("Old", "New")).changed).toBe(1);
  });
});
