// The dev server's guards. The endpoints run repository commands and write
// files, so what they refuse matters as much as what they do; these are the
// pure decisions behind that, tested without a server.
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PROTECTED_SNAPSHOTS,
  crossSiteReason,
  isSnapshotSlug,
  panelStateFrom,
  run,
  snapshotBody,
  snapshotSlug,
  tokenServer,
} from "./tokenServer";

const HOST = "127.0.0.1:5174";

const request = (headers: Record<string, string>) => ({ headers });

const post = (headers: Record<string, string> = {}) =>
  request({ host: HOST, "content-type": "application/json", ...headers });

describe("the cross-site guard", () => {
  it("accepts a same-origin POST that sends JSON", () => {
    expect(crossSiteReason(post({ origin: `http://${HOST}` }), true)).toBeNull();
  });

  it("accepts a request with no Origin at all, as curl sends", () => {
    expect(crossSiteReason(post(), true)).toBeNull();
    expect(crossSiteReason(request({ host: HOST }), false)).toBeNull();
  });

  it("refuses an Origin that is not this server", () => {
    expect(crossSiteReason(post({ origin: "http://evil.example" }), true)).toMatch(/cross-site/);
    // Same host, different port: still another origin.
    expect(crossSiteReason(post({ origin: "http://127.0.0.1:5173" }), true)).toMatch(/cross-site/);
  });

  it("refuses the opaque Origin a sandboxed frame sends", () => {
    expect(crossSiteReason(post({ origin: "null" }), true)).toMatch(/cross-site/);
  });

  it("refuses an Origin when the request has no Host to compare it with", () => {
    expect(crossSiteReason({ headers: { origin: `http://${HOST}` } }, false)).toMatch(/cross-site/);
  });

  it("refuses a body that is not declared as JSON, which is what a form can send", () => {
    for (const type of ["application/x-www-form-urlencoded", "text/plain", "multipart/form-data"]) {
      expect(crossSiteReason(post({ "content-type": type }), true)).toMatch(/application\/json/);
    }
    expect(crossSiteReason(request({ host: HOST }), true)).toMatch(/application\/json/);
  });

  it("takes the charset a browser appends to the content type", () => {
    expect(crossSiteReason(post({ "content-type": "application/json; charset=utf-8" }), true)).toBeNull();
  });

  it("does not ask a GET for a content type", () => {
    expect(crossSiteReason(request({ host: HOST, origin: `http://${HOST}` }), false)).toBeNull();
  });
});

describe("running a command", () => {
  it("keeps the output of a command that worked", async () => {
    const result = await run("echo built", process.cwd(), 10_000);
    expect(result.ok).toBe(true);
    expect(result.output.trim()).toBe("built");
  });

  it("kills a command that outlives its timeout and says so", async () => {
    const started = Date.now();
    const result = await run("sleep 30", process.cwd(), 300);
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/killed after 0\.3s/);
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});

type Handler = (request: IncomingMessage, response: ServerResponse, next: () => void) => void;

/** The plugin's middleware, wired up as Vite would wire it, so a test can
 * see what an endpoint answers rather than only what the guard decides. */
function middleware(): Handler {
  const plugin = tokenServer();
  const configResolved = plugin.configResolved as unknown as (config: { root: string }) => void;
  configResolved({ root: fileURLToPath(new URL("..", import.meta.url)) });
  const handlers: Handler[] = [];
  const configureServer = plugin.configureServer as unknown as (server: {
    middlewares: { use: (handler: Handler) => void };
  }) => void;
  configureServer({ middlewares: { use: (handler) => handlers.push(handler) } });
  const handler = handlers[0];
  if (!handler) throw new Error("the plugin registered no middleware");
  return handler;
}

/** Call the middleware and report what it sent, or "next" when it passed
 * the request on. Every refusal below answers before reading a body, so
 * nothing here runs a command or writes a file. */
async function call(headers: Record<string, string>, url = "/api/save", method = "POST") {
  const sent: { status: number; body: { error?: string } }[] = [];
  let passedOn = false;
  const response = {
    statusCode: 0,
    setHeader: () => undefined,
    end: (text: string) => sent.push({ status: response.statusCode, body: JSON.parse(text) as { error?: string } }),
  };
  middleware()({ url, method, headers } as unknown as IncomingMessage, response as unknown as ServerResponse, () => {
    passedOn = true;
  });
  await Promise.resolve();
  return { sent: sent[0], passedOn };
}

describe("the endpoints", () => {
  it("refuses a cross-site POST to either endpoint, before reading the body", async () => {
    for (const url of ["/api/build", "/api/save"]) {
      const { sent } = await call({ host: HOST, origin: "http://evil.example", "content-type": "application/json" }, url);
      expect(sent?.status).toBe(403);
      expect(sent?.body.error).toMatch(/cross-site/);
    }
  });

  it("refuses a POST that does not declare JSON, on either endpoint", async () => {
    for (const url of ["/api/build", "/api/save"]) {
      const { sent } = await call({ host: HOST, "content-type": "text/plain;charset=UTF-8" }, url);
      expect(sent?.status).toBe(403);
      expect(sent?.body.error).toMatch(/application\/json/);
    }
  });

  it("refuses a cross-site read of the repository state", async () => {
    const { sent } = await call({ host: HOST, origin: "http://evil.example" }, "/api/commit", "GET");
    expect(sent?.status).toBe(403);
  });

  it("answers a GET to a POST endpoint with 405", async () => {
    const { sent } = await call({ host: HOST }, "/api/save", "GET");
    expect(sent?.status).toBe(405);
  });

  it("leaves every other request to Vite", async () => {
    const { sent, passedOn } = await call({ host: HOST }, "/index.html", "GET");
    expect(sent).toBeUndefined();
    expect(passedOn).toBe(true);
  });
});

describe("the snapshot file name", () => {
  const at = new Date("2026-09-27T12:36:09.417Z");

  it("stamps an unnamed save with the time it was written", () => {
    expect(snapshotSlug("", at)).toBe("snapshot-20260927-123609");
    expect(snapshotSlug("   ", at)).toBe("snapshot-20260927-123609");
  });

  it("slugs a name the way the file system wants it", () => {
    expect(snapshotSlug("Tighter density, warmer amber", at)).toBe("tighter-density-warmer-amber");
  });

  it("does not default to the committed baseline", () => {
    expect(PROTECTED_SNAPSHOTS).toContain("stoa-default");
    expect(PROTECTED_SNAPSHOTS).not.toContain(snapshotSlug("", at));
  });

  it("recognises the baseline however it is typed, so the endpoint can refuse it", () => {
    for (const name of ["stoa-default", "Stoa Default", " stoa default "]) {
      expect(PROTECTED_SNAPSHOTS).toContain(snapshotSlug(name, at));
    }
  });

  it("accepts for reading only the names a save writes", () => {
    expect(isSnapshotSlug(snapshotSlug("", at))).toBe(true);
    expect(isSnapshotSlug("stoa-default")).toBe(true);
    for (const name of ["../secrets", "a/b", "Stoa-Default", "-leading", "trailing-", "with space", ""]) {
      expect(isSnapshotSlug(name), name).toBe(false);
    }
  });
});

describe("what a snapshot records", () => {
  const at = new Date("2026-09-27T12:36:09.417Z");
  const files = { "primitive.json": '{"color":{}}' };
  const body = (overrides: unknown = {}, panels?: unknown) =>
    snapshotBody({
      name: "",
      savedAt: at,
      slug: "snapshot-1",
      state: { commit: "abc", dirty: false },
      overrides,
      panels,
      files,
    });

  it("keeps the overrides beside the token files they are stated against", () => {
    const written = body({ "semantic.light:color.accent": "oklch(0.3 0.2 300)" });
    expect(written.overrides).toEqual({ "semantic.light:color.accent": "oklch(0.3 0.2 300)" });
    expect(written.tokens["primitive.json"]).toEqual({ color: {} });
    expect(written.name).toBe("snapshot-1");
  });

  it("names stoa-default as the base", () => {
    expect(body().base).toMatch(/^stoa-default: /);
  });

  it("keeps the panels beside the overrides, through the panel guard", () => {
    const panels = { type: { fonts: [{ family: "IBM Plex Sans" }] } };
    const written = body({}, panels);
    expect(written.panels).toEqual(panels);
    expect(body().panels).toEqual({});
    expect(() => body({}, { type: { src: "data:font/woff2;base64,AAAA" } })).toThrow(/embedded font data/);
  });
});

describe("what a snapshot records for the area panels", () => {
  it("keeps the panels' own state, by panel id", () => {
    const panels = { type: { roles: { body: { $type: "typography" } }, fonts: [{ family: "IBM Plex Sans" }] } };
    expect(panelStateFrom(panels)).toEqual(panels);
  });

  it("records nothing when no panel contributed anything", () => {
    expect(panelStateFrom(undefined)).toEqual({});
    expect(panelStateFrom(null)).toEqual({});
  });

  it("refuses anything but an object keyed by panel id", () => {
    expect(() => panelStateFrom([{ type: {} }])).toThrow(/keyed by panel id/);
    expect(() => panelStateFrom("type")).toThrow(/keyed by panel id/);
  });

  it("refuses embedded font data: a snapshot records references, not files", () => {
    const withFont = { type: { fonts: [{ family: "Inter", src: "data:font/woff2;base64,d09GMgABAAAAAA" }] } };
    expect(() => panelStateFrom(withFont)).toThrow(/must not carry embedded font data/);
    const asOctets = { type: { fonts: [{ src: "data:application/octet-stream;base64,AAEAAA" }] } };
    expect(() => panelStateFrom(asOctets)).toThrow(/must not carry embedded font data/);
  });

  it("refuses state too large to be a record of a session", () => {
    const big = { type: { note: "x".repeat(70_000) } };
    expect(() => panelStateFrom(big)).toThrow(/over the 65536 a snapshot records/);
  });
});
