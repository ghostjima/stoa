// A dropped file is not yet a font HarfBuzz can shape with.
//
// HarfBuzz given a WOFF2 file does not fail: it reads the compressed bytes
// as a face, every code point maps to glyph id 0, and .notdef has one
// advance, so a check that only compares advances reports "tabular" for a
// file it never read. The pitfall is the reason this module exists: the
// bytes are brought to an sfnt (a plain TTF or OTF) before anything is
// measured, and `engine.ts` asserts that no digit landed on glyph 0.
//
// WOFF 1.0 is refused rather than decoded. It is per-table zlib, which the
// browser cannot undo (DecompressionStream has gzip and deflate, and the
// table directory still has to be rebuilt), and no catalogue this tool
// loads from serves it.
//
// The decoder is woff2-encoder (MIT), not wawoff2 (MIT), which the brief
// named: wawoff2's Emscripten build decides what it is running in by
// `typeof importScripts === "function"`, and a module worker has no
// `importScripts`, so the module never finishes starting and every decode
// waits for ever. Measured here: in a module worker its exports stay empty
// and `calledRun` never becomes true. woff2-encoder carries its WASM as a
// data URI and has no such branch, so it decodes in the worker, on the main
// thread and in Node.
import decompressWoff2 from "woff2-encoder/decompress";

export type FontFormat = "ttf" | "otf" | "ttc" | "woff" | "woff2" | "unknown";

export type Sfnt = {
  /** TTF or OTF bytes, ready for HarfBuzz. */
  bytes: Uint8Array;
  /** What the file was before this module touched it. */
  format: FontFormat;
  /** Whether those bytes came out of a WOFF2 decode. */
  decompressed: boolean;
};

const tagAt = (bytes: Uint8Array, at: number): string =>
  String.fromCharCode(bytes[at] ?? 0, bytes[at + 1] ?? 0, bytes[at + 2] ?? 0, bytes[at + 3] ?? 0);

/** What the first four bytes say the file is. */
export function sniffFormat(bytes: Uint8Array): FontFormat {
  if (bytes.length < 4) return "unknown";
  const tag = tagAt(bytes, 0);
  if (tag === "wOF2") return "woff2";
  if (tag === "wOFF") return "woff";
  if (tag === "OTTO") return "otf";
  if (tag === "ttcf") return "ttc";
  if (tag === "true" || tag === "typ1") return "ttf";
  // 0x00010000, the TrueType version number.
  if (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0) return "ttf";
  return "unknown";
}

/** The file as an sfnt, decoding WOFF2 on the way. Throws on a format this
 * tool does not read, so a file that cannot be measured is reported as
 * such instead of measured wrongly. */
export async function toSfnt(input: Uint8Array | ArrayBuffer): Promise<Sfnt> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const format = sniffFormat(bytes);
  if (format === "woff2") {
    const decoded = new Uint8Array(await decompressWoff2(bytes));
    const inner = sniffFormat(decoded);
    if (inner !== "ttf" && inner !== "otf") {
      throw new Error(`the WOFF2 decode produced ${inner} bytes, not a TTF or OTF`);
    }
    return { bytes: decoded, format, decompressed: true };
  }
  if (format === "woff") {
    throw new Error("WOFF 1.0 is not read here: convert the file to WOFF2, TTF or OTF and load it again");
  }
  if (format === "unknown") {
    throw new Error("this file does not start like a font (expected a TTF, OTF, TTC or WOFF2 signature)");
  }
  return { bytes, format, decompressed: false };
}
