// Core analysis for the token usage map (docs/stage-1/03-token-map.md).
// Pure functions over in-memory file contents so scripts/token-map.mjs (I/O,
// CLI) and scripts/token-map.test.mjs (fixtures) can share the same engine.
import ts from "typescript";

// Matches any custom property, not just `--stoa-*`: a `var()` read of an
// unprefixed name still needs to resolve or be reported as undefined
// (finding 5, "any prefix").
const CUSTOM_PROP_NAME = /^(--[\w-]+)$/;

/** All `var(...)` calls in `text`, including a fallback and nested `var()`
 * calls within that fallback (`var(--stoa-x, var(--stoa-y, black))` reads
 * both `--stoa-x` and `--stoa-y`). Handles arbitrarily nested parentheses,
 * so a fallback like `cubic-bezier(...)` does not break the split between
 * the property name and its fallback. `baseOffset` shifts reported indices
 * to be relative to the outermost caller's text. */
function findVarCalls(text, baseOffset = 0) {
  const results = [];
  let i = 0;
  while ((i = text.indexOf("var(", i)) !== -1) {
    const start = i;
    const argsStart = i + 4;
    let depth = 1;
    let j = argsStart;
    while (j < text.length && depth > 0) {
      if (text[j] === "(") depth++;
      else if (text[j] === ")") depth--;
      j++;
    }
    const argsEnd = j - 1;
    const argsText = text.slice(argsStart, Math.max(argsEnd, argsStart));
    let commaIndex = -1;
    let parenDepth = 0;
    for (let k = 0; k < argsText.length; k++) {
      if (argsText[k] === "(") parenDepth++;
      else if (argsText[k] === ")") parenDepth--;
      else if (argsText[k] === "," && parenDepth === 0) {
        commaIndex = k;
        break;
      }
    }
    const nameRaw = commaIndex === -1 ? argsText : argsText.slice(0, commaIndex);
    const fallbackRaw = commaIndex === -1 ? null : argsText.slice(commaIndex + 1);
    const nameMatch = nameRaw.trim().match(CUSTOM_PROP_NAME);
    if (nameMatch) {
      results.push({ token: nameMatch[1], fallback: fallbackRaw ? fallbackRaw.trim() : null, index: baseOffset + start });
    }
    if (fallbackRaw) {
      results.push(...findVarCalls(fallbackRaw, baseOffset + argsStart + commaIndex + 1));
    }
    i = argsEnd + 1;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Token list: parsed from the built tokens.css (light theme + density, the
// canonical default values), keyed by CSS custom property name.

/** Every `{ selector { ...declarations... } }` block in a CSS text, in
 * file order (a flat scan; none of these files nest rule blocks). Comments
 * are stripped first: Style Dictionary's generated banners precede
 * `:root`, and left in place they would be captured as part of its
 * selector text, breaking an exact match against `":root"`. */
function parseCssBlocks(cssText) {
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [];
  for (const m of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    blocks.push({ selector: m[1].trim(), body: m[2] });
  }
  return blocks;
}

/** `--stoa-*` declarations of one block, first definition wins (a block can
 * repeat a name, as `:root`'s reduced-motion override does). Tolerates a
 * final declaration with no trailing semicolon. */
function parseDeclBlock(body) {
  const declarations = new Map();
  const re = /(--stoa-[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g;
  let m;
  while ((m = re.exec(body))) {
    if (!declarations.has(m[1])) declarations.set(m[1], m[2].trim());
  }
  return declarations;
}

/** A DTCG source's `$value`s, keyed by their dash-joined path
 * (`color.neutral.100` -> `color-neutral-100`), matching the `--stoa-`
 * suffix Style Dictionary's css transform produces. */
function flattenDtcgValues(node, path, out) {
  if (node == null || typeof node !== "object") return;
  if (Object.prototype.hasOwnProperty.call(node, "$value")) {
    out.set(path.join("-"), node.$value);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    flattenDtcgValues(child, [...path, key], out);
  }
}

function dtcgAliasTarget(rawValue) {
  if (typeof rawValue !== "string") return null;
  const m = rawValue.match(/^\{([\w.-]+)\}$/);
  return m ? `--stoa-${m[1].split(".").join("-")}` : null;
}

/** Per-theme alias target for each semantic token, resolved directly from
 * the DTCG sources rather than the built CSS: the light build emits an
 * aliasing token as `var(--stoa-x)`, but the dark build (semantic tokens
 * only, no primitives to reference) inlines the resolved literal, so a
 * dark alias is invisible in tokens.css and must come from
 * `semantic.dark.json` itself. */
export function resolveSemanticAliases({ semanticLightJson, semanticDarkJson }) {
  const light = new Map();
  flattenDtcgValues(semanticLightJson, [], light);
  const dark = new Map();
  flattenDtcgValues(semanticDarkJson, [], dark);
  const aliasOf = new Map();
  for (const path of new Set([...light.keys(), ...dark.keys()])) aliasOf.set(`--stoa-${path}`, { light: null, dark: null });
  for (const [path, raw] of light) aliasOf.get(`--stoa-${path}`).light = dtcgAliasTarget(raw);
  for (const [path, raw] of dark) aliasOf.get(`--stoa-${path}`).dark = dtcgAliasTarget(raw);
  return aliasOf;
}

/** Token descriptors from the built tokens.css, plus (for color) each
 * token's per-theme alias target resolved from the DTCG sources (see
 * `resolveSemanticAliases`) since the theme's inlined value alone doesn't
 * say which primitive it came from. `semanticAliases` defaults to empty so
 * callers that only care about the light theme (most tests) can omit it. */
export function parseTokenList(tokensCssText, semanticAliases = new Map()) {
  const blocks = parseCssBlocks(tokensCssText);
  let lightBlock = null;
  let darkBlock = null;
  const densityBlocks = {};
  for (const { selector, body } of blocks) {
    if (selector === ":root" && !lightBlock) lightBlock = parseDeclBlock(body);
    else if (selector.includes('[data-theme="dark"]') && !darkBlock) darkBlock = parseDeclBlock(body);
    else if (selector.includes('[data-density="compact"]')) densityBlocks.compact = parseDeclBlock(body);
    else if (selector.includes('[data-density="regular"]')) densityBlocks.regular = parseDeclBlock(body);
    else if (selector.includes('[data-density="comfortable"]')) densityBlocks.comfortable = parseDeclBlock(body);
  }
  lightBlock ??= new Map();
  darkBlock ??= new Map();

  const lightAliasRe = /^var\(\s*(--stoa-[\w-]+)\s*\)$/;
  const tokens = new Map();

  for (const [name, rawValue] of lightBlock) {
    if (name.startsWith("--stoa-density-")) continue; // handled below, per density mode
    const lightAliasMatch = rawValue.match(lightAliasRe);
    const lightAliasOf = lightAliasMatch ? lightAliasMatch[1] : null;
    const darkAliasOf = semanticAliases.get(name)?.dark ?? null;
    const darkValue = darkBlock.has(name) ? darkBlock.get(name) : null;
    tokens.set(name, {
      name,
      group: name.slice("--stoa-".length).split("-")[0],
      value: rawValue,
      aliasOf: lightAliasOf,
      themeAliasOf: { light: lightAliasOf, dark: darkAliasOf },
      themeValue: { light: rawValue, dark: darkValue },
      kind: lightAliasOf || darkAliasOf ? "semantic" : "primitive",
    });
  }

  for (const [mode, decls] of Object.entries(densityBlocks)) {
    for (const [name, rawValue] of decls) {
      if (!tokens.has(name)) {
        tokens.set(name, {
          name,
          group: "density",
          value: rawValue,
          aliasOf: null,
          themeAliasOf: { light: null, dark: null },
          themeValue: { light: null, dark: null },
          kind: "density",
          density: {},
        });
      }
      const token = tokens.get(name);
      token.density[mode] = rawValue;
      if (mode === "regular") token.value = rawValue; // regular is the default mode
    }
  }

  for (const token of tokens.values()) {
    const resolve = (aliasOf, ownValue) => (aliasOf ? (tokens.get(aliasOf)?.value ?? ownValue) : ownValue);
    token.resolvedValue = resolve(token.themeAliasOf.light, token.value);
    const hasDarkOverride = token.themeAliasOf.dark != null || token.themeValue.dark != null;
    token.themeResolvedValue = {
      light: resolve(token.themeAliasOf.light, token.themeValue.light),
      dark: hasDarkOverride ? resolve(token.themeAliasOf.dark, token.themeValue.dark) : null,
    };
  }
  return tokens;
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** Split a CSS value into space-separated components, respecting
 * parentheses (so `cubic-bezier(0.2, 0, 0, 1)` stays one component). */
function splitCssValue(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of value.trim()) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function classesOf(selector) {
  return [...selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------
// CSS scanning: reads (var() usage) and hard-coded literals, per rule block.
// styles.css has no nesting, so a flat `selector { body }` scan is enough.

const DURATION_PROPS = /^(transition|transition-duration|animation|animation-duration)$/;
const EASING_PROPS = /^(transition|transition-timing-function|animation|animation-timing-function)$/;
const SIZE_PROPS = /(radius|padding|margin|gap|inset|^top$|^right$|^bottom$|^left$|^font-size$)/;
const COLOR_LITERAL = /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\()/;
const DURATION_LITERAL = /^-?\d*\.?\d+m?s$/;
const SIZE_LITERAL = /^-?\d*\.?\d+(px|rem|em|ch|%)$/;
const EASING_KEYWORDS = new Set(["ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start", "step-end"]);
// CSS Level 3 extended named colours (`transparent`/`currentcolor`/etc are
// CSS-wide keywords, not colour choices, so they are excluded).
const NAMED_COLORS = new Set([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue",
  "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk",
  "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
  "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue",
  "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro",
  "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred",
  "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
  "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon",
  "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime",
  "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
  "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue",
  "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange",
  "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
  "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown",
  "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray",
  "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet",
  "wheat", "white", "whitesmoke", "yellow", "yellowgreen",
]);
const norm = (s) => s.replace(/\s+/g, "");

// Any custom property declaration, not just `--stoa-*`: used to tell a
// component's own local custom property (`.x { --local-gap: 4px; ... }`)
// apart from a genuinely undefined one.
const CUSTOM_PROP_DECL = /(--[\w-]+)\s*:/g;

/** @param {{path:string, content:string}[]} cssFiles */
export function scanCss(cssFiles, tokens) {
  const reads = [];
  const literals = [];
  const localCustomProps = new Map(); // file path -> Set of `--name`s declared anywhere in it
  const resolvedValues = [...tokens.values()].map((t) => ({ name: t.name, value: norm(t.resolvedValue) }));

  for (const { path, content } of cssFiles) {
    const fileProps = new Set();
    for (const block of content.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectorText = block[1];
      const body = block[2];
      const bodyOffset = block.index + block[1].length + 1;
      const selectors = selectorText.split(",").map((s) => s.trim()).filter(Boolean);
      // A class anywhere in the selector, not just its last compound: a
      // combinator like `.stoa-badge--warning > span:first-child` still
      // belongs to the component that owns `.stoa-badge--warning`.
      const classes = [...new Set(selectors.flatMap((s) => classesOf(s)))];

      for (const m of body.matchAll(CUSTOM_PROP_DECL)) fileProps.add(m[1]);

      for (const varCall of findVarCalls(body)) {
        reads.push({
          token: varCall.token,
          fallback: varCall.fallback,
          file: path,
          line: lineOf(content, bodyOffset + varCall.index),
          selectors,
          classes,
        });
      }

      for (const decl of body.matchAll(/([a-zA-Z-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)) {
        const property = decl[1].trim();
        const declOffset = bodyOffset + decl.index;
        for (const rawValue of splitCssValue(decl[2])) {
          // Strip a list-separator comma clinging to the token (a
          // multi-layer value like `box-shadow: 0 0 0 1px red, 0 0 2px
          // blue` splits on whitespace only, so the first layer's colour
          // keeps its trailing comma attached).
          const value = rawValue.replace(/^,+|,+$/g, "");
          if (!value || value.includes("var(")) continue;
          let category = null;
          if (COLOR_LITERAL.test(value) || NAMED_COLORS.has(value.toLowerCase())) category = "color";
          else if (DURATION_LITERAL.test(value) && DURATION_PROPS.test(property)) category = "duration";
          else if (value.startsWith("cubic-bezier(") || (EASING_KEYWORDS.has(value) && EASING_PROPS.test(property))) category = "easing";
          else if (SIZE_LITERAL.test(value) && SIZE_PROPS.test(property)) category = "size";
          if (!category) continue;
          const match = resolvedValues.find((t) => t.value === norm(value));
          if (category === "size" && !match) continue; // sizes: only flag exact token matches, too many legitimate one-off pixels otherwise
          literals.push({
            file: path,
            line: lineOf(content, declOffset),
            property,
            value,
            category,
            matchingToken: match?.name ?? null,
          });
        }
      }
    }
    localCustomProps.set(path, fileProps);
  }
  return { reads, literals, localCustomProps };
}

// ---------------------------------------------------------------------------
// TS/TSX scanning via the compiler API.

function makeSourceFile(path, content) {
  const scriptKind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, scriptKind);
}

function lineOfNode(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

/** Outermost enclosing named function (a component) or named story object
 * (a `export const X = {...}` in a *.stories.tsx file, found the same way
 * since neither is itself a special AST node kind). Components often read
 * tokens through an inner closure (a `render` callback, an event handler);
 * walking to the outermost match attributes the read to the component
 * itself rather than to that anonymous-in-spirit local helper. */
function enclosingName(node) {
  let result = null;
  for (let n = node; n; n = n.parent) {
    if (ts.isFunctionDeclaration(n) && n.name) result = n.name.text;
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const init = n.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init) || ts.isObjectLiteralExpression(init)) {
        result = n.name.text;
      }
    }
  }
  return result;
}

function forEachDescendant(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => forEachDescendant(child, visit));
}

/** Whitespace-delimited pieces of a JSX className expression. A piece
 * adjoining a template substitution is `dynamic: true` (its text is a
 * prefix or suffix, not a full class name). */
function classNamePieces(expr) {
  const pieces = [];
  const splitLiteral = (text, dynamicStart, dynamicEnd) => {
    const tokens = text.split(/(\s+)/);
    tokens.forEach((tok, i) => {
      if (!tok || /^\s+$/.test(tok)) return;
      const isFirst = tokens.slice(0, i).every((t) => !t || /^\s+$/.test(t));
      const isLast = tokens.slice(i + 1).every((t) => !t || /^\s+$/.test(t));
      pieces.push({ text: tok, dynamic: (isFirst && dynamicStart) || (isLast && dynamicEnd) });
    });
  };
  const visit = (n) => {
    if (!n) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) splitLiteral(n.text, false, false);
    else if (ts.isTemplateExpression(n)) {
      splitLiteral(n.head.text, false, true);
      n.templateSpans.forEach((span, i) => splitLiteral(span.literal.text, true, i < n.templateSpans.length - 1));
    } else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) visit(n.expression.expression);
    else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      visit(n.left);
      visit(n.right);
    } else if (ts.isConditionalExpression(n)) {
      visit(n.whenTrue);
      visit(n.whenFalse);
    } else if (ts.isParenthesizedExpression(n)) visit(n.expression);
  };
  visit(expr);
  return pieces;
}

/** Find the array literal driving a `.map((pattern) => ...)` call whose
 * callback parameter (or a destructured element of it) is named `paramName`,
 * searching outward from `node`. Resolves both `arr.map(...)` and
 * `name.map(...)` where `const name = [...]` is declared in the same file. */
function findMapArraySource(paramName, node, sourceFile) {
  for (let n = node; n; n = n.parent) {
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent && ts.isCallExpression(n.parent)) {
      const call = n.parent;
      if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== "map") continue;
      const param = n.parameters[0];
      if (!param) continue;
      let index = null;
      if (ts.isIdentifier(param.name) && param.name.text === paramName) index = "whole";
      else if (ts.isArrayBindingPattern(param.name)) {
        param.name.elements.forEach((el, i) => {
          if (!ts.isOmittedExpression(el) && ts.isIdentifier(el.name) && el.name.text === paramName) index = i;
        });
      }
      if (index === null) continue;
      let arrayLiteral = null;
      const target = call.expression.expression;
      if (ts.isArrayLiteralExpression(target)) arrayLiteral = target;
      else if (ts.isIdentifier(target)) {
        forEachDescendant(sourceFile, (d) => {
          if (!arrayLiteral && ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.name.text === target.text && d.initializer && ts.isArrayLiteralExpression(d.initializer)) {
            arrayLiteral = d.initializer;
          }
        });
      }
      if (arrayLiteral) return { arrayLiteral, index };
    }
  }
  return null;
}

function resolveArrayValues({ arrayLiteral, index }) {
  const values = [];
  for (const el of arrayLiteral.elements) {
    if (index === "whole" && ts.isStringLiteral(el)) values.push(el.text);
    else if (typeof index === "number" && ts.isArrayLiteralExpression(el)) {
      const item = el.elements[index];
      if (item && ts.isStringLiteral(item)) values.push(item.text);
    }
  }
  return values;
}

/** Local `const alias = (n) => ...getPropertyValue(ARG)...` helpers, where
 * ARG is the parameter itself (a direct pass-through) or a template with the
 * parameter as its only interpolation (a prefix/suffix wrapper). */
function findGetPropertyValueAliases(sourceFile) {
  const aliases = new Map();
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
    const init = node.initializer;
    if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) return;
    const param = init.parameters[0];
    if (!param || !ts.isIdentifier(param.name)) return;
    const paramName = param.name.text;
    let found = null;
    forEachDescendant(init.body, (n) => {
      if (found || !ts.isCallExpression(n)) return;
      if (!ts.isPropertyAccessExpression(n.expression) || n.expression.name.text !== "getPropertyValue") return;
      const arg = n.arguments[0];
      if (!arg) return;
      if (ts.isIdentifier(arg) && arg.text === paramName) found = { direct: true };
      else if (ts.isTemplateExpression(arg) && arg.templateSpans.length === 1 && ts.isIdentifier(arg.templateSpans[0].expression) && arg.templateSpans[0].expression.text === paramName) {
        found = { direct: false, prefix: arg.head.text, suffix: arg.templateSpans[0].literal.text };
      }
    });
    if (found) aliases.set(node.name.text, found);
  });
  return aliases;
}

/** All `--stoa-*` reads via `getPropertyValue("--stoa-x")` or a local alias
 * of it (see `findGetPropertyValueAliases`), including reads whose argument
 * is resolved through a `.map()` over an array literal. */
function scanGetPropertyValueReads(sourceFile) {
  const aliases = findGetPropertyValueAliases(sourceFile);
  const reads = [];
  const record = (name, node) => {
    if (name.startsWith("--stoa-")) reads.push({ token: name, line: lineOfNode(sourceFile, node), enclosing: enclosingName(node) });
  };
  const resolveArg = (arg, alias, node) => {
    if (ts.isStringLiteral(arg)) return record(alias.direct ? arg.text : `${alias.prefix}${arg.text}${alias.suffix}`, node);
    if (ts.isIdentifier(arg)) {
      const source = findMapArraySource(arg.text, node, sourceFile);
      if (source) {
        for (const value of resolveArrayValues(source)) record(alias.direct ? value : `${alias.prefix}${value}${alias.suffix}`, node);
      }
    }
  };
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;
    const arg = node.arguments[0];
    if (!arg) return;
    if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "getPropertyValue") {
      resolveArg(arg, { direct: true }, node);
    } else if (ts.isIdentifier(node.expression) && aliases.has(node.expression.text)) {
      resolveArg(arg, aliases.get(node.expression.text), node);
    }
  });
  return reads;
}

/** `var(--stoa-x)` occurrences (with fallbacks) in string/template literals
 * outside CSS files (inline styles), attributed to the nearest enclosing
 * component. */
function scanInlineVarReads(sourceFile) {
  const reads = [];
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) return;
    for (const call of findVarCalls(node.text)) {
      reads.push({ token: call.token, fallback: call.fallback, line: lineOfNode(sourceFile, node), enclosing: enclosingName(node) });
    }
  });
  return reads;
}

const KEBAB_BOUNDARY = /([a-z0-9])([A-Z])/g;
const kebabCase = (name) => name.replace(KEBAB_BOUNDARY, "$1-$2").toLowerCase();

/** Hard-coded colour/duration/easing/size literals in a JSX `style={{...}}`
 * object (the inline counterpart of `scanCss`'s literal detection; a `var()`
 * value is a read, handled by `scanInlineVarReads`, not a literal here). */
function scanInlineStyleLiterals(sourceFile) {
  const literals = [];
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isJsxAttribute(node) || node.name.getText(sourceFile) !== "style" || !node.initializer) return;
    if (!ts.isJsxExpression(node.initializer) || !node.initializer.expression) return;
    const obj = node.initializer.expression;
    if (!ts.isObjectLiteralExpression(obj)) return;
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const nameNode = prop.name;
      const propName = ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) ? nameNode.text : null;
      if (!propName) continue;
      const valueNode = prop.initializer;
      if (!ts.isStringLiteral(valueNode) && !ts.isNoSubstitutionTemplateLiteral(valueNode)) continue;
      const value = valueNode.text.trim();
      if (value.includes("var(")) continue;
      const property = kebabCase(propName);
      let category = null;
      if (COLOR_LITERAL.test(value) || NAMED_COLORS.has(value.toLowerCase())) category = "color";
      else if (DURATION_LITERAL.test(value) && DURATION_PROPS.test(property)) category = "duration";
      else if (value.startsWith("cubic-bezier(") || (EASING_KEYWORDS.has(value) && EASING_PROPS.test(property))) category = "easing";
      else if (SIZE_LITERAL.test(value) && SIZE_PROPS.test(property)) category = "size";
      if (!category) continue;
      literals.push({ line: lineOfNode(sourceFile, valueNode), property, value, category });
    }
  });
  return literals;
}

/** className literal pieces (exact and dynamic-prefix), each attributed to
 * its enclosing component. */
function scanClassNames(sourceFile) {
  const exact = [];
  const prefixes = [];
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isJsxAttribute(node) || node.name.getText(sourceFile) !== "className" || !node.initializer) return;
    const expr = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
    if (!expr) return;
    const component = enclosingName(node);
    const line = lineOfNode(sourceFile, node);
    for (const piece of classNamePieces(expr)) {
      (piece.dynamic ? prefixes : exact).push({ text: piece.text, component, line });
    }
  });
  return { exact, prefixes };
}

/** Call sites of `name(...)`, each attributed to the enclosing component. */
function scanCallSites(sourceFile, name) {
  const sites = [];
  forEachDescendant(sourceFile, (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      sites.push({ component: enclosingName(node) });
    }
  });
  return sites;
}

export function scanSource(sourceFiles) {
  const rawReads = []; // { token, file, line, enclosing }
  const classToOwners = new Map();
  const classPrefixToOwners = new Map();
  const callSitesByFn = new Map(); // helper fn name -> [{component, file}]
  const inlineLiterals = [];

  for (const { path, content } of sourceFiles) {
    const sourceFile = makeSourceFile(path, content);
    for (const r of scanGetPropertyValueReads(sourceFile)) rawReads.push({ ...r, file: path });
    for (const r of scanInlineVarReads(sourceFile)) rawReads.push({ ...r, file: path });
    for (const l of scanInlineStyleLiterals(sourceFile)) inlineLiterals.push({ ...l, file: path });

    const { exact, prefixes } = scanClassNames(sourceFile);
    for (const e of exact) {
      if (!classToOwners.has(e.text)) classToOwners.set(e.text, []);
      classToOwners.get(e.text).push({ component: e.component, file: path, line: e.line });
    }
    for (const p of prefixes) {
      if (!classPrefixToOwners.has(p.text)) classPrefixToOwners.set(p.text, []);
      classPrefixToOwners.get(p.text).push({ component: p.component, file: path, line: p.line });
    }
  }

  // One hop of call-graph propagation: a helper (e.g. readCanvasTokens) that
  // reads tokens, called from a component, attributes those reads to the
  // caller too.
  const helperNames = new Set(rawReads.map((r) => r.enclosing).filter(Boolean));
  for (const { path, content } of sourceFiles) {
    const sourceFile = makeSourceFile(path, content);
    for (const name of helperNames) {
      for (const site of scanCallSites(sourceFile, name)) {
        if (!callSitesByFn.has(name)) callSitesByFn.set(name, []);
        callSitesByFn.get(name).push({ component: site.component, file: path });
      }
    }
  }
  const propagated = [];
  for (const read of rawReads) {
    for (const site of callSitesByFn.get(read.enclosing) ?? []) {
      if (site.component && site.component !== read.enclosing) {
        propagated.push({ token: read.token, file: site.file, line: read.line, enclosing: site.component, via: read.enclosing });
      }
    }
  }

  return { reads: [...rawReads, ...propagated], classToOwners, classPrefixToOwners, inlineLiterals };
}

function matchClass(cls, classToOwners, classPrefixToOwners) {
  const owners = [...(classToOwners.get(cls) ?? [])];
  for (const [prefix, list] of classPrefixToOwners) {
    if (cls.startsWith(prefix)) owners.push(...list);
  }
  return owners;
}

// ---------------------------------------------------------------------------
// Stories: which story exercises which component, via the compiler API.

export function scanStories(storyFiles) {
  const componentToStories = new Map();
  const directReads = []; // reads made directly in a story file, not through a shipped component

  for (const { path, content } of storyFiles) {
    const sourceFile = makeSourceFile(path, content);
    const imported = new Set();
    let title = null;
    let metaComponent = null;
    const exportedStories = [];

    forEachDescendant(sourceFile, (node) => {
      if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const el of node.importClause.namedBindings.elements) {
          if (!el.isTypeOnly) imported.add(el.name.text);
        }
      }
      if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) exportedStories.push(decl.name.text);
        }
      }
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        if (node.name.text === "title" && ts.isStringLiteral(node.initializer)) title = node.initializer.text;
        if (node.name.text === "component" && ts.isIdentifier(node.initializer)) metaComponent = node.initializer.text;
      }
    });

    const usedComponents = new Set(metaComponent ? [metaComponent] : []);
    forEachDescendant(sourceFile, (node) => {
      const tag = ts.isJsxSelfClosingElement(node) ? node.tagName : ts.isJsxOpeningElement(node) ? node.tagName : null;
      if (tag && ts.isIdentifier(tag) && imported.has(tag.text)) usedComponents.add(tag.text);
    });

    for (const component of usedComponents) {
      if (!componentToStories.has(component)) componentToStories.set(component, new Set());
      for (const story of exportedStories) componentToStories.get(component).add(`${title ?? path} > ${story}`);
    }
    if (usedComponents.size === 0) {
      for (const r of scanGetPropertyValueReads(sourceFile)) directReads.push({ ...r, file: path, story: `${title ?? path} > ${r.enclosing}` });
      for (const r of scanInlineVarReads(sourceFile)) directReads.push({ ...r, file: path, story: `${title ?? path} > ${r.enclosing}` });
    }
  }
  return { componentToStories, directReads };
}

// ---------------------------------------------------------------------------
// Assembly.

export function buildTokenMap({ tokensCssText, cssFiles, sourceFiles, storyFiles, knownComponents, semanticLightJson, semanticDarkJson }) {
  const semanticAliases =
    semanticLightJson && semanticDarkJson ? resolveSemanticAliases({ semanticLightJson, semanticDarkJson }) : new Map();
  const tokens = parseTokenList(tokensCssText, semanticAliases);
  const { reads: cssReads, literals: cssLiterals, localCustomProps } = scanCss(cssFiles, tokens);
  const { reads: sourceReads, classToOwners, classPrefixToOwners, inlineLiterals } = scanSource(sourceFiles);
  const { componentToStories, directReads } = scanStories(storyFiles ?? []);

  const byToken = new Map([...tokens.keys()].map((name) => [name, { components: new Map(), stories: new Set() }]));
  const reached = new Set();
  const undefinedRefs = [];

  // Per-theme reachability: `direct` means the token itself is read (by
  // either theme, since the same property resolves under whichever theme
  // is active); `via` names the semantic tokens whose alias, in that
  // theme, targets this token. A primitive with no direct reads and no
  // `via` in a theme is unused under that theme even if the other theme
  // reaches it (a light-only or dark-only alias target).
  const themeReach = new Map();
  const ensureThemeReach = (name) => {
    if (!themeReach.has(name)) themeReach.set(name, { light: { direct: false, via: new Set() }, dark: { direct: false, via: new Set() } });
    return themeReach.get(name);
  };

  // A primitive is reached whenever a semantic token that aliases it (in
  // either theme) is read: an alias only ever resolves one level deep in
  // this system, so a single lookup per theme is enough.
  const noteReach = (name) => {
    reached.add(name);
    const selfReach = ensureThemeReach(name);
    selfReach.light.direct = true;
    selfReach.dark.direct = true;
    const t = tokens.get(name);
    if (t?.themeAliasOf?.light) {
      reached.add(t.themeAliasOf.light);
      ensureThemeReach(t.themeAliasOf.light).light.via.add(name);
    }
    if (t?.themeAliasOf?.dark) {
      reached.add(t.themeAliasOf.dark);
      ensureThemeReach(t.themeAliasOf.dark).dark.via.add(name);
    }
  };

  for (const read of cssReads) {
    if (!tokens.has(read.token)) {
      if (localCustomProps.get(read.file)?.has(read.token)) continue; // defined locally in this file's own CSS, not part of the token system
      undefinedRefs.push({ name: read.token, file: read.file, line: read.line, fallback: read.fallback ?? undefined });
      continue;
    }
    noteReach(read.token);
    const entry = byToken.get(read.token);
    let matched = false;
    for (const cls of read.classes) {
      for (const owner of matchClass(cls, classToOwners, classPrefixToOwners)) {
        if (owner.component && (!knownComponents || knownComponents.has(owner.component))) {
          entry.components.set(`${owner.component}|${read.file}|${read.line}`, {
            component: owner.component,
            file: read.file,
            line: read.line,
            fallback: read.fallback ?? undefined,
          });
          matched = true;
        }
      }
    }
    if (!matched) {
      const label = read.selectors.join(", ");
      entry.components.set(`css:${label}|${read.file}|${read.line}`, {
        component: `(css) ${label}`,
        file: read.file,
        line: read.line,
        fallback: read.fallback ?? undefined,
      });
    }
  }

  for (const read of sourceReads) {
    if (!tokens.has(read.token)) {
      undefinedRefs.push({ name: read.token, file: read.file, line: read.line, fallback: read.fallback ?? undefined });
      continue;
    }
    noteReach(read.token);
    const entry = byToken.get(read.token);
    if (read.enclosing && (!knownComponents || knownComponents.has(read.enclosing))) {
      const key = `${read.enclosing}|${read.file}|${read.line}`;
      entry.components.set(key, { component: read.enclosing, file: read.file, line: read.line, via: read.via, fallback: read.fallback ?? undefined });
    }
  }

  for (const read of directReads) {
    if (!tokens.has(read.token)) continue;
    noteReach(read.token);
    byToken.get(read.token).stories.add(read.story);
  }

  for (const [component, stories] of componentToStories) {
    for (const entry of byToken.values()) {
      if ([...entry.components.values()].some((c) => c.component === component)) {
        for (const s of stories) entry.stories.add(s);
      }
    }
  }

  // A primitive reached only through an alias otherwise shows no readers:
  // propagate readBy from each semantic token (light and dark) that aliases
  // it, so the primitive's own entry lists who reads it, and through which
  // semantic name.
  for (const semanticToken of tokens.values()) {
    const semanticEntry = byToken.get(semanticToken.name);
    if (!semanticEntry || (semanticEntry.components.size === 0 && semanticEntry.stories.size === 0)) continue;
    const targets = new Set([semanticToken.themeAliasOf.light, semanticToken.themeAliasOf.dark].filter(Boolean));
    for (const targetName of targets) {
      const targetEntry = byToken.get(targetName);
      if (!targetEntry) continue;
      for (const [key, comp] of semanticEntry.components) {
        targetEntry.components.set(`via:${semanticToken.name}|${key}`, { ...comp, via: semanticToken.name });
      }
      for (const s of semanticEntry.stories) targetEntry.stories.add(s);
    }
  }

  const literals = [...cssLiterals];
  const resolvedValues = [...tokens.values()].map((t) => ({ name: t.name, value: norm(t.resolvedValue) }));
  for (const l of inlineLiterals) {
    const match = resolvedValues.find((t) => t.value === norm(l.value));
    if (l.category === "size" && !match) continue;
    literals.push({ file: l.file, line: l.line, property: l.property, value: l.value, category: l.category, matchingToken: match?.name ?? null });
  }

  const tokenList = [...tokens.values()]
    .map((t) => {
      const entry = byToken.get(t.name);
      const reach = themeReach.get(t.name);
      return {
        name: t.name,
        group: t.group,
        kind: t.kind,
        value: t.value,
        resolvedValue: t.resolvedValue,
        aliasOf: t.aliasOf,
        theme:
          t.kind === "semantic"
            ? { dark: { value: t.themeValue.dark, aliasOf: t.themeAliasOf.dark, resolvedValue: t.themeResolvedValue.dark } }
            : undefined,
        density: t.kind === "density" ? t.density : undefined,
        readBy: {
          components: [...entry.components.values()].sort((a, b) => a.component.localeCompare(b.component) || a.file.localeCompare(b.file) || a.line - b.line),
          stories: [...entry.stories].sort(),
        },
        // Per theme: whether the token is itself read directly, and which
        // semantic tokens' alias (in that theme) targets it. A token unused
        // overall can still be reached in one theme only (e.g. a primitive
        // only the dark theme aliases).
        reachedByTheme: {
          light: { direct: reach?.light.direct ?? false, via: [...(reach?.light.via ?? [])].sort() },
          dark: { direct: reach?.dark.direct ?? false, via: [...(reach?.dark.via ?? [])].sort() },
        },
        unused: !reached.has(t.name),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const unusedTokens = tokenList.filter((t) => t.unused).map((t) => t.name);
  const dedupedUndefined = [...new Map(undefinedRefs.map((r) => [`${r.name}|${r.file}|${r.line}`, r])).values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file) || a.line - b.line,
  );
  const dedupedLiterals = [...new Map(literals.map((l) => [`${l.file}|${l.line}|${l.property}|${l.value}`, l])).values()].sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
  );

  return {
    tokens: tokenList,
    unusedTokens,
    hardcodedLiterals: dedupedLiterals,
    undefinedCustomProperties: dedupedUndefined,
    summary: {
      tokenCount: tokenList.length,
      unusedCount: unusedTokens.length,
      hardcodedLiteralCount: dedupedLiterals.length,
      undefinedCount: dedupedUndefined.length,
    },
  };
}

export function renderMarkdown(map) {
  const lines = [
    "# Token usage map",
    "",
    "Generated by `scripts/token-map.mjs`. Do not edit by hand; run `pnpm token-map`.",
    "",
    `${map.summary.tokenCount} tokens, ${map.summary.unusedCount} unused, ${map.summary.hardcodedLiteralCount} hard-coded literals, ${map.summary.undefinedCount} undefined custom properties referenced.`,
    "",
    "## Tokens",
    "",
    "| Token | Group | Kind | Value | Resolves to | Read by | Stories |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const t of map.tokens) {
    const readBy = t.readBy.components.length
      ? [...new Set(t.readBy.components.map((c) => c.component))].join(", ")
      : t.unused
        ? "_unused_"
        : "_(not attributed to a component)_";
    const stories = t.readBy.stories.length ? t.readBy.stories.join("<br>") : "";
    const dark = t.theme?.dark;
    // Only worth a second line when the theme actually resolves to a
    // different colour; light's `var()` and dark's inlined literal always
    // read as different text even when they name the same primitive.
    const darkDiffers = dark && dark.value != null && dark.resolvedValue !== t.resolvedValue;
    const value = t.kind === "density" ? `compact \`${t.density.compact}\`, regular \`${t.density.regular}\`, comfortable \`${t.density.comfortable}\`` : `\`${t.value}\``;
    const valueCell = darkDiffers ? `${value}<br>dark: \`${dark.value}\`` : value;
    const resolvesCell = t.aliasOf ? `\`${t.resolvedValue}\`${darkDiffers ? `<br>dark: \`${dark.resolvedValue}\`` : ""}` : "-";
    lines.push(`| \`${t.name}\` | ${t.group} | ${t.kind} | ${valueCell} | ${resolvesCell} | ${readBy} | ${stories} |`);
  }

  lines.push("", "## Unused tokens", "");
  if (map.unusedTokens.length) for (const name of map.unusedTokens) lines.push(`- \`${name}\``);
  else lines.push("None.");

  // Per-theme reachability: names, for every primitive, which theme(s)
  // reach it and through which semantic token's alias, so a primitive
  // reached only under one theme (its `unused` flag is combined across
  // both) is visible here instead of looking like any other used token.
  lines.push("", "## Primitive reachability by theme", "");
  const primitives = map.tokens.filter((t) => t.kind === "primitive");
  const reachCell = (r) => {
    const parts = [];
    if (r.direct) parts.push("direct");
    for (const via of r.via) parts.push(`via \`${via}\``);
    return parts.length ? parts.join(", ") : "_not reached_";
  };
  if (primitives.length) {
    lines.push("| Token | Light | Dark |", "| --- | --- | --- |");
    for (const t of primitives) {
      lines.push(`| \`${t.name}\` | ${reachCell(t.reachedByTheme.light)} | ${reachCell(t.reachedByTheme.dark)} |`);
    }
  } else lines.push("None.");

  lines.push("", "## Hard-coded literals that match or should be a token", "");
  if (map.hardcodedLiterals.length) {
    lines.push("| File | Line | Property | Value | Category | Matching token |", "| --- | --- | --- | --- | --- | --- |");
    for (const l of map.hardcodedLiterals) {
      lines.push(`| ${l.file} | ${l.line} | \`${l.property}\` | \`${l.value}\` | ${l.category} | ${l.matchingToken ? `\`${l.matchingToken}\`` : "-"} |`);
    }
  } else lines.push("None.");

  lines.push("", "## Custom properties referenced but not defined", "");
  if (map.undefinedCustomProperties.length) {
    lines.push("| Name | File | Line | Fallback |", "| --- | --- | --- | --- |");
    for (const u of map.undefinedCustomProperties) lines.push(`| \`${u.name}\` | ${u.file} | ${u.line} | ${u.fallback ? `\`${u.fallback}\`` : "-"} |`);
  } else lines.push("None.");

  lines.push("");
  return lines.join("\n");
}
