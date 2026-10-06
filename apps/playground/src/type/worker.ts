// The font engine, off the main thread. The HarfBuzz WASM is about 175 KB
// gzipped and shaping every digit four ways plus every feature twice is
// enough work to drop a frame, so the whole engine runs here and the panel
// only ever receives a report.
//
// The message listener is registered before anything else runs, and the
// engine is imported on the first request. HarfBuzz initialises its WASM
// with a top-level await; a static import of the engine would delay this
// module's evaluation, and with it the listener, until that await settled.
// Requests that arrived in between were dropped on some loads, which showed
// up as a panel that never listed the shipped families (about one load in
// nine on a warm dev server, every load on a cold one).
import type { InspectRequest, InspectResponse } from "./protocol.ts";

let engine: Promise<typeof import("./engine.ts")> | null = null;

const reply = (message: InspectResponse) => {
  self.postMessage(message);
};

self.addEventListener("message", (event: MessageEvent<InspectRequest>) => {
  const { id, bytes } = event.data;
  engine ??= import("./engine.ts");
  void engine
    .then(({ inspectFont }) => inspectFont(bytes))
    .then(
      (report) => reply({ id, ok: true, report }),
      // A file that cannot be read is reported as a refusal with its reason;
      // the panel shows it instead of showing measurements of nothing.
      (cause: unknown) => reply({ id, ok: false, error: cause instanceof Error ? cause.message : String(cause) }),
    );
});
