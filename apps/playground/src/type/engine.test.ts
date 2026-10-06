// The engine against two committed subsets, one TTF and one WOFF2. The
// numbers are the ones this font engine reports for those exact files, so a
// change in how a font is read shows up here rather than in a panel.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { inspectFont } from "./engine.ts";
import { featureCountSentence } from "./report.ts";
import { digitSummary, digitVerdict, runAgrees } from "./digits.ts";
import { sniffFormat, toSfnt } from "./sfnt.ts";
import type { DigitRow } from "./digits.ts";
import type { FontReport } from "./report.ts";

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./testdata/${name}`, import.meta.url)));

const LATIN = fixture("Inter-digits-subset.ttf");
const ARABIC = fixture("NotoSansArabic-digits-subset.woff2");

const row = (report: FontReport, set: DigitRow["set"], feature: DigitRow["feature"]): DigitRow => {
  const found = report.digits.find((item) => item.set === set && item.feature === feature);
  if (!found) throw new Error(`no ${set} row for ${feature}`);
  return found;
};

describe("sniffFormat", () => {
  it("names the container from its signature", () => {
    expect(sniffFormat(LATIN)).toBe("ttf");
    expect(sniffFormat(ARABIC)).toBe("woff2");
    expect(sniffFormat(new Uint8Array([0x4f, 0x54, 0x54, 0x4f]))).toBe("otf");
    expect(sniffFormat(new Uint8Array([0x77, 0x4f, 0x46, 0x46]))).toBe("woff");
    expect(sniffFormat(new TextEncoder().encode("not a font at all"))).toBe("unknown");
  });
});

describe("toSfnt", () => {
  it("decodes WOFF2 to an sfnt", async () => {
    const sfnt = await toSfnt(ARABIC);
    expect(sfnt.format).toBe("woff2");
    expect(sfnt.decompressed).toBe(true);
    expect(sniffFormat(sfnt.bytes)).toBe("ttf");
    expect(sfnt.bytes.byteLength).toBeGreaterThan(ARABIC.byteLength);
  });

  it("passes a TTF through untouched", async () => {
    const sfnt = await toSfnt(LATIN);
    expect(sfnt).toMatchObject({ format: "ttf", decompressed: false });
    expect(sfnt.bytes.byteLength).toBe(LATIN.byteLength);
  });

  it("refuses WOFF 1.0 and unknown bytes rather than guessing", async () => {
    const woff = new Uint8Array(64);
    woff.set(new TextEncoder().encode("wOFF"));
    await expect(toSfnt(woff)).rejects.toThrow(/WOFF 1\.0/);
    await expect(toSfnt(new TextEncoder().encode("<html>"))).rejects.toThrow(/does not start like a font/);
  });
});

describe("inspectFont, Inter digits subset (TTF, variable)", () => {
  it("reports the axes with their named instances", async () => {
    const report = await inspectFont(LATIN);
    expect(report.format).toBe("ttf");
    expect(report.decompressed).toBe(false);
    expect(report.names.family).toBe("Inter Variable");
    expect(report.names.licence).toMatch(/SIL Open Font License/);
    expect(report.axes).toEqual([
      { tag: "opsz", name: "Optical size", min: 14, default: 14, max: 32 },
      { tag: "wght", name: "Weight", min: 100, default: 400, max: 900 },
    ]);
    expect(report.instances.map((instance) => instance.name)).toEqual([
      "Thin",
      "ExtraLight",
      "Light",
      "Regular",
      "Medium",
      "SemiBold",
      "Bold",
      "ExtraBold",
      "Black",
    ]);
    expect(report.instances[3]).toEqual({ name: "Regular", coordinates: { opsz: 14, wght: 400 } });
  });

  it("reports the metrics the roles pair fonts by", async () => {
    const report = await inspectFont(LATIN);
    expect(report.metrics).toEqual({
      upem: 2048,
      xHeight: 1118,
      capHeight: 1490,
      ascender: 1984,
      descender: -494,
      lineGap: 0,
    });
  });

  it("names the features the subset kept, with the font's own labels", async () => {
    const report = await inspectFont(LATIN);
    const gsub = report.features.filter((feature) => feature.table === "GSUB");
    expect(gsub.map((feature) => feature.tag)).toEqual(["cv01", "cv09", "pnum", "ss01", "ss02", "tnum", "zero"]);
    expect(gsub.find((feature) => feature.tag === "ss01")?.uiName).toBe("Open digits");
    expect(gsub.find((feature) => feature.tag === "cv09")?.uiName).toBe("Flat-top three");
    // A feature is shown by what it does, not only by its tag.
    expect(gsub.find((feature) => feature.tag === "zero")?.changes).toEqual([{ before: "zero", after: "zero.slash" }]);
  });

  it("counts the features against the full release when that is known", async () => {
    const report = await inspectFont(LATIN);
    expect(report.gsubTagCount).toBe(7);
    expect(report.knownFullGsubTagCount).toBe(39);
    expect(featureCountSentence(report)).toBe(
      "this file has 7 of the 39 GSUB features of the full Inter Variable release: a web subset drops the rest",
    );
  });

  it("finds the Latin digits proportional until tnum is asked for", async () => {
    const report = await inspectFont(LATIN);
    const plain = row(report, "latin", "none");
    expect(plain.present).toBe(true);
    expect(plain.verdict).toBe("proportional");
    expect(plain.advances).toEqual([1292, 833, 1249, 1265, 1323, 1215, 1270, 1159, 1267, 1270]);
    expect(plain.distinct).toBe(9);

    const tabular = row(report, "latin", "tnum");
    expect(tabular.verdict).toBe("tabular");
    expect(new Set(tabular.advances)).toEqual(new Set([1328]));
    expect(digitSummary(tabular, report.metrics.upem)).toBe(
      "Latin with tnum: tabular, all ten advances 1328 units (0.648 em)",
    );
  });

  it("keeps pair kerning out of the per-digit advances", async () => {
    const report = await inspectFont(LATIN);
    // This subset carries no GPOS, so the run agrees with the glyphs; the
    // full Inter kerns the seven before the eight and does not.
    expect(row(report, "latin", "none").runAdvances).toEqual(row(report, "latin", "none").advances);
    expect(runAgrees(row(report, "latin", "none"))).toBe(true);
    expect(report.features.some((feature) => feature.table === "GPOS")).toBe(false);
  });

  it("refuses to call digits it does not have tabular", async () => {
    const report = await inspectFont(LATIN);
    const arabic = row(report, "arabic-indic", "tnum");
    expect(arabic.glyphIds).toEqual(Array(10).fill(0));
    // Ten equal .notdef advances: the trap the glyph-0 assertion is for.
    expect(new Set(arabic.advances).size).toBe(1);
    expect(arabic.present).toBe(false);
    expect(arabic.verdict).toBe("absent");
    expect(digitSummary(arabic, report.metrics.upem)).toContain("not in this file");
  });
});

describe("inspectFont, Noto Sans Arabic digits subset (WOFF2)", () => {
  it("measures the decoded bytes, not the compressed file", async () => {
    const report = await inspectFont(ARABIC);
    expect(report.format).toBe("woff2");
    expect(report.decompressed).toBe(true);
    expect(report.sfntBytes).toBeGreaterThan(ARABIC.byteLength);
    expect(report.names.family).toBe("Noto Sans Arabic");
    expect(report.metrics.upem).toBe(1000);
  });

  it("finds the Arabic-Indic digits tabular with and without tnum", async () => {
    const report = await inspectFont(ARABIC);
    for (const feature of ["none", "tnum"] as const) {
      const arabic = row(report, "arabic-indic", feature);
      expect(arabic.present).toBe(true);
      expect(arabic.verdict).toBe("tabular");
      expect(arabic.advances).toEqual(Array(10).fill(572));
    }
  });

  it("reports the Latin digits as absent, not as tabular", async () => {
    const report = await inspectFont(ARABIC);
    const latin = row(report, "latin", "none");
    expect(latin.glyphIds).toEqual(Array(10).fill(0));
    expect(latin.verdict).toBe("absent");
  });

  it("says what it cannot compare", async () => {
    const report = await inspectFont(ARABIC);
    expect(report.gsubTagCount).toBe(2);
    expect(report.knownFullGsubTagCount).toBe(12);
    expect(featureCountSentence(report)).toBe(
      "this file has 2 of the 12 GSUB features of the full Noto Sans Arabic release: a web subset drops the rest",
    );
  });
});

describe("inspectFont, IBM Plex Sans Arabic Fontsource subset (WOFF2)", () => {
  // Not committed here: the file is the one the pinned devDependency
  // @fontsource/ibm-plex-sans-arabic ships, and the only proportional
  // right-to-left digit set this project has at hand.
  const PLEX_ARABIC = new Uint8Array(
    readFileSync(
      createRequire(import.meta.url).resolve(
        "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2",
      ),
    ),
  );

  it("records a right-to-left run in logical order, zero first", async () => {
    const report = await inspectFont(PLEX_ARABIC);
    for (const feature of ["none", "tnum"] as const) {
      const arabic = row(report, "arabic-indic", feature);
      expect(arabic.advances).toEqual([282, 263, 485, 630, 486, 526, 503, 531, 531, 508]);
      // Stored in logical order, zero first (the engine sorts HarfBuzz's
      // visual order by cluster). Only U+0667 changes in a run, 531 on its
      // own and 481 among other digits.
      expect(arabic.runAdvances).toEqual([282, 263, 485, 630, 486, 526, 503, 481, 531, 508]);
      expect(runAgrees(arabic)).toBe(false);
    }
  });
});

describe("digitSummary", () => {
  it("says so when a run does not agree with the glyphs' own advances", () => {
    // The shape of the IBM Plex Sans Arabic reading: ten real glyphs whose
    // advances change again in a run, because a contextual alternate takes
    // over among other digits.
    const summary = digitSummary(
      {
        set: "arabic-indic",
        feature: "tnum",
        present: true,
        glyphIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        advances: [282, 263, 485, 630, 486, 526, 503, 531, 531, 508],
        runAdvances: [282, 263, 485, 630, 486, 526, 503, 481, 531, 508],
        distinct: 9,
        runDistinct: 10,
        min: 263,
        max: 630,
        verdict: "proportional",
      },
      1000,
    );
    expect(summary).toContain("proportional, 9 distinct advances from 263 to 630 units");
    expect(summary).toContain("shaped as one run the ten advances are different again, 10 distinct from 263 to 630");
  });
});

describe("digitVerdict", () => {
  it("answers only about digits that are there", () => {
    expect(digitVerdict([600, 600, 600], true)).toBe("tabular");
    expect(digitVerdict([600, 601, 600], true)).toBe("proportional");
    // The shape of the IBM Plex Sans Arabic finding: ten real glyphs, ten
    // different advances, tnum asked for and nothing changed.
    expect(digitVerdict([282, 263, 485, 630, 486, 526, 503, 481, 531, 508], true)).toBe("proportional");
    expect(digitVerdict([472, 472, 472], false)).toBe("absent");
    expect(digitVerdict([], true)).toBe("absent");
  });
});
