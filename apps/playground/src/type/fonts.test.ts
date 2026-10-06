// A snapshot must carry the reference and not the file. This is the test of
// that promise, and of the identity a loaded font is keyed by.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectFont } from "./engine.ts";
import { byteDigest, fontLicence, fontReference, loadedFont } from "./fonts.ts";

const bytes = () => {
  const file = readFileSync(new URL("./testdata/Inter-digits-subset.ttf", import.meta.url));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
};

const load = async () =>
  loadedFont(await inspectFont(bytes()), bytes(), { kind: "file", name: "Inter-digits-subset.ttf", bytes: 15484 });

describe("byteDigest", () => {
  it("is the same for the same bytes and different for different ones", () => {
    expect(byteDigest(bytes())).toBe(byteDigest(bytes()));
    expect(byteDigest(new Uint8Array([1, 2, 3]).buffer)).not.toBe(byteDigest(new Uint8Array([1, 2, 4]).buffer));
  });
});

describe("loadedFont", () => {
  it("keys a font by family and content, and registers under its own name", async () => {
    const font = await load();
    expect(font.id.startsWith("Inter Variable-")).toBe(true);
    // Not "Inter Variable": a font of that name installed on the machine
    // would otherwise be what the previews showed.
    expect(font.cssFamily).toMatch(/^StoaLoadedInterVariable[a-z0-9]+$/);
  });
});

describe("fontLicence", () => {
  it("prefers what the file itself states", async () => {
    const font = await load();
    expect(fontLicence(font)).toMatch(/SIL Open Font License/);
  });

  it("falls back to the catalogue, then to the URL, then to saying nothing is stated", async () => {
    const font = await load();
    const silent = { ...font, report: { ...font.report, names: { ...font.report.names, licence: "  " } } };
    // A subsetter can drop the licence text and keep the URL, which the
    // Fontsource builds of IBM Plex do.
    expect(fontLicence({ ...silent, source: { kind: "file", name: "x.ttf", bytes: 1 } })).toBe(
      "the file states no licence text, only a licence URL",
    );
    const mute = { ...silent, report: { ...silent.report, names: { ...silent.report.names, licenceUrl: "" } } };
    expect(fontLicence({ ...mute, source: { kind: "file", name: "x.ttf", bytes: 1 } })).toBe(
      "the file states no licence",
    );
    expect(
      fontLicence({
        ...silent,
        source: { kind: "fontsource", id: "inter", url: "https://cdn.example/x.woff2", licence: "OFL-1.1" },
      }),
    ).toBe("Fontsource records: OFL-1.1");
  });
});

describe("fontReference", () => {
  it("records what the font is and what it measured", async () => {
    const reference = fontReference(await load());
    expect(reference).toMatchObject({
      family: "Inter Variable",
      format: "ttf",
      sfntBytes: 15484,
      axes: ["opsz", "wght"],
      gsubTagCount: 7,
      knownFullGsubTagCount: 39,
    });
    expect(reference.metrics.xHeight).toBe(1118);
    expect(reference.digits).toHaveLength(4);
    expect(reference.digits.find((row) => row.set === "latin" && row.feature === "tnum")?.verdict).toBe("tabular");
  });

  it("carries no font data at all", async () => {
    const reference = fontReference(await load());
    const text = JSON.stringify(reference);
    expect(text).not.toContain("bytes\":{");
    expect("bytes" in reference).toBe(false);
    // The whole reference is small: a file would not be.
    expect(text.length).toBeLessThan(2000);
    // And it round-trips through JSON, which is what the save endpoint does.
    expect(JSON.parse(text)).toEqual(reference);
  });
});
