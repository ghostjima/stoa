# Stoa playground

A private tool for tuning Stoa's tokens against dense screens. It is never
published: `"private": true`, no `files` field, no build output that is
meant to be served anywhere.

```
pnpm build                     # the playground reads the built packages
pnpm --filter playground dev   # http://localhost:5186
```

## What it does

- Two preview frames at once, each running the same screen. Each frame
  header picks the frame's view (light or dark by left to right or right
  to left), its language (English, Russian or Arabic: the screen's words,
  Stoa's own words and the language's digits and separators, through
  React Aria's `I18nProvider`), a reduced motion switch
  (`data-motion="reduce"` on the frame, every duration token at zero),
  and a colour-vision preview.
- The side panel's Screen setting picks what both frames show. Market is
  the dense screen (Ladder, Heatmap, TradeTable, the controls and the form
  fields) off one synthetic stream that can be paused and resumed; the
  replay slider under the heatmap scrubs back over the stream's last
  window of frames. The component screens put every Stoa component to
  work (`src/screens/`, words in `src/screens/words.ts`):
  - Controls: the blotter's Toolbar with a ButtonGroup, separators and
    the four Button variants, a FilterChipGroup with counts, a FilterChip,
    Tags, Switches (one disabled with its reason), Checkbox and
    CheckboxGroup with a mixed "all" box, two Sliders, ThemeSwitch and
    LanguageSwitch with `directionOf`, and the keyboard shortcuts
    (`useShortcuts`, `groupShortcuts`, ShortcutList, Kbd).
  - Feedback: a PageShell with an AppHeader and a footer, ProgressBars
    (an amount and an indeterminate one), Callouts in every tone (one
    dismissible), toasts raised from buttons (ToastQueue, ToastRegion),
    the last trade as a visible LiveRegion with a VisuallyHidden currency,
    and Skeleton and EmptyState in their states.
  - Overlays and lists: Dialog, Sheet, AlertDialog and ShortcutsDialog
    from a toolbar or a key, a ReorderableList watchlist, a StepList of
    settlement steps, today's orders as a RecordList with the picked
    order in a DescriptionList (its time in force explained in a
    Tooltip), a LogView and a CodeView.
  - Charts and tables: a StatBar of Metrics, a Metric with a threshold, a
    LineChart with its data table, an EventStrip and a Table.
  - Data grid: a DataGrid of orders with selection, sorting, an editable
    status with validation, and a search that marks what it finds.
- The State setting (Live, Loading, Empty, Error) drives every component
  screen at once: skeletons and progress while loading, empty states
  (EmptyState, and the empty texts of Table, LineChart, EventStrip,
  ReorderableList, RecordList and DataGrid), and a negative Callout with a Retry that
  goes back to Live. Grid rows (300, 5,000, 50,000) shows on the data grid
  screen only. Market follows the stream in every state. A snapshot
  records the screen settings beside the panels' state.
- Overlays open inside the frame they were opened from: each frame gives
  React Aria a portal container of its own (`UNSAFE_PortalProvider`), so
  a dialog, a sheet or a toast takes that frame's theme, direction,
  density, motion, filter and locale. The container sticks to the part
  of the frame in view. A screen's keyboard shortcuts run only while the
  focus is inside its frame.
- The chrome (the header, the side panel and its tabs, the frame headers,
  the type panel and the sentences its measurements are reported in) is in
  English or Russian, from the EN/RU switch in the header: Stoa's
  LanguageSwitch wired to `useLanguagePreference`, kept in `?lang=` and in
  localStorage under `stoa-playground-lang`, with `lang` set on the document
  element and the document's title following it. English is the default.
  The words live in `src/chromeText.ts`, one typed dictionary per language
  with counts in their plural forms (`Intl.PluralRules`); token names, CSS
  variables and code identifiers stay as they are. The frames keep their
  own language selector. A message from the dev server or the font engine
  is shown as it came, in English, after a sentence in the chrome's
  language.
- The page is a Stoa PageShell with a fixed header: the header stays at
  the top and the page scrolls in the region under it, whose scrollbar
  lane is reserved; the side panel sticks inside that region. Every
  scrollbar is Stoa's own, thin and in the scrollbar tokens of its box's
  theme, so a dark frame draws a dark one.
- Token values are written as CSS custom properties on each frame's
  container, never on the document, so a re-theme restyles the preview
  containers rather than the whole page.
- The base is stoa-default: the token files in `packages/tokens/tokens`
  as they are in this working tree, one theme with a light and a dark
  mode.
- While a token's field has focus, the checks that read that token are
  listed in a tooltip beside the side panel; length tokens take a typed
  value as well as the slider. The Stats tab holds the session counters.
- Above the side tabs: undo, redo, pause or resume, the stream speed
  (1x, 2x, 4x), the density mode both frames use, and the Screen, State
  and Grid rows settings. The side tabs are
  Tokens, Overrides, Checks, Type, Snapshot and Stats.
- Every edit in the tokens panel is an override against stoa-default,
  listed with the value the token files give, resettable one by one or all
  at once, with undo and redo. One step back is one edit as a person would
  mean it: typing into a field is one step per pause of 500 ms, and a
  slider drag is one step however far it travels.
- The Checks tab runs every rule in `packages/tokens/src/checks.mjs` in
  the browser on the live values of both themes (target size in all
  three densities), matches the results against `known-violations.json`
  the way `scripts/checks.test.mjs` gates them, and a Highlight on a
  check opens the Tokens tab with the tokens it reads marked. On request
  it also runs the real `packages/tokens` build and its tests on the
  edited files, in a temporary directory, and compares the
  values the previews are using with the variables the build emitted. A
  disagreement is a failure: it means the previews are not showing what
  the build would produce.
- The type panel loads fonts (dropped files or Fontsource ids), reads what
  each file really contains with HarfBuzz in a worker, and tunes six type
  roles whose specimens are rendered in a table row inside every frame.
  See "Type" below.
- Snapshots (token files, overrides, what each area panel recorded, and
  the commit they were based on) are written to `snapshots/`, and loading
  one restores its overrides.

## Type

`src/type/` is brief 07: the font engine, the inspector and the roles.

- The engine (`engine.ts`) runs in a worker (`worker.ts`) and is the only
  thing that answers questions about a font: axes and their named
  instances, the layout features the file still has and what each does to a
  probe, the metrics, and the digit advances for Latin and Arabic-Indic
  with and without `tnum`. Nothing is taken from a feature list.
- A file is brought to an sfnt first (`sfnt.ts`). HarfBuzz given a WOFF2
  file does not fail: every code point maps to glyph 0 and .notdef has one
  advance, so a check that only compares advances would call an unread file
  tabular. WOFF2 is decoded, WOFF 1.0 is refused, and a digit set that
  shaped to glyph 0 is reported as absent, never as tabular.
- Digit advances are measured per glyph, and the same ten digits shaped as
  one run are recorded beside them, because a run carries pair kerning and
  contextual alternates that are not the glyphs' own advances.
- Reading roles (display, heading, body) come off a modular scale, base and
  ratio, rounded to whole pixels. Working roles (label, numeric, code) come
  off the density mode's font size with an offset. Each role states which
  rule produced the size on screen.
- An Arabic pairing gets a `size-adjust` computed from the two x-heights,
  and the pairing face is registered under that adjustment.
- Canvas numerics: `ctx.font` carries no feature settings, so the numeric
  face is registered as a `FontFace` with `featureSettings` and the digits
  are measured on a canvas. The panel reports what this browser did, for
  three routes, and whether Ladder's own font shorthand comes out tabular.

Measurements, including the digit advances of IBM Plex Sans, IBM Plex Sans
Arabic and Noto Sans Arabic, are in `docs/type-measurements.md`. To take
them again, or to measure another file:

```
node apps/playground/scripts/font-report.mjs "IBM Plex Sans=path/to/IBMPlexSans-Regular.woff2"
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm --filter playground dev` | The tool, with the `/api` endpoints. |
| `pnpm --filter playground build` | Only a check that the app compiles; the tool runs in dev. |
| `pnpm --filter playground typecheck` | `tsc --noEmit`. |
| `pnpm --filter playground test` | Unit tests (vitest). No browser needed. |
| `pnpm --filter playground test:e2e` | The Playwright smoke test. Needs a browser. |

`pnpm test` stays browser-free so that the acceptance commands in
`CONTRIBUTING.md` run on a fresh machine. The smoke test is its own script,
`test:e2e`, and CI runs it in a step of its own. It starts its own dev
server on port 5190 (`PLAYGROUND_E2E_PORT` moves it), apart from the
playground's and the demos' dev servers, and needs the Chromium that the pinned Playwright
version downloads: `pnpm --filter playground exec playwright install
chromium`. `tests/axe.spec.ts` runs axe-core (a pinned dev dependency)
over every screen in both initial views and every language, and over
every data state; it fails on any serious or critical violation and
logs the rest; it also scans the chrome in Russian, in the light and the
dark theme. `tests/language.spec.ts` switches the chrome to Russian and back.

`node apps/playground/scripts/screenshot.mjs [url] [out]` photographs the
frames against a dev server that is already running.

## Endpoints

All four are development only and live in `server/tokenServer.ts`.

- `POST /api/build` takes the four token files as text, writes them to a
  temporary directory with the real `packages/tokens` scripts, runs that
  package's own `build` and `test` commands there, and returns the built
  CSS, both commands' output, and the commit the repository was on. A
  command that outlives its timeout is killed and reported as failed.
- `POST /api/save` writes a snapshot to `snapshots/<name>.json`, with the
  overrides beside the token files. An unnamed save is
  stamped with the time it was written. A name already on disk is refused
  with 409 until the request says `overwrite: true`; `stoa-default` is
  refused with 403 whatever the request says, because it is the committed
  base every override is stated against. What the area panels
  contributed is recorded under `panels`, by panel id; the type panel puts
  font references and role tokens there, and the endpoint refuses panel
  state that carries embedded font data or runs past 64 KB, because a
  snapshot records a session and is not a font store.
- `GET /api/snapshots` lists the snapshot names on disk;
  `GET /api/snapshots?name=<slug>` returns one of them. A name that is not
  a slug a save would write is refused rather than cleaned up, so the
  endpoint reads nothing outside `snapshots/`.
- `GET /api/commit` returns the commit and whether the tree is dirty.

Every endpoint refuses a request whose `Origin` is not this server, and the
two POST endpoints require `content-type: application/json`, so a page on
another origin cannot drive the commands they run.

## Not here yet

- The type panel does not write token files. It produces role tokens (DTCG
  typography, with axes, features and the pairing under
  `$extensions["dev.stoa.type"]`) into a snapshot; migrating the token
  sources (DTCG 2025.10) is step 2 of `docs/roadmap/README.md`. Loading a
  snapshot restores overrides, not the panel state.
- The Fontsource path is written against the keyless v1 API and is covered
  by unit tests with a stubbed fetch. It has not been exercised against
  the live endpoints in this environment, which has no route to
  `api.fontsource.org`.
- A token edit re-mounts the canvas components (`revision` in
  `PreviewGrid.tsx`). Stoa React has the token-change signal
  (`tokensVersion`, `useTokenSignal`); the playground does not use it yet.
- The easing and spring editors of the motion brief were not taken; only
  the reduced-motion switch was.
