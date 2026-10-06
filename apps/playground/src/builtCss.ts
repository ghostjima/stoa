// Read the variables back out of a built tokens.css and compare them with
// the values the previews are using. The previews resolve tokens in the
// browser for speed; this is the check that the shortcut still says what
// the real build says.
import type { DensityMode, Theme } from "./tokenModel";

/** The declarations of the first rule whose selector starts with `selector`. */
function block(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) return "";
  return css.slice(at, css.indexOf("}", at));
}

function declarations(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of block(css, selector).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) out[name] = value.trim();
  }
  return out;
}

const DENSITY_SELECTOR: Record<DensityMode, string> = {
  compact: '[data-density="compact"]',
  regular: ":root, [data-density=\"regular\"]",
  comfortable: '[data-density="comfortable"]',
};

function resolve(vars: Record<string, string>, value: string, seen: string[] = []): string {
  const match = value.match(/^var\((--[a-z0-9-]+)\)$/);
  if (!match) return value;
  const name = match[1];
  if (!name || seen.includes(name)) return value;
  const target = vars[name];
  return target === undefined ? value : resolve(vars, target, [...seen, name]);
}

/** The variables a built tokens.css gives one theme and density mode, with
 * `var()` references resolved to literals so they can be compared with the
 * values resolved in the browser. */
export function variablesFromCss(css: string, theme: Theme, density: DensityMode): Record<string, string> {
  const vars = {
    ...declarations(css, ":root"),
    ...(theme === "dark" ? declarations(css, '[data-theme="dark"]') : {}),
    ...declarations(css, DENSITY_SELECTOR[density]),
  };
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(vars)) out[name] = resolve(vars, value);
  return out;
}

export type Disagreement = { variable: string; live: string; built: string };

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

/** Variables where the preview and the built CSS do not say the same
 * thing. A variable missing on either side is a disagreement too. */
export function compareVariables(live: Record<string, string>, built: Record<string, string>): Disagreement[] {
  const names = [...new Set([...Object.keys(live), ...Object.keys(built)])].sort();
  const out: Disagreement[] = [];
  for (const variable of names) {
    const a = live[variable];
    const b = built[variable];
    if (a === undefined || b === undefined || normalize(a) !== normalize(b)) {
      out.push({ variable, live: a ?? "(missing)", built: b ?? "(missing)" });
    }
  }
  return out;
}
