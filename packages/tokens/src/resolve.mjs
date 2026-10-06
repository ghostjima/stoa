// Turn the built tokens.css into resolved token maps, one per theme and
// one per density mode.
//
// Pure and dependency-free: tests read the file and pass the text in, the
// playground fetches it and passes the text in. Nothing here touches the
// file system.

/** @typedef {Record<string, string>} TokenMap */
/** @typedef {{ themes: Record<string, TokenMap>, densities: Record<string, TokenMap> }} Resolved */

/** Theme name to the selector that carries its semantic colours. The
 * light theme lives in `:root`; the dark theme overrides it. */
export const THEME_SELECTORS = { light: null, dark: '[data-theme="dark"]' };

const DENSITY_MODES = ["compact", "regular", "comfortable"];

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Top-level rules of a stylesheet, as `{ selectors, declarations }`.
 * At-rules are skipped whole: in tokens.css the only ones are the
 * `prefers-color-scheme` block, which repeats the dark theme under a
 * different selector, and the reduced-motion block. */
function* topLevelRules(css) {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) return;
    const prelude = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    if (!prelude.startsWith("@")) {
      const declarations = {};
      for (const m of css.slice(open + 1, j - 1).matchAll(/--stoa-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
        declarations[m[1]] = m[2].trim();
      }
      yield { selectors: prelude.split(",").map((s) => s.trim()), declarations };
    }
    i = j;
  }
}

/** Replace a chain of `var(--stoa-...)` references with the value it ends
 * at. A reference that cannot be followed is returned unchanged, so the
 * caller sees the raw text rather than a silent empty string. */
function dereference(vars, value, seen = new Set()) {
  const m = /^var\(\s*--stoa-([a-z0-9-]+)\s*\)$/.exec(value ?? "");
  if (!m || seen.has(m[1]) || vars[m[1]] === undefined) return value;
  seen.add(m[1]);
  return dereference(vars, vars[m[1]], seen);
}

/** Resolve the text of tokens.css into one token map per theme and one per
 * density mode. Keys drop the `--stoa-` prefix, values have all token
 * references followed to a literal.
 *
 * Every theme map holds the whole token set, not only the colours, so a
 * caller can read `focus-width` or `density-row-height` from the same map.
 * The density maps hold the three `density-*` tokens per mode.
 *
 * @param {string} cssText contents of dist/tokens.css
 * @returns {Resolved}
 */
export function resolveTokens(cssText) {
  const rules = [...topLevelRules(stripComments(cssText))];
  const matching = (selector) =>
    rules.filter((r) => r.selectors.includes(selector)).flatMap((r) => Object.entries(r.declarations));

  const root = Object.fromEntries(matching(":root"));

  const themes = {};
  for (const [theme, selector] of Object.entries(THEME_SELECTORS)) {
    const raw = { ...root, ...(selector ? Object.fromEntries(matching(selector)) : {}) };
    themes[theme] = Object.fromEntries(Object.keys(raw).map((k) => [k, dereference(raw, raw[k])]));
  }

  const densities = {};
  for (const mode of DENSITY_MODES) {
    // Regular is the default, so it is declared on `:root` next to the
    // mode selector rather than only under `[data-density="regular"]`.
    const raw = { ...root, ...Object.fromEntries(matching(`[data-density="${mode}"]`)) };
    densities[mode] = Object.fromEntries(
      Object.keys(raw)
        .filter((k) => k.startsWith("density-"))
        .map((k) => [k, dereference(raw, raw[k])]),
    );
  }

  return { themes, densities };
}
