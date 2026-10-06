// The playground's dev-server endpoints. Editing tokens in the browser is
// a guess until the real build agrees, so the server runs the real
// packages/tokens build and its tests on the edited files, in a temporary
// directory, and never touches the working tree except to write snapshots.
//
// Development only (`apply: "serve"`): it runs repository commands and must
// not exist in a built bundle. Because it runs commands and writes files,
// every endpoint refuses a cross-site request (`crossSiteReason`), and a
// save never writes over an existing snapshot unless the request asks for
// it, nor over the committed baseline at all.
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Plugin } from "vite";

const execFileAsync = promisify(execFile);

/** The only files the client may write into the temporary token package. */
const TOKEN_FILES = ["primitive.json", "semantic.light.json", "semantic.dark.json", "density.json"];

/** Cap on a request body: the four token files are a few kilobytes. */
const MAX_BODY = 1 << 20;

/** Cap on what the area panels record in a snapshot. Font references and
 * six type roles are a few kilobytes; a font file is not. */
const MAX_PANEL_STATE = 64 << 10;

/** How long the token build or its tests may run before the request fails.
 * A build that hangs would otherwise hold the request open for ever. */
const BUILD_TIMEOUT_MS = 120_000;

/** How long a git query may run. It reads the working tree and nothing else. */
const GIT_TIMEOUT_MS = 10_000;

/** Snapshots the server never writes over. `stoa-default` is committed and
 * is the base every override is stated against. */
export const PROTECTED_SNAPSHOTS = ["stoa-default"];

type CommandResult = { ok: boolean; command: string; output: string };

function findRepoRoot(from: string): string {
  let dir = path.resolve(from);
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const up = path.dirname(dir);
    if (up === dir) throw new Error(`no pnpm-workspace.yaml above ${from}`);
    dir = up;
  }
  return dir;
}

/** Run one command and report how it went. Exported for the test of the
 * timeout: a build that hangs must fail the request, not hold it open. */
export async function run(command: string, cwd: string, timeout = BUILD_TIMEOUT_MS): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
      cwd,
      maxBuffer: 1 << 24,
      timeout,
      // The shell is killed outright: a build that ignores SIGTERM would
      // keep the request waiting past the timeout it was given.
      killSignal: "SIGKILL",
    });
    return { ok: true, command, output: `${stdout}${stderr}` };
  } catch (cause) {
    const failure = cause as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    const output = `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
    if (failure.killed) {
      const timedOut = `${command}: killed after ${timeout / 1000}s, the timeout for this command`;
      return { ok: false, command, output: output ? `${output}\n${timedOut}` : timedOut };
    }
    return { ok: false, command, output: output || failure.message || "the command failed" };
  }
}

/** The host part of an `Origin` header, or null when it is not a URL. The
 * opaque origin `null`, which a sandboxed frame sends, lands here as null
 * and so counts as cross-site. */
function originHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

/** Why this request must not be served, or null when it may be.
 *
 * These endpoints run repository commands and write files, so a page on
 * another origin must not reach them. A browser sends `Origin` on every
 * cross-site request, and a form post, the one cross-site POST that needs
 * no preflight, cannot set `content-type: application/json`; the two
 * checks together leave only same-origin callers. A request with no
 * `Origin` at all (curl, a same-origin GET in older browsers) is allowed. */
export function crossSiteReason(request: { headers: IncomingMessage["headers"] }, requireJson: boolean): string | null {
  const { origin, host } = request.headers;
  if (typeof origin === "string") {
    if (typeof host !== "string" || originHost(origin) !== host) {
      return `cross-site request refused: Origin ${origin} is not this server (${host ?? "no Host header"})`;
    }
  }
  if (requireJson) {
    const type = request.headers["content-type"] ?? "";
    if (type.split(";")[0]?.trim().toLowerCase() !== "application/json") {
      return `content-type must be application/json, not ${type || "(absent)"}`;
    }
  }
  return null;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY) throw new Error("request body too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function send(response: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(text);
}

async function repositoryState(repoRoot: string): Promise<{ commit: string; dirty: boolean }> {
  const commit = await run("git rev-parse HEAD", repoRoot, GIT_TIMEOUT_MS);
  const status = await run("git status --porcelain", repoRoot, GIT_TIMEOUT_MS);
  return { commit: commit.output.trim() || "unknown", dirty: status.output.trim() !== "" };
}

/** The files as sent by the client, with the file names checked. */
function tokenFilesFrom(body: unknown): Record<string, string> {
  const files = (body as { files?: unknown }).files;
  if (typeof files !== "object" || files === null) throw new Error("no token files in the request");
  const out: Record<string, string> = {};
  for (const [name, text] of Object.entries(files as Record<string, unknown>)) {
    if (!TOKEN_FILES.includes(name)) throw new Error(`unexpected token file: ${name}`);
    if (typeof text !== "string") throw new Error(`token file ${name} is not text`);
    JSON.parse(text);
    out[name] = text;
  }
  for (const name of TOKEN_FILES) {
    if (!(name in out)) throw new Error(`token file ${name} is missing`);
  }
  return out;
}

/** What the area panels record in a snapshot, by panel id.
 *
 * A snapshot is a record of a tuning session, not a place to keep font
 * files: the type panel sends references, and anything that looks like
 * embedded font data is refused here as well, so a future panel cannot make
 * this directory a font store by accident. */
export function panelStateFrom(panels: unknown): Record<string, unknown> {
  if (panels === undefined || panels === null) return {};
  if (typeof panels !== "object" || Array.isArray(panels)) throw new Error("panels must be an object keyed by panel id");
  const text = JSON.stringify(panels);
  if (/data:(application|font)\/[^;]*;base64/i.test(text)) {
    throw new Error("panel state must not carry embedded font data, only references to files");
  }
  if (text.length > MAX_PANEL_STATE) {
    throw new Error(`panel state is ${text.length} bytes, over the ${MAX_PANEL_STATE} a snapshot records`);
  }
  return panels as Record<string, unknown>;
}

/** Build and test the given token files with the real packages/tokens
 * scripts, in a temporary copy of the package. */
async function buildInTemp(repoRoot: string, files: Record<string, string>) {
  const tokensPackage = path.join(repoRoot, "packages", "tokens");
  const manifest = JSON.parse(await readFile(path.join(tokensPackage, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const buildCommand = manifest.scripts.build;
  const testCommand = manifest.scripts.test;
  if (!buildCommand || !testCommand) throw new Error("packages/tokens has no build or test script");

  const dir = await mkdtemp(path.join(tmpdir(), "stoa-playground-"));
  try {
    await mkdir(path.join(dir, "tokens"), { recursive: true });
    for (const [name, text] of Object.entries(files)) {
      await writeFile(path.join(dir, "tokens", name), text);
    }
    // Everything the package's scripts and tests read (scripts, sources,
    // recorded violations, the manifest), except the token files under test,
    // the build output and the installed dependencies.
    for (const entry of await readdir(tokensPackage)) {
      if (["tokens", "dist", "node_modules"].includes(entry)) continue;
      await cp(path.join(tokensPackage, entry), path.join(dir, entry), { recursive: true });
    }
    // style-dictionary and culori come from the real package rather than a
    // second install, so the build here is the build there.
    await symlink(path.join(tokensPackage, "node_modules"), path.join(dir, "node_modules"), "dir");

    const build = await run(buildCommand, dir);
    const test = build.ok
      ? await run(testCommand, dir)
      : { ok: false, command: testCommand, output: "not run: the build failed" };
    const css = build.ok ? await readFile(path.join(dir, "dist", "tokens.css"), "utf8").catch(() => "") : "";
    return { build, test, css };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The file name a save writes, without the extension. An unnamed save is
 * stamped with the moment it was written, to the second, so it never lands
 * on an earlier save. */
export function snapshotSlug(name: string, now: Date): string {
  const slug = slugify(name);
  if (slug !== "") return slug;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "").replace("T", "-");
  return `snapshot-${stamp}`;
}

/** The names a read may ask for: exactly what `snapshotSlug` writes. A
 * name is a file name here, so anything else is refused rather than
 * cleaned up. */
export function isSnapshotSlug(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(name) && name === slugify(name);
}

/** What a save writes. The overrides are what the app restores from;
 * `panels` is what each area panel records (`panelStateFrom`
 * refuses anything else); `tokens` is the token sources the overrides are
 * stated against, as text the real build would read. */
export function snapshotBody(input: {
  name: string;
  savedAt: Date;
  slug: string;
  state: { commit: string; dirty: boolean };
  overrides: unknown;
  panels?: unknown;
  files: Record<string, string>;
}) {
  const named = input.name.trim();
  return {
    name: named === "" ? input.slug : named,
    savedAt: input.savedAt.toISOString(),
    commit: input.state.commit,
    dirty: input.state.dirty,
    base: "stoa-default: the token files of packages/tokens at this commit",
    overrides: (input.overrides ?? {}) as Record<string, string>,
    panels: panelStateFrom(input.panels),
    tokens: Object.fromEntries(Object.entries(input.files).map(([file, text]) => [file, JSON.parse(text)])),
  };
}

export function tokenServer(): Plugin {
  let repoRoot = "";
  let appRoot = "";

  return {
    name: "stoa-playground-token-server",
    apply: "serve",
    configResolved(config) {
      appRoot = config.root;
      repoRoot = findRepoRoot(config.root);
    },
    configureServer(server) {
      server.middlewares.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
        const target = new URL(request.url ?? "/", "http://playground.invalid");
        const url = target.pathname;
        if (url !== "/api/build" && url !== "/api/save" && url !== "/api/commit" && url !== "/api/snapshots") {
          next();
          return;
        }

        void (async () => {
          try {
            if (url === "/api/commit") {
              const reason = crossSiteReason(request, false);
              if (reason) {
                send(response, 403, { error: reason });
                return;
              }
              send(response, 200, await repositoryState(repoRoot));
              return;
            }

            // Reading snapshots back: the list, or one of them by the slug
            // the list gives. It touches nothing outside snapshots/.
            if (url === "/api/snapshots") {
              const reason = crossSiteReason(request, false);
              if (reason) {
                send(response, 403, { error: reason });
                return;
              }
              if (request.method !== "GET") {
                send(response, 405, { error: "GET only" });
                return;
              }
              const dir = path.join(appRoot, "snapshots");
              const asked = target.searchParams.get("name");
              if (asked === null) {
                const files = await readdir(dir).catch(() => []);
                send(response, 200, { names: files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort() });
                return;
              }
              if (!isSnapshotSlug(asked)) {
                send(response, 400, { error: `${asked} is not a snapshot name` });
                return;
              }
              const text = await readFile(path.join(dir, `${asked}.json`), "utf8").catch(() => null);
              if (text === null) {
                send(response, 404, { error: `no snapshot named ${asked}` });
                return;
              }
              send(response, 200, JSON.parse(text));
              return;
            }
            if (request.method !== "POST") {
              send(response, 405, { error: "POST only" });
              return;
            }
            const reason = crossSiteReason(request, true);
            if (reason) {
              send(response, 403, { error: reason });
              return;
            }
            const body = await readBody(request);
            const files = tokenFilesFrom(body);

            if (url === "/api/build") {
              const state = await repositoryState(repoRoot);
              const result = await buildInTemp(repoRoot, files);
              send(response, 200, { ...state, ...result });
              return;
            }

            // A save is refused before anything is read or run.
            const { name, overrides, panels, overwrite } = body as {
              name?: unknown;
              overrides?: unknown;
              panels?: unknown;
              overwrite?: unknown;
            };
            const savedAt = new Date();
            const slug = snapshotSlug(typeof name === "string" ? name : "", savedAt);
            if (PROTECTED_SNAPSHOTS.includes(slug)) {
              send(response, 403, {
                error: `${slug} is committed as the base every override is stated against and is never written over; save under another name`,
              });
              return;
            }
            const file = path.join(appRoot, "snapshots", `${slug}.json`);
            if (existsSync(file) && overwrite !== true) {
              send(response, 409, {
                error: `${path.relative(repoRoot, file)} exists; save under another name, or press Replace to write over it`,
                exists: true,
              });
              return;
            }
            const state = await repositoryState(repoRoot);
            const snapshot = snapshotBody({
              name: typeof name === "string" ? name : "",
              savedAt,
              slug,
              state,
              overrides,
              panels,
              files,
            });
            await mkdir(path.dirname(file), { recursive: true });
            await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`);
            send(response, 200, { path: path.relative(repoRoot, file), commit: state.commit, dirty: state.dirty });
          } catch (cause) {
            send(response, 400, { error: cause instanceof Error ? cause.message : String(cause) });
          }
        })();
      });
    },
  };
}
