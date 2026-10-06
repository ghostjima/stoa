// What the main thread and the font worker say to each other. It is its own
// module so that the client can be typed without importing the worker, and
// so HarfBuzz and the WOFF2 decoder stay out of the main bundle.
import type { FontReport } from "./report.ts";

export type InspectRequest = {
  id: number;
  /** The file as it was dropped or fetched: still WOFF2 if that is what it
   * was, because decoding is the worker's job. */
  bytes: ArrayBuffer;
};

export type InspectResponse =
  | { id: number; ok: true; report: FontReport }
  | { id: number; ok: false; error: string };
