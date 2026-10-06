# Brief 07: fonts and type roles

## Goal

The owner loads fonts (including variable fonts), sees what each font
really contains, and tunes six type roles in live table rows, with the
numeric promises (tabular digits in Latin and Arabic-Indic) checked by
shaping, not by trusting a feature list.

## Context (measured in earlier research; re-verify)

- harfbuzzjs (MIT) is the engine: `getAxisInfos`, GSUB feature tags and
  their UI names (ss01.., cv01..), OS/2 metrics, shaping with features
  and variations. About 175 KB gzipped WASM. Run it in a worker.
- Pitfalls: harfbuzzjs given a WOFF2 file does not fail; every glyph maps
  to .notdef with equal advances, so a naive tabular check passes.
  Decompress WOFF2 first (wawoff2, MIT, or fontkit's decoder) and assert
  no glyph id 0 before measuring.
- Web subsets drop features: Inter from the Google Fonts CSS API or
  Fontsource keeps 8 GSUB features and drops ss01..ss08, cv01..cv14 and
  zero; the full file has 39. The inspector must say so ("this file has
  8 of 39 features" when the full list is known, or at least list what
  the loaded file has).
- IBM Plex Sans Arabic has proportional Arabic-Indic digits (10 distinct
  advances, 263 to 630 units) even with `tnum`; Noto Sans Arabic is
  tabular. The check must reproduce this.
- Canvas cannot take `font-feature-settings`; Ladder and Heatmap draw
  numbers on canvas, so numeric features need a `FontFace` registered
  with `featureSettings` (Chrome 140+). Test and report.
- Loading: Font Loading API with an ArrayBuffer from a dropped file or a
  fetch; Fontsource's keyless API (`api.fontsource.org/v1/fonts/{id}`,
  `/v1/variable/{id}` for axes) for catalogue fonts; record each family's
  licence.
- Roles: display, heading, body (reading hierarchy: a modular scale
  with a ratio control, 1.125 to 1.333, rounded to whole pixels) and
  label, numeric, code (working hierarchy: sizes tied to density, not a
  scale). Each role: family, size (density-linked for working roles),
  weight (1 to 1000), line height, tracking (px or rem), axes and
  features in `$extensions["dev.stoa.type"]`, Arabic pairing with a
  computed `size-adjust` from x-heights.

## Scope

1. `apps/playground/src/type/`: a worker wrapping harfbuzzjs with WOFF2
   decode; functions: axes, features with names, metrics (x-height, cap
   height, ascender, descender), digit advances for Latin and
   Arabic-Indic with and without `tnum`, with the glyph-0 assertion.
   Unit tests with a small test font committed under an open licence.
2. Font inspector panel: load by file drop or Fontsource id; show axes
   (with named instances), features with before/after glyphs, digit
   rows and their tabular verdict, metrics.
3. Type roles panel: the six roles with the fields above; each role's
   specimen is rendered inside a table row at the current density, in
   the live preview frames (LTR and RTL).
4. Canvas numerics: register the numeric face with `featureSettings` and
   show whether Ladder's digits are tabular; report what works in which
   browser.
5. Snapshot gains the loaded font references (not the font bytes) and
   the roles.

## Out of scope

Changing the shipped fonts or token sources; the spec generator.

## Acceptance

Acceptance commands green; the PR includes the digit-advance results for
IBM Plex Sans, IBM Plex Sans Arabic and Noto Sans Arabic from the
engine, with the commit.
