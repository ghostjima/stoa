// The main thread's side of the font worker: one worker for the page, one
// request per file, answered by id.
//
// The worker's lifetime is the page's, not a component's. It is created on
// the first request and again if it ever fails, and the panel does not own
// it: a panel that stopped the worker when it unmounted would leave a dead
// engine behind the first time React's strict mode mounts, unmounts and
// mounts the panel again, and every later request would wait for ever.
import type { FontReport } from "./report.ts";
import type { InspectRequest, InspectResponse } from "./protocol.ts";

export type FontEngine = {
  inspect(bytes: ArrayBuffer): Promise<FontReport>;
};

type Pending = { resolve: (report: FontReport) => void; reject: (error: Error) => void };

export function createFontEngine(): FontEngine {
  const pending = new Map<number, Pending>();
  let worker: Worker | null = null;
  let nextId = 1;

  const ensureWorker = (): Worker => {
    if (worker) return worker;
    const started = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
      name: "stoa-font-engine",
    });
    started.onmessage = (event: MessageEvent<InspectResponse>) => {
      const message = event.data;
      const waiting = pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id);
      if (message.ok) waiting.resolve(message.report);
      else waiting.reject(new Error(message.error));
    };
    // A worker that fails to start (a bad import, a blocked module) would
    // otherwise leave every request hanging. The next request starts a new
    // one, so one bad load is not the end of the engine.
    started.onerror = (event) => {
      worker = null;
      started.terminate();
      const error = new Error(`the font worker failed: ${event.message || "no message"}`);
      for (const [id, waiting] of pending) {
        pending.delete(id);
        waiting.reject(error);
      }
    };
    worker = started;
    return started;
  };

  return {
    inspect(bytes) {
      const id = nextId++;
      const request: InspectRequest = { id, bytes };
      return new Promise<FontReport>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ensureWorker().postMessage(request);
      });
    },
  };
}

let shared: FontEngine | null = null;

/** The page's font engine. */
export function fontEngine(): FontEngine {
  shared ??= createFontEngine();
  return shared;
}
