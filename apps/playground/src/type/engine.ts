// What a font file really contains, read with HarfBuzz rather than taken
// from a feature list or a foundry page.
//
// Everything here is measured off the file that was loaded: axes and their
// named instances, the layout features the file still has and what each one
// does to a probe, the metrics the roles need, and the digit advances that
// decide whether the numeric promise holds. The module runs in Node (its
// tests) and in the worker (`worker.ts`); nothing in it touches the DOM.
//
// The report's own shape is in `report.ts`, which the panel can import
// without pulling HarfBuzz and the WOFF2 decoder along with it.
import { Blob, Buffer as HbBuffer, Direction, Face, Feature, Font, MetricsTag, shape, versionString } from "harfbuzzjs";
import { DIGIT_SETS, digitRow, type DigitRow, type DigitSet } from "./digits.ts";
import { FULL_GSUB_TAG_COUNTS } from "./report.ts";
import { toSfnt } from "./sfnt.ts";
import type { Axis, FeatureChange, FeatureInfo, FontMetrics, FontNames, FontReport, NamedInstance } from "./report.ts";

/** Text each feature is tried on. A feature that changes nothing here is
 * reported as changing nothing here, which is a statement about the probe
 * and is shown as one. */
const PROBES: { script: string; direction: "ltr" | "rtl"; text: string }[] = [
  { script: "Latn", direction: "ltr", text: "0123456789 1lI aeg fi 1/2" },
  { script: "Arab", direction: "rtl", text: "٠١٢٩ العربي" },
];

const NAME_IDS = {
  copyright: 0,
  family: 1,
  subfamily: 2,
  fullName: 4,
  version: 5,
  designer: 9,
  vendorUrl: 11,
  licence: 13,
  licenceUrl: 14,
} as const;

const direction = (of: "ltr" | "rtl") => (of === "rtl" ? Direction.RTL : Direction.LTR);

function shapeText(font: Font, text: string, set: { script: string; direction: "ltr" | "rtl" }, features: Feature[]) {
  const buffer = new HbBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  buffer.setScript(set.script);
  buffer.setDirection(direction(set.direction));
  shape(font, buffer, features);
  return buffer.getGlyphInfosAndPositions();
}

function readNames(face: Face): FontNames {
  const read = (id: number) => face.getName(id, "en") || "";
  return {
    copyright: read(NAME_IDS.copyright),
    family: read(NAME_IDS.family),
    subfamily: read(NAME_IDS.subfamily),
    fullName: read(NAME_IDS.fullName),
    version: read(NAME_IDS.version),
    designer: read(NAME_IDS.designer),
    vendorUrl: read(NAME_IDS.vendorUrl),
    licence: read(NAME_IDS.licence),
    licenceUrl: read(NAME_IDS.licenceUrl),
  };
}

function readMetrics(face: Face, font: Font): FontMetrics {
  const extents = font.hExtents();
  return {
    upem: face.upem,
    xHeight: font.getMetricPosition(MetricsTag.X_HEIGHT) ?? null,
    capHeight: font.getMetricPosition(MetricsTag.CAP_HEIGHT) ?? null,
    ascender: extents.ascender,
    descender: extents.descender,
    lineGap: extents.lineGap,
  };
}

function readAxes(face: Face): Axis[] {
  return Object.values(face.getAxisInfos()).map((axis) => ({
    tag: axis.tag,
    name: face.getName(axis.nameId, "en") || axis.tag,
    min: axis.min,
    default: axis.default,
    max: axis.max,
  }));
}

/** The fvar instance records. HarfBuzz exposes the axes but not the named
 * instances, so the table is read here: an instance is a subfamily name ID
 * and one 16.16 coordinate per axis, after the axis array. */
export function readInstances(face: Face, axes: Axis[]): NamedInstance[] {
  const fvar = face.referenceTable("fvar");
  if (!fvar || fvar.byteLength < 16 || axes.length === 0) return [];
  const view = new DataView(fvar.buffer, fvar.byteOffset, fvar.byteLength);
  const axisArrayOffset = view.getUint16(4);
  const axisCount = view.getUint16(8);
  const axisSize = view.getUint16(10);
  const instanceCount = view.getUint16(12);
  const instanceSize = view.getUint16(14);
  if (axisCount !== axes.length || instanceSize < 4 + axisCount * 4) return [];
  const base = axisArrayOffset + axisCount * axisSize;
  const out: NamedInstance[] = [];
  for (let i = 0; i < instanceCount; i++) {
    const at = base + i * instanceSize;
    if (at + instanceSize > fvar.byteLength) break;
    const nameId = view.getUint16(at);
    const coordinates: Record<string, number> = {};
    axes.forEach((axis, index) => {
      coordinates[axis.tag] = view.getInt32(at + 4 + index * 4) / 65536;
    });
    out.push({ name: face.getName(nameId, "en") || `instance ${i + 1}`, coordinates });
  }
  return out;
}

/** What one feature does to the probe text, as glyph names. A feature that
 * changes the glyph count (a ligature) is reported as a count, because a
 * positional pairing would be a guess. */
function featureChanges(font: Font, tag: string): FeatureChange[] {
  const changes: FeatureChange[] = [];
  const seen = new Set<string>();
  for (const probe of PROBES) {
    const before = shapeText(font, probe.text, probe, []).map((glyph) => font.glyphName(glyph.codepoint));
    const after = shapeText(font, probe.text, probe, [new Feature(tag, 1)]).map((glyph) => font.glyphName(glyph.codepoint));
    if (before.length !== after.length) {
      changes.push({ before: `${before.length} glyphs`, after: `${after.length} glyphs` });
      continue;
    }
    before.forEach((name, index) => {
      const to = after[index] ?? name;
      const key = `${name}>${to}`;
      if (name === to || seen.has(key)) return;
      seen.add(key);
      changes.push({ before: name, after: to });
    });
  }
  return changes;
}

/** Every feature in one table, with its UI name and what it does. The tag
 * list repeats a tag once per script and language record, so it is reduced
 * to distinct tags; the first index a tag appears at carries the name. */
function readFeatures(face: Face, font: Font, table: "GSUB" | "GPOS"): FeatureInfo[] {
  const tags = face.getTableFeatureTags(table);
  const out: FeatureInfo[] = [];
  const seen = new Set<string>();
  tags.forEach((tag, index) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    const ids = face.getFeatureNameIds(table, index);
    const nameId = ids?.uiLabelNameId ?? 0;
    out.push({
      tag,
      table,
      uiName: nameId > 0 ? face.getName(nameId, "en") || null : null,
      changes: table === "GSUB" ? featureChanges(font, tag) : [],
    });
  });
  return out.sort((a, b) => a.tag.localeCompare(b.tag));
}

/** The ten digits of one set, each shaped on its own so that the advances
 * are the glyphs' own, plus the same digits as one run so that pair
 * kerning is visible rather than mixed in. */
function measureDigits(font: Font, set: DigitSet, feature: "none" | "tnum"): DigitRow {
  const features = feature === "tnum" ? [new Feature("tnum", 1)] : [];
  const glyphIds: number[] = [];
  const advances: number[] = [];
  for (const digit of [...set.text]) {
    const shaped = shapeText(font, digit, set, features);
    const glyph = shaped[0];
    glyphIds.push(glyph?.codepoint ?? 0);
    advances.push(glyph?.xAdvance ?? 0);
  }
  // HarfBuzz returns a right-to-left run in visual order; sorting by cluster
  // brings it back to logical order, zero first, so that it lines up with
  // `advances` digit by digit.
  const runAdvances = shapeText(font, set.text, set, features)
    .sort((a, b) => a.cluster - b.cluster)
    .map((glyph) => glyph.xAdvance ?? 0);
  return digitRow(set.id, feature, glyphIds, advances, runAdvances);
}

/** Read one font file. The bytes are brought to an sfnt first, because
 * HarfBuzz would take a WOFF2 file without complaining and report ten
 * equal .notdef advances as a tabular set. */
export async function inspectFont(input: Uint8Array | ArrayBuffer): Promise<FontReport> {
  const sfnt = await toSfnt(input);
  const face = new Face(new Blob(sfnt.bytes));
  const font = new Font(face);
  const names = readNames(face);
  const axes = readAxes(face);
  const digits: DigitRow[] = [];
  for (const set of DIGIT_SETS) {
    digits.push(measureDigits(font, set, "none"), measureDigits(font, set, "tnum"));
  }
  const features = [...readFeatures(face, font, "GSUB"), ...readFeatures(face, font, "GPOS")];
  return {
    harfbuzz: versionString(),
    format: sfnt.format,
    decompressed: sfnt.decompressed,
    sfntBytes: sfnt.bytes.byteLength,
    names,
    metrics: readMetrics(face, font),
    axes,
    instances: readInstances(face, axes),
    features,
    gsubTagCount: features.filter((feature) => feature.table === "GSUB").length,
    knownFullGsubTagCount: FULL_GSUB_TAG_COUNTS[names.family] ?? null,
    digits,
  };
}
