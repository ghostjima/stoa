# Brief 02: token-change signal for canvas components

## Goal

Canvas components redraw immediately and correctly when tokens change on
their own subtree, so the playground can re-theme previews live and show
several themes side by side on one page.

## Context

- `packages/react/src/tokens.ts` `readCanvasTokens(el)` reads CSS
  variables with `getComputedStyle`. Canvases cannot use CSS variables,
  so components cache the values.
- `Heatmap.tsx` reads its tokens once and never again.
- `Ladder.tsx` re-reads only when `data-theme` or `data-density` changes
  on `<html>` (a MutationObserver) and redraws only on the next data
  frame, so a paused ladder does not update.
- The playground will scope token values to a wrapper element per
  preview (for example a light and a dark frame on one page), not to
  `<html>`.

## Scope

1. A documented signal: a `stoa:tokens` event dispatched on a preview
   root (any ancestor), plus a `tokensVersion` prop as an alternative for
   React callers. Pick one primary mechanism and justify it in the PR.
2. Ladder and Heatmap subscribe through a small shared hook, re-read
   tokens from their own element, and redraw immediately, also when
   paused.
3. Keep the existing `<html>` attribute behaviour working.
4. Tests (vitest, jsdom or happy-dom as already used): changing a
   variable on a wrapper and signalling causes a re-read with the new
   value; two instances under differently themed wrappers read different
   values; no redraw loop.
5. A Storybook story showing two ladders under light and dark wrappers
   on one page.

## Out of scope

Token values, new components, the playground.

## Acceptance

`pnpm build && pnpm -r typecheck && pnpm test` green; text check clean;
the PR describes the mechanism and any cost per redraw measured in the
story (state the browser and the commit).
