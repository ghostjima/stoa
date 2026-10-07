// A word-level diff of two texts, for TextDiff: deterministic, and the same
// for any script. The texts are cut into tokens (runs of letters, marks
// and digits; runs of whitespace; any other character on its own), the
// common subsequence of the two token lists that keeps the most characters
// is kept, and the rest is what was deleted from the first text and
// inserted into the second.

/** One piece of the diff: text both texts share, text only the first has
 * (deleted), or text only the second has (inserted). Joined in order, the
 * "equal" and "deleted" pieces give the first text back, and the "equal"
 * and "inserted" pieces the second. */
export type DiffPart = { kind: "equal" | "deleted" | "inserted"; text: string };

/** What a diff changed, in characters (Unicode code points, whitespace
 * included). */
export type DiffStats = {
  /** Characters of the first text that are not in the second. */
  deleted: number;
  /** Characters of the second text that are not in the first. */
  inserted: number;
  /** Characters of both texts together: the first's plus the second's. */
  total: number;
  /** (deleted + inserted) / total, from 0 (the same texts, or two empty
   * ones) to 1 (nothing in common). */
  changed: number;
};

/** A word, with its combining marks and joiners (Arabic letters with
 * their vowel marks, a word with a zero-width non-joiner); a run of
 * whitespace; or any other single character (punctuation, a symbol). */
const TOKEN = /[\p{L}\p{M}\p{N}_\u200C\u200D]+|\s+|[^\p{L}\p{M}\p{N}_\u200C\u200D\s]/gu;

/** The text cut into tokens; joined, they give the text back. */
export function diffTokens(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

/** Above this many cells (changed tokens of the first text times those of
 * the second, after the common start and end are set aside), the middle
 * is shown as one replacement rather than searched: the table, four bytes
 * a cell, would take more than 16 MB. A word and the space after it are
 * two tokens, so two letters of about a thousand words each stay below
 * it, whatever they share. */
export const DIFF_MAX_CELLS = 4_000_000;

/** Text with no letter, mark or digit: whitespace and punctuation. */
const isFiller = (text: string) => !/[\p{L}\p{M}\p{N}]/u.test(text);

/**
 * The word-level diff of `before` and `after`: of the common subsequences
 * of their tokens, the one with the most characters, so a shared word
 * outweighs a shared space. Deterministic: where two alignments keep as many
 * characters, the earlier tokens of `before` are deleted first. Each run
 * of changes lists its deletion before its insertion, and whitespace or
 * punctuation that stands alone between two changes joins them ("a b c"
 * to "x y z" is one replacement, not three; "161-FZ." to "161-FZ, art. 8."
 * is one, not two around the full stop), so a reworded phrase reads as
 * one change; the characters joined count as deleted and inserted.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = diffTokens(before);
  const b = diffTokens(after);
  // The common start and end are set aside before the table is built.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const ops: { kind: DiffPart["kind"]; token: string }[] = a.slice(0, start).map((token) => ({ kind: "equal", token }));
  const n = endA - start;
  const m = endB - start;
  if (n > 0 && m > 0 && n * m <= DIFF_MAX_CELLS) {
    // kept[i * (m + 1) + j]: the most characters a common subsequence of
    // a[start + i..] and b[start + j..] keeps.
    const width = m + 1;
    const kept = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
      const x = a[start + i] ?? "";
      for (let j = m - 1; j >= 0; j--) {
        const skip = Math.max(kept[(i + 1) * width + j] ?? 0, kept[i * width + j + 1] ?? 0);
        kept[i * width + j] = x === b[start + j] ? Math.max(skip, (kept[(i + 1) * width + j + 1] ?? 0) + characterCount(x)) : skip;
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      const x = a[start + i] ?? "";
      const y = b[start + j] ?? "";
      const here = kept[i * width + j] ?? 0;
      if (x === y && here === (kept[(i + 1) * width + j + 1] ?? 0) + characterCount(x)) {
        ops.push({ kind: "equal", token: x });
        i++;
        j++;
      } else if ((kept[(i + 1) * width + j] ?? 0) === here) {
        ops.push({ kind: "deleted", token: x });
        i++;
      } else {
        ops.push({ kind: "inserted", token: y });
        j++;
      }
    }
    for (; i < n; i++) ops.push({ kind: "deleted", token: a[start + i] ?? "" });
    for (; j < m; j++) ops.push({ kind: "inserted", token: b[start + j] ?? "" });
  } else {
    for (const token of a.slice(start, endA)) ops.push({ kind: "deleted", token });
    for (const token of b.slice(start, endB)) ops.push({ kind: "inserted", token });
  }
  for (const token of a.slice(endA)) ops.push({ kind: "equal", token });
  return mergeRuns(ops);
}

/** Runs of equal tokens and runs of changes; whitespace or punctuation
 * alone between two changes joins them; within each run of changes, the
 * deleted text comes before the inserted text. */
function mergeRuns(ops: { kind: DiffPart["kind"]; token: string }[]): DiffPart[] {
  // Runs: an equal run, or a change run holding its deletions and
  // insertions apart.
  type Run = { equal: string } | { deleted: string; inserted: string };
  const runs: Run[] = [];
  for (const op of ops) {
    const last = runs[runs.length - 1];
    if (op.kind === "equal") {
      if (last && "equal" in last) last.equal += op.token;
      else runs.push({ equal: op.token });
    } else {
      const change = last && !("equal" in last) ? last : { deleted: "", inserted: "" };
      if (change !== last) runs.push(change);
      if (op.kind === "deleted") change.deleted += op.token;
      else change.inserted += op.token;
    }
  }
  // Whitespace or punctuation alone between two changes is deleted and
  // inserted with them, and the three runs become one.
  const joined: Run[] = [];
  for (let k = 0; k < runs.length; k++) {
    const run = runs[k]!;
    const prev = joined[joined.length - 1];
    const next = runs[k + 1];
    if ("equal" in run && isFiller(run.equal) && prev && !("equal" in prev) && next && !("equal" in next)) {
      prev.deleted += run.equal + next.deleted;
      prev.inserted += run.equal + next.inserted;
      k++;
      continue;
    }
    joined.push({ ...run });
  }
  const parts: DiffPart[] = [];
  for (const run of joined) {
    if ("equal" in run) {
      if (run.equal) parts.push({ kind: "equal", text: run.equal });
      continue;
    }
    if (run.deleted) parts.push({ kind: "deleted", text: run.deleted });
    if (run.inserted) parts.push({ kind: "inserted", text: run.inserted });
  }
  return parts;
}

/** How many characters a text has, as Unicode code points: an Arabic
 * vowel mark is one, a letter outside the Basic Multilingual Plane is
 * one. */
export function characterCount(text: string): number {
  let count = 0;
  for (const _ of text) count++;
  return count;
}

/** What the diff changed: the characters deleted and inserted, the
 * characters of both texts, and the share changed, (deleted + inserted)
 * / (characters of the first text + characters of the second). Every
 * character counts once, whatever word it is in; whitespace counts too. */
export function diffStats(parts: DiffPart[]): DiffStats {
  let equal = 0;
  let deleted = 0;
  let inserted = 0;
  for (const part of parts) {
    const count = characterCount(part.text);
    if (part.kind === "equal") equal += count;
    else if (part.kind === "deleted") deleted += count;
    else inserted += count;
  }
  const total = 2 * equal + deleted + inserted;
  return { deleted, inserted, total, changed: total === 0 ? 0 : (deleted + inserted) / total };
}
