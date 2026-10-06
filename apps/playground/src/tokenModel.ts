// Stoa's token sources, resolved the way the Style Dictionary build
// resolves them. Previews are re-themed by writing the resolved variables
// on a preview container, which is fast enough to keep up with typing;
// `builtCss.ts` checks the agreement between these values and the real
// build's output, so a drift here is reported rather than believed.
//
// The sources are read from packages/tokens directly instead of through
// the package's exports: this is a private tool, the token files are the
// thing being edited, and a copy would go stale.
import primitiveJson from "../../../packages/tokens/tokens/primitive.json";
import semanticLightJson from "../../../packages/tokens/tokens/semantic.light.json";
import semanticDarkJson from "../../../packages/tokens/tokens/semantic.dark.json";
import densityJson from "../../../packages/tokens/tokens/density.json";

/** A DTCG `$value`: a literal, a number, or a list (font stacks, beziers). */
export type TokenValue = string | number | (string | number)[];

/** A DTCG group or token. Groups carry `$type` for their children. */
export type TokenNode = {
  $type?: string;
  $value?: TokenValue;
  [child: string]: TokenNode | TokenValue | undefined;
};

export type TokenFileName = "primitive" | "semantic.light" | "semantic.dark" | "density";
export type TokenFiles = Record<TokenFileName, TokenNode>;

/** File name on disk under packages/tokens/tokens, per token file. */
export const TOKEN_FILE_NAMES: Record<TokenFileName, string> = {
  primitive: "primitive.json",
  "semantic.light": "semantic.light.json",
  "semantic.dark": "semantic.dark.json",
  density: "density.json",
};

export type Theme = "light" | "dark";
export type DensityMode = "compact" | "regular" | "comfortable";
export const DENSITY_MODES: DensityMode[] = ["compact", "regular", "comfortable"];

/** Edits against the base, by token id. The value is the DTCG `$value` as
 * typed: `oklch(...)`, `12px`, a number, or a `{reference}`. */
export type Overrides = Record<string, string>;

// The JSON imports are the DTCG sources; their shape is what the real
// build validates, so they are taken as token trees here.
const asNode = (json: unknown): TokenNode => json as TokenNode;

export const baseTokens: TokenFiles = {
  primitive: asNode(primitiveJson),
  "semantic.light": asNode(semanticLightJson),
  "semantic.dark": asNode(semanticDarkJson),
  density: asNode(densityJson),
};

export type TokenEntry = {
  /** `semantic.light:color.bid`: the file and the path inside it. */
  id: string;
  file: TokenFileName;
  path: string[];
  /** DTCG `$type`, inherited from the nearest group that states one. */
  type: string;
  /** CSS custom property the build emits for this token. */
  variable: string;
  value: TokenValue;
};

function isNode(value: TokenNode | TokenValue | undefined): value is TokenNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The build names density tokens by mode selector, not by path, so
 * `compact.row-height` and `regular.row-height` share one variable. */
function variableName(file: TokenFileName, path: string[]): string {
  if (file === "density") return `--stoa-density-${path[path.length - 1] ?? ""}`;
  return `--stoa-${path.join("-")}`;
}

export function tokenId(file: TokenFileName, path: string[]): string {
  return `${file}:${path.join(".")}`;
}

/** Every token in one file, depth first, in source order. */
export function flattenFile(file: TokenFileName, root: TokenNode): TokenEntry[] {
  const out: TokenEntry[] = [];
  const walk = (node: TokenNode, path: string[], inherited: string) => {
    const type = node.$type ?? inherited;
    if (node.$value !== undefined) {
      out.push({ id: tokenId(file, path), file, path, type, variable: variableName(file, path), value: node.$value });
      return;
    }
    for (const key of Object.keys(node)) {
      if (key.startsWith("$")) continue;
      const child = node[key];
      if (isNode(child)) walk(child, [...path, key], type);
    }
  };
  walk(root, [], "");
  return out;
}

const REFERENCE = /\{([^}]+)\}/g;
/** A font family name is quoted when it contains a space, as the build does. */
const quoteFamily = (name: string) => (/\s/.test(name) ? `'${name}'` : name);

type Lookup = Map<string, TokenEntry>;
type Effective = (entry: TokenEntry) => TokenValue;

function resolveText(text: string, byPath: Lookup, effective: Effective, seen: string[]): string {
  return text.replace(REFERENCE, (whole, reference: string) => {
    const target = byPath.get(reference);
    // An unresolved or circular reference stays visible: the real build
    // fails on it, and the verification panel reports the disagreement.
    if (!target || seen.includes(target.id)) return whole;
    return formatValue(target.type, effective(target), byPath, effective, [...seen, target.id]);
  });
}

/** One token's CSS text, with references resolved to literals. */
export function formatValue(type: string, value: TokenValue, byPath: Lookup, effective: Effective, seen: string[] = []): string {
  if (Array.isArray(value)) {
    const parts = value.map((item) => (typeof item === "number" ? String(item) : resolveText(item, byPath, effective, seen)));
    if (type === "cubicBezier") return `cubic-bezier(${parts.join(", ")})`;
    if (type === "fontFamily") return parts.map(quoteFamily).join(", ");
    return parts.join(", ");
  }
  if (typeof value === "number") return String(value);
  return resolveText(value, byPath, effective, seen);
}

export type ResolvedTokens = {
  /** CSS custom property name to literal value, for a preview container. */
  variables: Record<string, string>;
  /** Per token id, the value with and without the override layer. */
  values: Record<string, { derived: string; effective: string }>;
};

/** The variables one preview frame needs: primitives, the theme's
 * semantics, and one density mode. */
export function resolveTokens(files: TokenFiles, overrides: Overrides, theme: Theme, density: DensityMode): ResolvedTokens {
  const semantic: TokenFileName = theme === "dark" ? "semantic.dark" : "semantic.light";
  const entries = [
    ...flattenFile("primitive", files.primitive),
    ...flattenFile(semantic, files[semantic]),
    ...flattenFile("density", files.density).filter((e) => e.path[0] === density),
  ];
  const byPath: Lookup = new Map();
  for (const entry of entries) {
    if (entry.file !== "density") byPath.set(entry.path.join("."), entry);
  }

  const overridden: Effective = (entry) => overrides[entry.id] ?? entry.value;
  const derived: Effective = (entry) => entry.value;

  const variables: Record<string, string> = {};
  const values: ResolvedTokens["values"] = {};
  for (const entry of entries) {
    const effective = formatValue(entry.type, overridden(entry), byPath, overridden, [entry.id]);
    variables[entry.variable] = effective;
    values[entry.id] = { derived: formatValue(entry.type, derived(entry), byPath, derived, [entry.id]), effective };
  }
  return { variables, values };
}

/** Derived and effective values for every token in every file, which is
 * what the override markers in the control panel need: `resolveTokens`
 * only covers one theme and one density mode.
 *
 * References are looked up among the primitives alone. No semantic token
 * is referenced by another token, so both semantic files can be flattened
 * together here without their shared names colliding. */
export function resolveAllValues(files: TokenFiles, overrides: Overrides): ResolvedTokens["values"] {
  const entries = (Object.keys(TOKEN_FILE_NAMES) as TokenFileName[]).flatMap((file) => flattenFile(file, files[file]));
  const byPath: Lookup = new Map();
  for (const entry of entries) {
    if (entry.file === "primitive") byPath.set(entry.path.join("."), entry);
  }
  const overridden: Effective = (entry) => overrides[entry.id] ?? entry.value;
  const derived: Effective = (entry) => entry.value;
  const values: ResolvedTokens["values"] = {};
  for (const entry of entries) {
    values[entry.id] = {
      derived: formatValue(entry.type, derived(entry), byPath, derived, [entry.id]),
      effective: formatValue(entry.type, overridden(entry), byPath, overridden, [entry.id]),
    };
  }
  return values;
}

function nodeAt(root: TokenNode, path: string[]): TokenNode | undefined {
  let node = root;
  for (const key of path) {
    const child = node[key];
    if (!isNode(child)) return undefined;
    node = child;
  }
  return node;
}

/** The base with the override layer written in, as token files: what
 * `/api/build` builds and what a snapshot records. */
export function filesWithOverrides(files: TokenFiles, overrides: Overrides): TokenFiles {
  const out = structuredClone(files);
  for (const [id, value] of Object.entries(overrides)) {
    const at = id.indexOf(":");
    const file = id.slice(0, at) as TokenFileName;
    if (at < 0 || !(file in TOKEN_FILE_NAMES)) continue;
    const node = nodeAt(out[file], id.slice(at + 1).split("."));
    if (!node || node.$value === undefined) continue;
    // Keep the source's type: a numeric token stays a number in JSON.
    const numeric = typeof node.$value === "number" && value.trim() !== "" && Number.isFinite(Number(value));
    node.$value = numeric ? Number(value) : value;
  }
  return out;
}

/** The token files as the text that goes to `/api/build` and snapshots. */
export function serializeFiles(files: TokenFiles): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, file] of Object.entries(TOKEN_FILE_NAMES) as [TokenFileName, string][]) {
    out[file] = `${JSON.stringify(files[name], null, 2)}\n`;
  }
  return out;
}

/** A short stable digest (FNV-1a) used to key canvas previews on the
 * current token values. */
export function digest(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
