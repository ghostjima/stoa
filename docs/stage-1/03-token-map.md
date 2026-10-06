# Brief 03: token usage map

## Goal

A generated map of which token reaches which component and which story,
so every playground control can show what it affects, and so tokens and
controls that affect nothing are listed as defects.

## Context

- Components read tokens in two ways: CSS (`var(--stoa-...)` in
  `packages/react/src/styles.css` and inline styles) and canvas
  (`readCanvasTokens` in `packages/react/src/tokens.ts`).
- An audit found that the easing, flash and line-height tokens
  are not read by any component, and `styles.css` hard-codes
  `cubic-bezier(0.2, 0, 0, 1)` instead of the easing token. The map must
  find these by itself; do not special-case them.
- Tokens come from `packages/tokens/tokens/*.json` built by
  `packages/tokens/scripts/build.mjs` into `dist/`.

## Scope

1. `scripts/token-map.mjs`: reads the built token list and statically
   scans `packages/react/src` (CSS and TS/TSX; use the TypeScript
   compiler API for TSX, not regular expressions over code) and
   `stories/`. Output `docs/generated/token-map.json`:
   token -> components (with file and line) -> stories; plus lists of
   (a) tokens read by nothing, (b) hard-coded colour, duration, easing
   and size literals in component styles that match or should be a
   token, (c) CSS custom properties referenced but not defined.
2. `docs/generated/token-map.md`: the same as readable tables.
3. Semantic aliases resolve to primitives in the map (show both).
4. A test with a small fixture tree covering CSS var, inline style var,
   canvas read, alias, and an unused token.
5. A root script `pnpm token-map`; CI runs it and fails if the committed
   output is stale.

## Out of scope

Fixing the defects it finds (Stage 2); UI.

## Acceptance

Green CI including the staleness check; text check clean; the PR lists
the unused tokens and hard-coded literals it found on the current code,
with the commit.
