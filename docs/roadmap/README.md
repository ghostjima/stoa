# Roadmap

Stoa is the design system behind two financial products, and its roadmap
follows what they need. Everything it promises is checked by a test.

| Product | For whom | What it needs from Stoa |
|---|---|---|
| [Ariadne Desk](https://github.com/ghostjima/ariadne) | bank operators handling complaints and refusals | a queue with deadlines in working days, a case card in one window, a drafted reply decided by a person, a decision journal |
| [Tyche Bonds](https://github.com/ghostjima/tyche) | retail investors choosing bonds | selection from a goal, an issue card that shows the risk where the decision is made, honest yield after tax, an order ticket |

Russian is the products' first language and English the second. Arabic
stays in Stoa's Storybook and playground as the proof that every component
works right to left.

## Where Stoa is now

- **One base theme**, stoa-default, light and dark, in
  `packages/tokens/tokens`. Every enforced rule passes, with no known
  violations: WCAG 2 contrast on the pairs listed in `pairs.mjs`, the token
  map without hard-coded literals.
- **Components** for dense financial screens, each with a story, keyboard
  and screen-reader behaviour, tests, and light and dark: layout and
  shell, controls and forms (multi-line text and radio groups among
  them), overlays, feedback and empty states, tables,
  the data grid, charts and market views, code and maths display, the
  agent's step list and log. The README lists them.
- **Evidence**: unit and browser tests, an axe sweep over every story in
  four modes (light and dark, left to right and right to left), contrast
  checks, CSS size; the badges on the README show the current numbers.

## Next

Each item is one narrow pull request with a story, tests and its axe and
contrast coverage.

1. **Shared by both products.** A first-paint helper for language,
   direction and theme with font preload; formatters for money, percent,
   dates, durations and signed values; a breakpoint hook; FilterBar
   (search, chip groups with counts, clear, the empty state).
2. **For Ariadne Desk.** A deadline cell that counts working days and
   warns before the limit; per-cell tone in the data grid; a column
   chooser and a bulk action bar for the grid; a case timeline; a text
   diff between a draft and the signed version; a "not run" state in the
   step list.
3. **For Tyche Bonds.** A derivation table that shows how a figure was
   worked out, step by step, with its source; a coupon and events
   calendar; a countdown for offer dates.
4. **Known defects.** A canvas does not refit when only its height
   changes; the order book announces an empty book before its first frame;
   focus after a dialog opened from a grid editor lands after the grid;
   line boxes grow when the Arabic digit face arrives; table headers do not
   wrap; the record list draws a frame late and loses focus on a pointer
   pick; tabs do not handle overflow; a text field's description takes text
   only.
5. **Tokens.** Token sources to DTCG 2025.10; light and dark times density
   in the build; z-index, scrim and dimension tokens.
6. **Storybook as the public face**, published with the products:
   foundations (tokens in light and dark, the live verification report),
   components with usage rules, and how each promise is checked.

## Working rules

- One narrow brief per component, one pull request each; a fix comes with
  a test that fails without it.
- A component is added when a product needs it, not ahead of time.
