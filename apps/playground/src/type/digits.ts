// The numeric promise, stated so that it can be checked: the digits of one
// set all have the same advance. Nothing here shapes anything; the shaping
// side is `engine.ts`, and keeping the verdict separate is what lets both
// answers ("tabular", "proportional") be tested without a font that has
// them.
import { CHROME_TEXT, type TypeReportText } from "../chromeText.ts";

export type DigitSetId = "latin" | "arabic-indic";

export type DigitSet = {
  id: DigitSetId;
  /** The ten digits, zero first. */
  text: string;
  /** OpenType script tag, so the shaper is not left to guess a run of ten
   * digits, and the direction the digits are read in. */
  script: string;
  direction: "ltr" | "rtl";
};

export const DIGIT_SETS: DigitSet[] = [
  { id: "latin", text: "0123456789", script: "Latn", direction: "ltr" },
  {
    id: "arabic-indic",
    text: "٠١٢٣٤٥٦٧٨٩",
    script: "Arab",
    direction: "rtl",
  },
];

/** A tabular verdict is "the ten advances are equal". `absent` is not a
 * failure of the font, it is the absence of an answer: the digits are not
 * in the file, so nothing was measured. */
export type DigitVerdict = "tabular" | "proportional" | "absent";

export function digitVerdict(advances: number[], present: boolean): DigitVerdict {
  if (!present || advances.length === 0) return "absent";
  return new Set(advances).size === 1 ? "tabular" : "proportional";
}

export type DigitRow = {
  set: DigitSetId;
  /** The feature asked for: nothing, or `tnum`. */
  feature: "none" | "tnum";
  /** False when any digit shaped to glyph id 0. The font does not contain
   * that set and the equal .notdef advances mean nothing. */
  present: boolean;
  glyphIds: number[];
  /** One advance per digit, each digit shaped on its own, in font units. */
  advances: number[];
  /** The same ten digits shaped as one run, in logical order (zero first,
   * whatever the direction), which is not always the same thing. Pair
   * kerning lands here and not in `advances` (in Inter 4.001 the seven
   * before the eight is kerned by -29 units), and so do contextual
   * alternates (IBM Plex Sans Arabic gives U+0667 a 481-unit form among
   * other digits and a 531-unit form on its own). */
  runAdvances: number[];
  distinct: number;
  /** Distinct advances in that run. */
  runDistinct: number;
  min: number;
  max: number;
  /** The verdict is about the glyphs' own advances, which is what a column
   * of figures is built from. */
  verdict: DigitVerdict;
};

export function digitRow(
  set: DigitSetId,
  feature: "none" | "tnum",
  glyphIds: number[],
  advances: number[],
  runAdvances: number[],
): DigitRow {
  const present = glyphIds.length > 0 && !glyphIds.includes(0);
  return {
    set,
    feature,
    present,
    glyphIds,
    advances,
    runAdvances,
    distinct: new Set(advances).size,
    runDistinct: new Set(runAdvances).size,
    min: advances.length ? Math.min(...advances) : 0,
    max: advances.length ? Math.max(...advances) : 0,
    verdict: digitVerdict(advances, present),
  };
}

/** Whether the ten digits in a run have the advances their glyphs do. A
 * disagreement means kerning or a contextual alternate, and a column of
 * figures is laid out from the run, so it is said out loud. */
export const runAgrees = (row: DigitRow): boolean => row.advances.join() === row.runAdvances.join();

/** The sentence the inspector shows for one row, in English unless other
 * words are given. It never says "tabular" about digits the file does not
 * have. */
export function digitSummary(row: DigitRow, upem: number, words: TypeReportText = CHROME_TEXT.en.type.report): string {
  const label = words.digitSets[row.set];
  const asked = row.feature === "tnum" ? words.withTnum : words.asShaped;
  if (!row.present) return words.digitsAbsent(label, asked);
  const perEm = (value: number) => words.em(String(Math.round((value / upem) * 1000) / 1000));
  const verdict =
    row.verdict === "tabular"
      ? words.digitsTabular(label, asked, String(row.min), perEm(row.min))
      : words.digitsProportional(label, asked, String(row.distinct), String(row.min), String(row.max), perEm(row.min), perEm(row.max));
  if (runAgrees(row)) return verdict;
  const runMin = Math.min(...row.runAdvances);
  const runMax = Math.max(...row.runAdvances);
  return words.digitsRunDiffers(verdict, String(row.runDistinct), String(runMin), String(runMax));
}
