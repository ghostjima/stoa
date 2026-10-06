# Roadmap: Stoa as a working system

Stoa's job: be a real design system for decision-dense financial
interfaces, used for the interface of its two reference products, with
every accessibility promise checked:

- **Ariadne Desk**, an internal operations desk for complaints and
  refusals: a queue with deadlines in working days, a case card that
  replaces several systems, a reply drafted by an assistant and decided
  by a person, and a decision journal.
- **Tyche Bonds**, a bond terminal for retail investors: selection from
  the investor's goal, an issue card with the risk shown where the
  decision is made, honest yield after tax, and an order ticket.

Finance comes first: both products are financial, and Stoa's components
are driven by what they need. The playground is the tool for the
decisions below, not a product.

## One system, one base theme

Decided 2026-10-03, replacing the two product themes (Tape and Studio)
and the parameter model that derived them: the products share one base
theme, stoa-default, with a light and a dark mode. It is the token files
in `packages/tokens/tokens`; the playground tunes it with overrides and
checks every enforced rule live. Product themes can come back later as
overrides on top of it, once the base passes every rule.

## Done

1. **Base theme.** Every enforced check passes since 75bf53f in the
   source repository's history; what is left is taste, not compliance.
2. **Migration.** `known-violations.json` emptied by fixing, not by
   loosening; tabular Arabic-Indic digits in the numeric face;
   components read the motion and line-height tokens, with no hard-coded
   literals left in the token map.
3. **The first set of components**, each with a story, keyboard and
   screen-reader behaviour, tests, and light and dark in its story:
   Table, Callout, Skeleton and ProgressBar, EmptyState, Toolbar and
   ButtonGroup, AppHeader and PageShell, math and code display, StepList,
   Metric and StatBar, Kbd with a shortcut hook and a shortcuts Dialog,
   AlertDialog and an undo toast, VisuallyHidden and LiveRegion, and the
   controls, overlays, charts and DataGrid listed in the README.

## Open

1. **Components the products need.** FilterBar; a DataGrid column
   chooser and bulk action bar; per-cell tone (status colour); a
   derivation table that shows how a figure was worked out; a deadline
   or countdown cell; a case timeline; a text diff; order-ticket inputs
   with price and yield linked; a coupon calendar; a first-paint helper
   for language, direction and theme with font preload; formatters; a
   breakpoint hook. Each with a story, keyboard and screen-reader
   behaviour, tests, and light and dark in its story.
2. **Known defects.** Canvas refit when only the height changes; Ladder
   showing "book is empty" before its first frame; the focus after a
   dialog opened from a grid editor; line boxes growing when Noto Sans
   Arabic arrives; Table header wrapping; RecordList's late frame and
   pointer focus; Tabs overflow; TextField description as text only;
   DataGrid tone.
3. **Tokens.** Token sources to DTCG 2025.10; light and dark times
   density in the build; Heatmap height from the density tokens; z-index,
   scrim and dimension tokens (Dialog and Sheet derive widths from the
   space scale and the scrim from a colour mix until those exist); stale
   states on Ladder, Heatmap and TradeTable.
4. **Storybook as the public face.** Foundations (tokens in light and
   dark, the live verification report), components with usage rules, a
   page on how each promise is checked.
5. **Accessibility as a visible differentiator.** Every new component
   joins the axe sweep in its four modes and the contrast pairs it adds
   are listed in `pairs.mjs`.

## Working rules

- One narrow brief per component, one pull request each; branches
  updated from `main` and re-checked before merge.
- No new playground features unless a step above needs them.
