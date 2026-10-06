# Brief 06: verification panel in the playground

## Goal

Every edit in the playground is checked in the browser, instantly, by
the same functions CI runs, and the owner sees which promise an edit
breaks and why.

## Context

- Brief 01 merged `packages/tokens/src/checks.mjs`, `resolve.mjs`,
  `pairs.mjs` and `color.mjs` (pure, browser-safe) and
  `known-violations.json`. The playground has a seam for them
  (`apps/playground/src/browserChecks.ts`) that returns "not available".
- Live values differ per preview frame (light/dark, LTR/RTL); checks run
  on the resolved tokens of each theme the frames show.
- Colour-vision previews: an SVG `feColorMatrix` filter operates in
  linear RGB by default, so the Machado matrices can be applied to a
  frame for a visual preview; pass/fail comes from the checks, not the
  filter.

## Scope

1. Wire `browserChecks.ts` to the brief 01 modules: run all rules on
   the current live token tree (with overrides) for each theme, within a
   frame's budget (measure and report the cost; debounce if needed).
2. Panel: results grouped by rule, with value, threshold and theme;
   failures that match `known-violations.json` shown as known (grey),
   new failures red, fixed known violations green; a filter for "new
   only".
3. Link results to tokens: selecting a failure highlights the token and,
   if present, its override; hovering a token shows the rules that read
   it.
4. The server build (`/api/build`) result stays; show when the browser
   checks and the server tests disagree.
5. Colour-vision preview toggle per frame: none, protanopia,
   deuteranopia, tritanopia, grayscale, as SVG filters with the Machado
   2009 severity 1.0 matrices (cite in a comment).
6. Tests: unit tests for the mapping from live values to check inputs;
   a Playwright test that an override breaking a text pair shows a new
   failure and resetting it clears the failure.

## Out of scope

New rules (add them in the tokens package in a separate change); APCA.

## Acceptance

Acceptance commands green, `pnpm test:e2e` green; the PR states the
measured cost of one full check run in the browser (browser, commit).
