# Components, batch 1

From the roadmap (`docs/roadmap/README.md`) and an inventory of the Tyche
and Themis demos: what they hand-roll today. Each brief is one pull
request; the six can run in parallel.

All six landed together on `components/batch-1`, merged from the
feedback-layout, controls, overlays-lists, table-charts and data-grid
branches.

| Brief | Branch | Component | Status |
|---|---|---|---|
| [C1](c1-table.md) | `components/table` | Table; TradeTable rebuilt on it | Done |
| [C2](c2-callout.md) | `components/callout` | Callout | Done |
| [C3](c3-progress.md) | `components/progress` | Skeleton, ProgressBar | Done |
| [C4](c4-empty-states.md) | `components/empty-states` | EmptyState; empty and stale states on Ladder and Heatmap | EmptyState done; stale states on Ladder and Heatmap open |
| [C5](c5-toolbar.md) | `components/toolbar` | Toolbar, ButtonGroup | Done |
| [C6](c6-app-shell.md) | `components/app-shell` | AppHeader, PageShell, VisuallyHidden, LiveRegion | Done |

## Rules for every component brief

- Read `CONTRIBUTING.md` first. Work in `packages/react` only (plus
  `packages/react/src/styles.css`); do not touch the demos, the
  playground or the token sources.
- Tokens only: no literal colours, sizes, radii, durations or easings in
  CSS or inline styles; read `--stoa-*` custom properties. If a needed
  token does not exist, say so in the PR instead of inventing a literal.
- Use React Aria Components where the pattern has keyboard or focus
  behaviour; match the idiom of `Form.tsx` and `Controls.tsx` (typed
  props, a short comment on non-obvious behaviour).
- Right-to-left: logical CSS properties; test that the component renders
  and reads correctly with `dir="rtl"`.
- Tests (vitest + Testing Library, as in `form.test.tsx`): roles and
  names, keyboard behaviour, every state, RTL.
- A Storybook story per state (`<Component>.stories.tsx`), light and
  dark via the toolbar.
- Export from `packages/react/src/index.ts`; document props in the story
  and in JSDoc.
- Keep the component small: the props the demos need, not a general
  library API. List what you left out in the PR.
- Before finishing: merge the latest `main`, run the acceptance commands
  from `CONTRIBUTING.md`, open the PR against `main`.
