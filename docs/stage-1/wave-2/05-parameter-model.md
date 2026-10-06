# Brief 05: parameter model

Removed 2026-10-03: Stoa keeps one base theme, stoa-default, so the
parameter model (`packages/tokens/src/model.mjs`), its presets and the
playground's parameters panel were deleted. The code is in the history
before that date. This brief stays as the record of what was built.

## Goal

The owner sets a few parameters and every token is derived from them,
with hard accessibility rules enforced by clamping and the clamps shown.
Hand edits stay possible as the existing override layer on top.

## Context

- The playground (brief 04) edits built tokens directly and marks every
  edit as an override against "Stoa today". This brief puts a derived
  layer underneath: parameters -> derived tokens -> overrides.
- Parameters for this wave (seven of the eleven in earlier research;
  type, numeric style, change encoding and motion come later):
  1. neutral temperature: hue 0 to 360, chroma 0 to 0.03, or "tint from
     accent";
  2. accent: hue and chroma; lightness solved from contrast;
  3. contrast: one multiplier over the lightness ladder, plus a generated
     high-contrast variant;
  4. polarity: light, dark, or both (dark tuned separately);
  5. surface strategy: border, fill (tone steps), or rule (horizontal
     hairlines only);
  6. corner language: 0, 2, 4 or 6 px for controls; cells always 0;
     overlays separate;
  7. density: compact, regular, comfortable, custom (row height, cell
     padding, font size).
- Hard rules (the model must satisfy them by clamping the derived value,
  usually lightness, and report every clamp, for example "accent L raised
  from 0.58 to 0.52 for 4.5:1"): text on its surfaces at least 4.5:1,
  primary text at least 7:1, large text at least 3:1; control boundaries,
  focus and chart marks at least 3:1 against adjacent colours; up/down
  lightness difference at least 0.08 or CIEDE2000 at least 20 under
  protanopia and deuteranopia (Machado, linear light, as in
  `packages/tokens/src/color.mjs`); minimum font size 11 px; row height at
  least 1.5 x font size.
- Contrast-targeted generation: for each colour role, hold hue and chroma
  and binary-search OKLCH lightness until the WCAG 2 ratio against the
  role's surface reaches the target; gamut-map into sRGB before
  measuring (culori's `wcagContrast` does not gamut-map; out-of-gamut
  values differ by up to about 4 percent); mark roles clipped in sRGB.
- Three presets from the research, as parameter sets plus a paragraph of
  intent each (values are starting points; the model derives the rest):
  - Tape (dark-first terminal): neutral hue 75, chroma up to 0.012;
    accent amber oklch(0.82 0.15 75); up oklch(0.84 0.12 195), down
    oklch(0.72 0.17 32); fills not borders; radius 0; compact (22 px rows,
    12 px text).
  - Broadsheet (paper and ink): paper oklch(0.968 0.012 82) as bg and
    surface; ink text oklch(0.21 0.014 82); accent deep blue
    oklch(0.40 0.12 255); up oklch(0.50 0.10 165), down oklch(0.40 0.14
    18); rules only; radius 0; regular (28 px rows, 13 px).
  - Studio (gradebooks): neutral hue 195, chroma up to 0.014; accent
    oklch(0.50 0.12 158); above target oklch(0.46 0.14 255), below target
    oklch(0.555 0.15 50); fills; 6 px control radius, 0 on cells;
    comfortable (32 to 36 px rows, 14 px).
  - "Stoa today" stays available as the built tokens with no derivation.
- Check the presets with the model: the research measured, for example,
  Tape text 14.88:1 and control boundary 3.32:1; reproduce and report
  what the model yields, do not copy these numbers.

## Scope

1. `packages/tokens/src/model.mjs`: a pure function from parameters to a
   token tree with the same token names the build emits today, so every
   component keeps working; plus the list of clamps. No `fs`, no Node
   built-ins; unit tests with `node:test`.
2. Contrast solving and gamut mapping as tested functions; reuse
   `color.mjs` and `checks.mjs` from brief 01 rather than new copies.
3. Playground: a parameters panel (Stoa's own Slider and choice controls),
   preset picker, the clamp list, and the existing override layer applied
   on top of the derived tree; "Override detected" keeps working.
4. Snapshot format gains the parameters; loading a snapshot restores
   parameters and overrides.
5. Tests: every preset satisfies every hard rule after derivation (run
   the brief 01 checks on the derived tree), and a parameter set that
   would violate a rule produces the expected clamp.

## Out of scope

Changing token source files; type, numeric style, change encoding and
motion parameters; export to DTCG files.

## Acceptance

Acceptance commands green; the PR lists each preset's check results
(from the checks, not hand-computed), stamped with the commit.
