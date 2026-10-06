# PR 1 (stage1/token-map): fixes

1. High: dark-theme aliases are ignored. `lib.mjs:14-22` keeps only the
   first `--stoa-*` definition (the light `:root`), so primitives that
   only the dark theme aliases (`neutral-100/400/800/850/900`,
   `blue-400`, `teal-400`, `red-400`, through `semantic.dark.json`) are
   listed as unused. Resolve aliases per theme from the token sources,
   report per-theme reachability, and correct the PR text and the
   generated output that repeat the wrong claim.
2. `var(--stoa-x, fallback)` is not recognised (`lib.mjs:7`); handle
   fallbacks, including nested `var()` in the fallback, and report the
   fallback literal.
3. Combinator selectors lose their component: `lastCompoundSelector`
   (`lib.mjs:74`) attributes `.stoa-badge--warning > span:first-child`
   (`styles.css:91`) to a bare `span`. Attribute a rule to the component
   class that appears anywhere in the selector.
4. Primitives reached through an alias show no components; propagate
   `readBy` from the semantic tokens that alias them.
5. Detection gaps: report undefined custom properties of any prefix;
   scan inline TSX styles for literals; flag named colours and keyword
   easings; parse the last declaration of a block without a trailing
   semicolon (`lib.mjs:118`); show density values for every density,
   not only compact.
6. Use `fileURLToPath` instead of `URL.pathname`
   (`scripts/token-map.mjs:11`); parse `index.ts` exports with the
   TypeScript compiler API, and do not count `readCanvasTokens` as a
   component.
7. Report only: `.storybook/preview.css` reads `color-bg` and
   `font-family-sans`; add `.storybook/` to the scan so they are not
   listed as unused.
8. Add fixture cases for items 1 to 5 to `token-map.test.mjs`.
