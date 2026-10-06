// The dev-server endpoints in server/tokenServer.ts. The playground only
// ever runs against its own dev server, so there is no base URL to config-
// ure and no error handling beyond reporting what came back.

export type CommandResult = { ok: boolean; command: string; output: string };

export type BuildResult = {
  /** Commit the repository was on when the build ran. */
  commit: string;
  /** Whether the working tree had uncommitted changes at that moment. */
  dirty: boolean;
  build: CommandResult;
  test: CommandResult;
  /** The built tokens.css, empty when the build itself failed. */
  css: string;
};

export type SaveResult = { path: string; commit: string; dirty: boolean };

/** A refusal from the endpoint itself. The status is kept because the
 * snapshot panel treats "this name is taken" (409) as a question to the
 * user rather than as an error. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** The endpoint's own message, when it sent one. */
function reported(text: string): string | null {
  try {
    const error = (JSON.parse(text) as { error?: unknown }).error;
    return typeof error === "string" ? error : null;
  } catch {
    return null;
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, reported(text) ?? `${url}: ${response.status} ${text.slice(0, 400)}`);
  }
  return JSON.parse(text) as T;
}

/** Build and test the given token files in a temporary directory, with the
 * real packages/tokens build. */
export function requestBuild(files: Record<string, string>): Promise<BuildResult> {
  return post<BuildResult>("/api/build", { files });
}

/** Write a snapshot of the current token files, overrides and panel state.
 * An unnamed save is stamped with the time it was written. Without
 * `overwrite` the server refuses a name that is already on disk, and it
 * refuses the committed baseline whatever this says. */
export function saveSnapshot(payload: {
  name: string;
  files: Record<string, string>;
  overrides: Record<string, string>;
  /** What each area panel records, by panel id: font references and type
   * roles for the type panel. References, never font bytes. */
  panels?: Record<string, unknown>;
  overwrite?: boolean;
}): Promise<SaveResult> {
  return post<SaveResult>("/api/save", payload);
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new ApiError(response.status, reported(text) ?? `${url}: ${response.status}`);
  return JSON.parse(text) as T;
}

/** The snapshots on disk, by the name a load asks for. */
export async function listSnapshots(): Promise<string[]> {
  return (await get<{ names: string[] }>("/api/snapshots")).names;
}

/** One snapshot as it was written. The caller reads the layers out of it;
 * this only fetches. */
export function readSnapshotFile(name: string): Promise<unknown> {
  return get<unknown>(`/api/snapshots?name=${encodeURIComponent(name)}`);
}

export async function readCommit(): Promise<{ commit: string; dirty: boolean }> {
  const response = await fetch("/api/commit");
  if (!response.ok) throw new Error(`/api/commit: ${response.status}`);
  return (await response.json()) as { commit: string; dirty: boolean };
}
