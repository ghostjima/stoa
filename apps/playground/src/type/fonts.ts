// A font the owner has loaded: the file, what the engine found in it, and
// where it came from.
//
// The bytes stay in memory for as long as the tab is open, because the
// previews register them as a `FontFace` and the canvas check re-registers
// them with features. A snapshot records the reference instead: a font file
// is someone else's licensed work, and a snapshot is a record of a tuning
// session, not a place to keep a copy of it.
import type { FontReport } from "./report.ts";
import type { DigitRow } from "./digits.ts";

export type FontSource =
  /** A file dropped into the panel or chosen from disk. */
  | { kind: "file"; name: string; bytes: number }
  /** Fetched from the Fontsource catalogue by id. */
  | { kind: "fontsource"; id: string; url: string; licence: string }
  /** One of the families Stoa itself ships, read out of the bundle so that
   * the roles can be paired against real metrics from the first second. */
  | { kind: "shipped"; family: string; file: string };

export type LoadedFont = {
  /** Family and a digest of the bytes: loading the same file twice is the
   * same font, two weights of one family are not. */
  id: string;
  /** The family name the file is registered under in this document. The
   * file's own family name would collide with a font of that name installed
   * on the machine, and then the previews would not be showing the file. */
  cssFamily: string;
  source: FontSource;
  report: FontReport;
  bytes: ArrayBuffer;
};

/** FNV-1a over the bytes, the same digest the token model uses for its
 * revision. Enough to tell two files apart in a session. */
export function byteDigest(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let hash = 2166136261;
  for (let i = 0; i < view.length; i++) {
    hash ^= view[i] ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const slug = (text: string) => text.replace(/[^A-Za-z0-9]+/g, "") || "Font";

/** The document-local family name for a loaded file. */
export const previewFamily = (report: FontReport, digest: string): string =>
  `StoaLoaded${slug(report.names.family || report.names.fullName)}${digest}`;

/** A shipped family keeps its real name: the document already has it from
 * the stylesheet, and the point of reading it is to know the metrics of the
 * font the previews are actually using. */
export function loadedFont(report: FontReport, bytes: ArrayBuffer, source: FontSource): LoadedFont {
  const digest = byteDigest(bytes);
  return {
    id: source.kind === "shipped" ? `shipped:${source.family}` : `${report.names.family || "unnamed"}-${digest}`,
    cssFamily: source.kind === "shipped" ? source.family : previewFamily(report, digest),
    source,
    report,
    bytes,
  };
}

/** The licence this font states, from the file first and from the catalogue
 * when the file says nothing. */
export function fontLicence(font: LoadedFont): string {
  const stated = font.report.names.licence.trim();
  if (stated !== "") return stated;
  if (font.source.kind === "fontsource") return `Fontsource records: ${font.source.licence}`;
  // A subsetter can drop the licence description (name ID 13) and keep the
  // URL (name ID 14); the Fontsource builds of IBM Plex do exactly that.
  const url = font.report.names.licenceUrl.trim();
  if (url !== "") return "the file states no licence text, only a licence URL";
  return "the file states no licence";
}

/** Register a loaded file under a second family name with a `size-adjust`,
 * which is how an Arabic pairing lands on the primary's x-height. The
 * family name carries the percentage, so two different adjustments are two
 * faces rather than one that quietly wins. */
export const adjustedFamily = (cssFamily: string, percent: number): string =>
  `${cssFamily}Adj${String(percent).replace(".", "p")}`;

export async function registerAdjustedFace(font: LoadedFont, percent: number): Promise<string> {
  const family = adjustedFamily(font.cssFamily, percent);
  for (const face of document.fonts) {
    if (face.family === family) return family;
  }
  const face = new FontFace(family, font.bytes, { sizeAdjust: `${percent}%` });
  await face.load();
  document.fonts.add(face);
  return family;
}

export type DigitReference = Pick<
  DigitRow,
  "set" | "feature" | "present" | "verdict" | "distinct" | "runDistinct" | "min" | "max"
>;

/** What a snapshot records for one font: enough to find the file again and
 * to read the verdicts back, and no font data. */
export type FontReference = {
  id: string;
  family: string;
  subfamily: string;
  cssFamily: string;
  source: FontSource;
  licence: string;
  licenceUrl: string;
  format: FontReport["format"];
  /** Length of the sfnt that was measured, in bytes: a number, not the
   * bytes. */
  sfntBytes: number;
  harfbuzz: string;
  axes: string[];
  gsubTagCount: number;
  knownFullGsubTagCount: number | null;
  metrics: FontReport["metrics"];
  digits: DigitReference[];
};

export function fontReference(font: LoadedFont): FontReference {
  const { report } = font;
  return {
    id: font.id,
    family: report.names.family,
    subfamily: report.names.subfamily,
    cssFamily: font.cssFamily,
    source: font.source,
    licence: fontLicence(font),
    licenceUrl: report.names.licenceUrl,
    format: report.format,
    sfntBytes: report.sfntBytes,
    harfbuzz: report.harfbuzz,
    axes: report.axes.map((axis) => axis.tag),
    gsubTagCount: report.gsubTagCount,
    knownFullGsubTagCount: report.knownFullGsubTagCount,
    metrics: report.metrics,
    digits: report.digits.map(({ set, feature, present, verdict, distinct, runDistinct, min, max }) => ({
      set,
      feature,
      present,
      verdict,
      distinct,
      runDistinct,
      min,
      max,
    })),
  };
}

/** Register a loaded file for the previews, under its document-local family
 * name. Idempotent: the same family is registered once per document. */
export async function registerPreviewFace(font: LoadedFont): Promise<void> {
  for (const face of document.fonts) {
    if (face.family === font.cssFamily) return;
  }
  const face = new FontFace(font.cssFamily, font.bytes);
  await face.load();
  document.fonts.add(face);
}
