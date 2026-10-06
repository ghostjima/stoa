# Brief 01: verification engine

## Goal

Every colour and size promise Stoa makes becomes a pure, reusable check
that runs in Node (tests, CI) and in the browser (the playground), and
that reports the current violations honestly without breaking CI.

## Context

- `packages/tokens/scripts/contrast.test.mjs` checks 10 colour pairs per
  theme with WCAG 2 contrast (culori `wcagContrast`), reading
  `dist/tokens.css`. It proves only that list. Borders, the input
  boundary and non-text marks are not checked.
- An audit found violations the current tests do not see, for
  example (light/dark): `border` on `surface` 1.27/1.16:1,
  `border-strong` 1.48/1.33:1 (the text field boundary uses it, so inputs
  fail WCAG 1.4.11, which needs 3:1); up and down colours have almost the
  same lightness (1.02:1 light, 1.21:1 dark). Re-measure all of these;
  do not copy the numbers.
- Contrast is WCAG 2 only. APCA is out of scope (licence and decision).
- culori 4.0.2 applies the Machado 2009 colour-vision matrices to
  gamma-encoded sRGB; the matrices are defined on linear RGB. Implement
  the simulation in linear light (linearise sRGB, apply the matrix,
  re-encode). Cite Machado, Oliveira and Fernandes 2009 in a comment
  and name the model in every reported number.
- Compact density rows are 22 px; WCAG 2.2 target size (2.5.8) asks for
  24 px for pointer targets unless an exception applies.

## Scope

1. `packages/tokens/src/checks.mjs`: pure functions, no `fs`, no
   `node:test`. Input: a resolved token map per theme (name -> value).
   Output: a list of results `{ id, rule, theme, subject, value,
   threshold, pass, model? }`. Rules:
   - text contrast (4.5:1, 7:1 where the current tests ask 7:1) for
     every text-role colour on every surface it can sit on;
   - non-text contrast 3:1 (1.4.11) for borders that identify controls,
     focus indicator, and the up/down and bid/ask marks against their
     surfaces;
   - up/down distinguishability: CIEDE2000 between up and down under
     normal vision and simulated protanopia, deuteranopia, tritanopia
     (Machado, severity 1.0, linear light); report the values; the
     threshold is a named constant, reported, not enforced yet;
   - target size: row heights and control sizes per density against
     24 px.
   The list of pairs lives in one data file with a one-line reason per
   pair, so the docs can claim exactly that list.
2. A resolver that turns `dist/tokens.css` (or the Style Dictionary
   output) into the per-theme token map, shared by tests and browser.
3. `contrast.test.mjs` becomes a thin wrapper: the 20 existing
   assertions stay and still pass.
4. `known-violations.json`: the current failures of the new rules,
   each with id and measured value. A test fails on any failure not in
   the file, and also on any entry in the file that now passes (so the
   file cannot go stale). CI stays green today; Stage 2 empties the file.
5. `pnpm --filter @stoa/tokens verify` writes `dist/verify.json` (all
   results) and prints a short table.
6. Package export so `apps/playground` can import the checks and the
   resolver in the browser (no Node built-ins in those modules).

## Out of scope

Changing any token value; APCA; UI; the playground.

## Acceptance

- `pnpm build && pnpm -r typecheck && pnpm test` green, `node
  scripts/check-text.mjs origin/main` clean.
- A unit test for the linear-light CVD function against at least two
  reference values computed independently (show the computation in the
  test comment), and a test that the result differs from a gamma-space
  application on a saturated colour.
- The PR description lists every rule, its pair count, and the current
  failures with values, stamped with the commit they were measured on.
