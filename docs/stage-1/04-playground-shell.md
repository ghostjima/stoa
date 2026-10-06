# Brief 04: playground shell

## Goal

A private Vite app where the owner edits Stoa's tokens and watches real
dense screens change live in four frames at once, with a snapshot of the
current state saved to the repository.

## Context

- Private tool: `apps/playground`, `"private": true`, never published.
- Existing dense components in `packages/react`: Ladder (canvas), Heatmap
  (canvas), TradeTable, Controls, Form, Panel; synthetic data in
  `fixtures.ts`.
- Re-theming by CSS variables measured about 12-14 ms of style and
  layout for eight colour variables on 12,000 table cells in headless
  Chrome; keep previews at realistic sizes and scope variables per
  preview container, not on `<html>`.
- Canvas components currently do not notice variable changes on a
  wrapper; brief 02 adds a signal. Until it merges, re-mount canvas
  previews on change and leave a clearly marked TODO pointing to brief 02.
- Owner decision on manual control: tokens will later be derived from
  a few parameters; hand edits of semantic or component tokens are
  allowed only as an explicit override layer, and every override is
  shown ("Override detected" with the token, the derived value and the
  override). In this brief there is no parameter model yet: the base is
  "Stoa today" (the built tokens), and every edit is an override against
  it, shown as such.

## Scope

1. `apps/playground` (Vite 8, React 19, TypeScript, same versions as the
   repo); add `apps/*` to `pnpm-workspace.yaml`; `pnpm --filter
   playground dev`.
2. Layout: a control panel beside a 2 x 2 grid of previews (light/dark x
   LTR/RTL). Each preview renders Ladder, Heatmap, TradeTable, Controls
   and Form with the synthetic stream running; pause and resume.
3. Controls built from Stoa's own components where they exist (Slider,
   choice controls, TextField, Tabs); colour inputs accept oklch.
4. Override layer: edits stored as overrides over the base; an overrides
   list with reset per item and "reset all"; the "Override detected"
   marker on every overridden token.
5. Dev-server plugin with two endpoints:
   - `/api/build`: writes the current token files to a temporary
     directory, runs the real `packages/tokens` build and tests there,
     returns the CSS, the test output and the commit hash;
   - `/api/save`: writes a snapshot (token JSON plus overrides plus the
     commit it was based on) to `apps/playground/snapshots/`.
   The verification panel shows the server test output and flags a
   disagreement between the live values and the built CSS. When brief 01
   merges, the panel also runs its checks in the browser; leave the
   integration point clearly marked.
6. Save "Stoa today" as the first snapshot.
7. Undo and redo for edits.

## Out of scope

The parameter model, fonts, motion editing, the reasoning inspector,
publishing, hosting, accounts.

## Acceptance

- `pnpm build && pnpm -r typecheck && pnpm test` green; text check clean.
- A Playwright smoke test: the app loads, changing one colour override
  changes a computed style in all four frames, the override appears in
  the list, reset restores it, `/api/build` returns passing tests for the
  unmodified base.
- The PR includes a screenshot of the four frames and states the commit.
