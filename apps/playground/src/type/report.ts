// What a font report is, and the things that can be said about one without
// a shaper.
//
// The types and the sentences live apart from `engine.ts` on purpose: the
// panel reads reports and never shapes anything, so importing this must not
// pull HarfBuzz and the WOFF2 decoder into the main bundle. The engine side
// of the worker imports these same types.
import type { DigitRow } from "./digits.ts";
import type { FontFormat } from "./sfnt.ts";

export type Axis = {
  tag: string;
  /** The axis name from the name table, or the tag when it has none. */
  name: string;
  min: number;
  default: number;
  max: number;
};

export type NamedInstance = {
  name: string;
  /** Axis tag to coordinate, for every axis the font has. */
  coordinates: Record<string, number>;
};

export type FeatureChange = { before: string; after: string };

export type FeatureInfo = {
  tag: string;
  table: "GSUB" | "GPOS";
  /** The font's own UI name for the feature (`ss01` as "Open digits"), when
   * it names one. */
  uiName: string | null;
  /** What the feature does to the probe text, as glyph names. Empty means
   * it changed nothing there, not that it does nothing. */
  changes: FeatureChange[];
};

export type FontNames = {
  family: string;
  subfamily: string;
  fullName: string;
  version: string;
  copyright: string;
  /** Name IDs 13 and 14: the licence the file itself states. */
  licence: string;
  licenceUrl: string;
  designer: string;
  vendorUrl: string;
};

export type FontMetrics = {
  upem: number;
  /** Null when the file states no OS/2 value for it. */
  xHeight: number | null;
  capHeight: number | null;
  ascender: number;
  descender: number;
  lineGap: number;
};

export type FontReport = {
  /** HarfBuzz version the measurements were taken with. */
  harfbuzz: string;
  format: FontFormat;
  /** Whether the bytes measured came out of a WOFF2 decode. */
  decompressed: boolean;
  /** Length of the sfnt that was measured, after any decode. */
  sfntBytes: number;
  names: FontNames;
  metrics: FontMetrics;
  axes: Axis[];
  instances: NamedInstance[];
  features: FeatureInfo[];
  /** Distinct GSUB feature tags in this file. */
  gsubTagCount: number;
  /** Distinct GSUB feature tags in the full release of this family, when
   * this project has measured it; null when it has not. */
  knownFullGsubTagCount: number | null;
  digits: DigitRow[];
};

/** Distinct GSUB feature tags in the full release of families this project
 * has measured, so the inspector can say "8 of 39" instead of only listing
 * what the loaded file has. Keyed by name ID 1. Measured with this engine;
 * the files and versions are in docs/type-measurements.md. */
export const FULL_GSUB_TAG_COUNTS: Record<string, number> = {
  Inter: 39,
  "Inter Variable": 39,
  "IBM Plex Sans": 21,
  "IBM Plex Sans Arabic": 25,
  "Noto Sans Arabic": 12,
};

/** How the inspector states the feature count: the "8 of 39" sentence when
 * the full release has been measured, and what the file has when it has
 * not. */
export function featureCountSentence(report: FontReport): string {
  const full = report.knownFullGsubTagCount;
  if (full === null) {
    const family = report.names.family || "this family";
    return (
      `this file has ${report.gsubTagCount} GSUB feature(s); the full release of ${family} ` +
      "has not been measured here, so there is nothing to compare"
    );
  }
  if (report.gsubTagCount >= full) {
    return `this file has ${report.gsubTagCount} GSUB feature(s), the full ${report.names.family} release as measured here`;
  }
  return (
    `this file has ${report.gsubTagCount} of the ${full} GSUB features of the full ${report.names.family} release: ` +
    "a web subset drops the rest"
  );
}
