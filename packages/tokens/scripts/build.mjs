// Build Stoa's tokens: CSS variables (light, dark, density modes, reduced
// motion), an ES module with TypeScript declarations, and a flat JSON.
import StyleDictionary from "style-dictionary";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const out = "dist/";
await mkdir(out, { recursive: true });

const base = {
  source: ["tokens/primitive.json", "tokens/semantic.light.json"],
  platforms: {
    css: {
      transformGroup: "css",
      prefix: "stoa",
      buildPath: out,
      files: [
        { destination: "light.css", format: "css/variables", options: { selector: ":root", outputReferences: true } },
      ],
    },
    js: {
      transformGroup: "js",
      buildPath: out,
      files: [
        { destination: "tokens.js", format: "javascript/es6" },
        { destination: "tokens.d.ts", format: "typescript/es6-declarations" },
        { destination: "tokens.json", format: "json/flat" },
      ],
    },
  },
};
await new StyleDictionary(base).buildAllPlatforms();

// Dark theme: only the semantic tokens change.
const semanticOnly = (token) => token.filePath.includes("semantic.");
const dark = new StyleDictionary({
  source: ["tokens/primitive.json", "tokens/semantic.dark.json"],
  platforms: {
    css: {
      transformGroup: "css",
      prefix: "stoa",
      buildPath: out,
      files: [
        { destination: "dark.css", format: "css/variables", filter: semanticOnly, options: { selector: '[data-theme="dark"]' } },
        { destination: "dark-auto.css", format: "css/variables", filter: semanticOnly, options: { selector: ':root:not([data-theme="light"])' } },
      ],
    },
  },
});
await dark.buildAllPlatforms();

// Density modes: the same variables, one selector per mode; regular is
// the default. The default block is written first: `:root` and an
// attribute selector have the same specificity, so a mode set on the root
// element (`<html data-density="compact">`) only wins when its block comes
// after `:root`.
const density = JSON.parse(await readFile("tokens/density.json", "utf8"));
const densityCss = Object.entries(density)
  .sort(([a], [b]) => Number(b === "regular") - Number(a === "regular"))
  .map(([mode, vars]) => {
    const body = Object.entries(vars)
      .map(([name, t]) => `  --stoa-density-${name}: ${t.$value};`)
      .join("\n");
    const selector = mode === "regular" ? `:root, [data-density="regular"]` : `[data-density="${mode}"]`;
    return `${selector} {\n${body}\n}`;
  })
  .join("\n\n");

const reducedMotion = `@media (prefers-reduced-motion: reduce) {
  :root {
    --stoa-motion-duration-fast: 0ms;
    --stoa-motion-duration-base: 0ms;
    --stoa-motion-duration-slow: 0ms;
    --stoa-motion-duration-flash: 0ms;
  }
}`;

// The same values gated on an attribute: a page cannot force
// prefers-reduced-motion from JavaScript, so an application's own setting,
// or a preview of one part of a page, sets data-motion="reduce" instead.
const reducedMotionAttribute = `[data-motion="reduce"] {
  --stoa-motion-duration-fast: 0ms;
  --stoa-motion-duration-base: 0ms;
  --stoa-motion-duration-slow: 0ms;
  --stoa-motion-duration-flash: 0ms;
}`;

// The browser's own drawing (form controls, scrollbars, autofill) follows
// the theme: light by default and under data-theme="light" (a light part
// of a dark page), dark under data-theme="dark", and the system's setting
// when no theme is chosen. After the variable blocks, whose selectors the
// playground reads back.
const colorScheme = `:root, [data-theme="light"] {
  color-scheme: light;
}

[data-theme="dark"] {
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
  }
}`;

// Arabic text drawn before IBM Plex Sans Arabic has loaded is set in a
// system face scaled and spaced to Plex Sans Arabic's metrics, so the page
// moves little when the font arrives (Fontsource's faces swap in). One face
// per system font, each with its own numbers; a face whose local font is
// missing is skipped. Arabic only (unicode-range): Latin text falls past
// them to the next face in the stack.
//
// Measured on IBM Plex Sans Arabic 400 from @fontsource/ibm-plex-sans-arabic
// 5.3.0 (hhea ascender 1085, descender -415, line gap 0, 1000 units per em)
// and, for size-adjust, on the width of the Arabic text of the "Layout/Panel
// > Arabic page" story at 100 px in Chromium 153 on macOS 26: Plex Sans
// Arabic 21,986 px, Geeza Pro 21,322 px, Tahoma 25,342 px. ascent-override
// and descent-override are Plex's own, divided by size-adjust, so the
// line box comes out as Plex's. packages/react/e2e/arabic-cls.measure.mjs
// measures the effect.
const ARABIC_RANGE = "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC";
const arabicFallback = (family, locals, sizeAdjust) => {
  const pct = (units) => `${((units / 1000 / sizeAdjust) * 100).toFixed(1)}%`;
  return `@font-face {
  font-family: "${family}";
  src: ${locals.map((name) => `local("${name}")`).join(", ")};
  unicode-range: ${ARABIC_RANGE};
  size-adjust: ${(sizeAdjust * 100).toFixed(1)}%;
  ascent-override: ${pct(1085)};
  descent-override: ${pct(415)};
  line-gap-override: 0%;
}`;
};
const fallbackFaces = [
  // local() matches a face's full or PostScript name, not its family.
  arabicFallback("IBM Plex Sans Arabic Tahoma Fallback", ["Tahoma"], 21986 / 25342),
  arabicFallback("IBM Plex Sans Arabic Geeza Fallback", ["Geeza Pro Regular", "GeezaPro"], 21986 / 21322),
].join("\n\n");

const light = await readFile(`${out}light.css`, "utf8");
const darkCss = await readFile(`${out}dark.css`, "utf8");
const darkAuto = await readFile(`${out}dark-auto.css`, "utf8");
const css = [
  "/* Stoa tokens. Generated by scripts/build.mjs; do not edit. */",
  fallbackFaces,
  light,
  darkCss,
  `@media (prefers-color-scheme: dark) {\n${darkAuto}\n}`,
  colorScheme,
  densityCss,
  reducedMotion,
  reducedMotionAttribute,
  "",
].join("\n");
await writeFile(`${out}tokens.css`, css);
console.log(`tokens.css: ${css.length} bytes`);
