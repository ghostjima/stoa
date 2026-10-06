# Stoa Design System

[![CI](https://github.com/ghostjima/stoa/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ghostjima/stoa/actions/workflows/ci.yml)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)

## In one minute

Stoa is a design system for decision-dense financial interfaces: operations
desks, bond and trading screens, ledgers, anything with many live values,
many states and little room. It covers design tokens and accessible React
components, in English, Russian and Arabic (the right-to-left proof), and
its quality is measured rather than claimed (see
[Measured quality](#measured-quality) and the checks under
[Principles](#principles)).

It is built in the open alongside the two reference products that use
it:

- [Ariadne Desk](https://github.com/ghostjima/ariadne): an internal
  operations desk for complaints and refusals, where an assistant drafts
  and a person decides.
- [Tyche Bonds](https://github.com/ghostjima/tyche): a bond terminal,
  from the investor's goal to the order, with the risk visible where the
  decision is made.

Status: early. Tokens and a first set of React components are in; more
follow as the products need them.

## Packages

- `@ghostjima/stoa-tokens`: design tokens in the W3C Design Tokens
  format, built with Style Dictionary into CSS variables (`--stoa-*`),
  an ES module with TypeScript declarations, and flat JSON.
- `@ghostjima/stoa-react`: React components on React Aria.
  - Market data: Ladder and Heatmap on canvas, TradeTable on the
    generic Table, LineChart and EventStrip, each with an empty state
    and a text alternative.
  - DataGrid: a virtualised ARIA grid for large tables, with pinned
    columns, sorting, selection, inline editing and a tone per cell (a
    symbol in the status colour, never the colour alone)
    ([decision and measurements](docs/components/data-grid.md));
    DataGridColumnChooser (show, hide and reorder columns from the
    keyboard) and DataGridSelectionBar (actions on the selected rows,
    after which the focus stays in the grid).
  - Controls: Button (default, primary, secondary, ghost, danger),
    ChoiceGroup, Select, NumberField, TextField, TimeSlider, Slider,
    Toggle, Switch, Checkbox and CheckboxGroup, Tag, FilterChip,
    FilterBar (search, chip groups with counts, Clear all and the empty
    state, folded into a sheet on a phone), Toolbar and ButtonGroup, Tabs,
    Disclosure. A labelled control shows
    its label by default; `hideLabel` keeps it for assistive technology
    only, where the options name themselves or a heading names the
    control (ThemeSwitch and LanguageSwitch always hide theirs).
  - Deadlines and workings: Countdown and DeadlineCell (time left in
    working days, days or hours counted by the application, a warning
    and an overdue state in words and a symbol, read out only when the
    state changes) and DerivationTable (how a figure was worked out:
    step, formula, value, and source with its revision; copied as plain
    text).
  - Feedback and layout: Callout, EmptyState, Skeleton, ProgressBar,
    toasts (ToastQueue, ToastRegion), StatusBadge, LiveRegion,
    VisuallyHidden, Panel, StatBar and Metric, SourceNote (where a
    panel's figures come from: the source's tag, a sentence and a link),
    AppHeader, PageShell.
  - Overlays, lists and content: Dialog, Sheet, AlertDialog, Tooltip,
    ReorderableList, RecordList (the list of a master-detail view),
    StepList, DescriptionList, LogView, CodeView, and Ltr, an inline
    left-to-right isolate for code, tickers and formulas in a sentence.
    The values Stoa draws (StatBar and Metric values, number cells in
    Table and DataGrid, values in its own sentences) are isolated in the
    direction of their own first letter, so "-0.42%" and "16.9 ms" keep
    their order in a right-to-left page.
  - Keyboard and preferences: Kbd, `useShortcuts`, ShortcutList and
    ShortcutsDialog, and Button's `shortcut`, which draws the keys in
    the button and sets `aria-keyshortcuts`; ThemeSwitch (System, Light, Dark) and
    LanguageSwitch with the preference hooks behind them.
  - Application helpers: the first paint (`firstPaintScript`,
    `useAppPreferences`, `preloadFonts`), formatters for money,
    percents, signed values, dates, times, durations and lists
    (`useFormatters`), and the viewport's width class (`useBreakpoint`,
    `useMediaQuery`). See [Application helpers](#application-helpers).

  Words and digits follow the locale set with React Aria's
  `I18nProvider` (`useStoaFormat`); it and React Aria's
  `UNSAFE_PortalProvider`, which sets where overlays are portalled, are
  exported from `@ghostjima/stoa-react`, so an application needs no
  React Aria of its own. Stoa's own words exist in English,
  Russian and Arabic; an Arabic locale such as `ar-u-nu-arab` also gets
  Arabic-Indic digits.

## Principles

- **Density is a setting**, not a redesign: `data-density="compact |
  regular | comfortable"` changes row height, cell padding and type
  size together.
- **Colour never carries meaning alone.** Up and down, bid and ask use
  colour and a shape or sign. Contrast is measured rather than claimed:
  `packages/tokens/src/pairs.mjs` lists every colour pair and size that is
  checked and why, `pnpm --filter @ghostjima/stoa-tokens verify` prints
  the current numbers, and any failure that is accepted for a while is
  recorded in `packages/tokens/known-violations.json`, which is empty:
  every enforced check passes in both themes and every density. Body
  text meets 7:1 on both surfaces. Twenty measurements are reported but
  not enforced, each with its reason in `pairs.mjs`; twelve of them are
  below their threshold: the decorative `border` rule, the translucent
  depth bars (their sizes are printed beside them), the scrollbar thumb
  (kept quiet on purpose), and the lightness gap
  between up and down (told apart by sign and shape, and by hue for every
  colour-vision model checked).
- **Motion explains a change of state** and follows the user's
  reduced-motion setting, or `data-motion="reduce"` on any element for an
  application's own setting: every duration token goes to zero.
- **Right-to-left from the start**: logical properties only, and a type
  stack with IBM Plex Sans Arabic.
- **Numbers are tabular** and prices align on the decimal point.

## Tokens

- Colour: a cool neutral scale, one blue accent, teal for up and bid,
  red for down and ask, amber for warnings; OKLCH; light and dark themes
  (`data-theme`, or the system setting when unset). `color-scheme` is
  set with the theme, so native controls, scrollbars and autofill are
  drawn in it too.
- Type: IBM Plex Sans, Plex Sans Arabic and Plex Mono, with Noto Sans
  Arabic after Plex Mono in the numeric stack for tabular Arabic-Indic
  digits, and Plex Sans Arabic after it (all SIL OFL 1.1). See
  [Fonts](#fonts) for what an application loads.
- Space on a 4 px grid; radii from 0 to 8 px.
- Breakpoints: narrow up to 40rem (a phone), wide from 64rem (panes side
  by side); `useBreakpoint` reads them.
- Motion: fast 80 ms, base 160 ms, slow 240 ms, value flash 600 ms.

## Focus after an action

An action that removes the control that has the focus must say where the
focus goes; otherwise it falls to the page's body, and the next Tab starts
again at the top of the page. Stoa's components do it themselves:

- Dialog, Sheet and AlertDialog return the focus to their trigger. One
  opened without a trigger returns it to whatever had it when it opened,
  or, when that control is gone, to the tab stop that stands where it
  was: for a grid editor that closed as the dialog opened, the edited
  cell.
- A dismissed Callout leaves the focus on the tab stop that stands where
  it was.
- ReorderableList (React Aria's GridList) moves the focus to the
  neighbouring item when one is removed, and to the list when it empties.
- Closing the last toast returns the focus to where it was before the
  toasts.

For an application's own action that removes the focused control (a
selection bar that closes after Apply, a row deleted from its own
button), call `keepFocusInPlace` with the control before the state change
that removes it:

```tsx
<Button
  onPress={(e) => {
    keepFocusInPlace(e.target);
    applyToSelection();
  }}
>
  Apply
</Button>
```

Once the control has left the document, and only if the focus went with
it, the focus moves to the next tab stop where it was, or the one before.
Where the action has an obvious next place (the grid's active cell after
a bulk change, the step that follows a skipped one), focus that place
directly instead.

## Fonts

Stoa names its faces in two stacks, `--stoa-font-family-sans` for words
and `--stoa-font-family-mono` for numbers, code and fixed-width columns,
and loads no font file itself: the application does, for example from
Fontsource. What to load depends on the scripts the application shows:

| Script | Load | Used for |
|---|---|---|
| Latin, Cyrillic | IBM Plex Sans 400 and 500, IBM Plex Mono 400 | All text; numbers, code and log times in the numeric face |
| Arabic | IBM Plex Sans Arabic 400 and 500 | All Arabic text, including Arabic words inside the numeric face |
| Arabic-Indic digits in columns | Noto Sans Arabic 400 (optional) | Tabular Arabic-Indic digits in the numeric face |

```ts
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/noto-sans-arabic/400.css"; // optional
```

IBM Plex Mono has no Arabic letters. Stoa sets words in the sans face
(a log line's message, a progress bar's value text, StatBar labels, a
DataGrid column with `mono: false`), and the numeric stack names Noto
Sans Arabic, then IBM Plex Sans Arabic: Arabic text that still reaches
the numeric face is drawn in one of them, joined, and never in a system
monospace face that draws it as separate letters. Without Noto Sans
Arabic, Arabic-Indic digits come from IBM Plex Sans Arabic, whose digits
are proportional, so numbers in a column no longer line up digit for
digit.

### Arabic without a layout shift

Fontsource's faces swap in when they arrive, so text is first drawn in
whatever the stack falls back to. For Arabic, `tokens.css` defines two
fallback faces after IBM Plex Sans Arabic in both stacks: Tahoma (Windows,
macOS) and Geeza Pro (Apple systems), each scaled with `size-adjust` and
given Plex Sans Arabic's ascent and descent, so a line drawn before the
font arrives takes about the room it takes after. A system with neither
font falls back to its own face, unscaled. On the "Layout/Panel > Arabic
page" story with the Arabic fonts held back
(`packages/react/e2e/arabic-cls.measure.mjs`), the layout shift fell from
0.0136 to 0.0004 (median of 7 runs, Chromium 153, macOS 26, Apple M4 Pro).

An application with an Arabic interface should also preload the Arabic
face it shows first, so it usually arrives before the first paint; only
when the page is in Arabic, since a preload that is not used costs the
download:

```ts
import { preloadFonts } from "@ghostjima/stoa-react";
import plexArabic from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2?url";

// At the top of the entry module: only for the language the page is in.
preloadFonts({ ar: [plexArabic] });
```

Set `lang` and `dir` on the root element before the first paint, so the
first layout is already the Arabic one: `firstPaintScript` below does it.

## Application helpers

### Before the first paint

An application describes its language and theme choices once and uses
that description twice: inlined into index.html, where it sets `lang`,
`dir` and `data-theme` before anything is drawn, and in the running
application, which reads and changes the same choices. Both read a
choice the same way: the URL parameter first (`?lang=`, `?theme=`), then
the stored value, then the default.

```ts
// src/preferences.ts: no React here, so the build can import it too.
import type { FirstPaintConfig } from "@ghostjima/stoa-react/first-paint";

export const PREFERENCES: FirstPaintConfig = {
  languages: ["ru", "en"],
  language: { storageKey: "tyche.lang" },
  theme: { storageKey: "tyche.theme" },
  // Optional: fonts to preload for a language, as URLs the page can reach
  // as written (a file in the public folder, for example).
  fonts: { ru: ["/fonts/ibm-plex-sans-cyrillic-400-normal.woff2"] },
};
```

```ts
// vite.config.ts: the script goes first in the head.
import { firstPaintScript } from "@ghostjima/stoa-react/first-paint";
import { PREFERENCES } from "./src/preferences";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "first-paint",
      transformIndexHtml: () => [{ tag: "script", children: firstPaintScript(PREFERENCES), injectTo: "head-prepend" }],
    },
  ],
});
```

```tsx
// In the application: the same choices, kept where the script reads them.
const { language, theme } = useAppPreferences(PREFERENCES);
<LanguageSwitch languages={PREFERENCES.languages} value={language.language} onChange={language.setLanguage} />
<ThemeSwitch value={theme.choice} onChange={theme.setChoice} />
```

The script is plain ES5 with no dependencies, works with storage blocked,
and sets no `data-theme` for "System", so tokens.css follows the system.
`theme: false` leaves the theme alone, for an application without a theme
switch. Fonts that only the bundler can name (`?url` imports) are
preloaded with `preloadFonts` from the entry module instead, as in
[Fonts](#fonts).

### Formatters

`useFormatters()` gives an application's own values in the locale of the
`I18nProvider` above it (`stoaFormatters(locale)` outside React), through
Intl, with two rules on top of it in every locale: a negative number has
the minus sign (U+2212), not a hyphen, and a value never breaks across
lines (its spaces are non-breaking). Pass `{ timeZone: "Europe/Moscow" }`
for dates and times in a given zone.

| Call | Russian | English |
|---|---|---|
| `money(1234567.5)` | 1 234 567,50 ₽ | ₽1,234,567.50 |
| `money(12.5, { signed: true })` | +12,50 ₽ | +₽12.50 |
| `percent(0.0752)` | 7,52 % | 7.52% |
| `signedPercent(-0.0042)` | −0,42 % | −0.42% |
| `signed(1.25)` | +1,25 | +1.25 |
| `date(at)`, `date(at, "long")`, `date(at, "numeric")` | 4 сент. 2026 г., 4 сентября 2026 г., 04.09.2026 | Sep 4, 2026, September 4, 2026, 09/04/2026 |
| `time(at)`, `dateTime(at)` | 14:05, 4 сент. 2026 г., 14:05 | 2:05 PM, Sep 4, 2026, 2:05 PM |
| `duration(ms)` for 2 days 5 h 30 min | 2 дн. 5 ч 30 мин | 2 days, 5 hr, 30 min |
| `list(["купон", "оферта", "погашение"])` | купон, оферта и погашение | coupon, offer, and maturity |

The digits follow the locale. Values still need their own direction in a
right-to-left page: set them in `Ltr` or `bdi`.

### Breakpoints

`useBreakpoint()` is the viewport's width class, "narrow", "medium" or
"wide", from the breakpoint tokens (`--stoa-breakpoint-narrow`, 40rem,
and `--stoa-breakpoint-wide`, 64rem), kept current as the window is
resized; `useMediaQuery(query)` answers any media query the same way. A
media query in CSS cannot read a variable, so a stylesheet writes the
values out (`@media (max-width: 40rem)`), as Stoa's own does.

## Measured quality

[![Unit tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ghostjima/stoa/badges/unit-tests.json)](#what-each-badge-counts)
[![Browser tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ghostjima/stoa/badges/browser-tests.json)](#what-each-badge-counts)
[![axe](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ghostjima/stoa/badges/axe.json)](#what-each-badge-counts)
[![WCAG 2 contrast](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ghostjima/stoa/badges/contrast.json)](#what-each-badge-counts)
[![CSS gzip](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ghostjima/stoa/badges/css-size.json)](#what-each-badge-counts)

### What each badge counts

CI publishes the dynamic badges from each green run on `main` to the
`badges` branch, as JSON that img.shields.io reads; `scripts/badges.mjs`
builds them from that run's own output and stops, publishing nothing,
when a value cannot be read.

- Unit tests: tests passed, summed over Vitest and node:test in every
  package and the root scripts (`pnpm test`).
- Browser tests: Playwright tests passed in Chromium, the playground's
  (`pnpm test:e2e`) and the stories' against the built Storybook
  (`test:stories`).
- axe: axe-core 4.13.0 over every story in the built Storybook's index,
  in four modes: light and dark, each left to right in English and right
  to left in Arabic. A serious or critical violation fails the run;
  moderate and minor ones are not counted.
- WCAG 2 contrast: enforced text and non-text contrast checks passing,
  out of all enforced ones (`verify`, `dist/verify.json`), and how many
  failures `known-violations.json` accepts. Reported-only measurements
  are not in it.
- CSS gzip: the built `styles.css` and `tokens.css`, gzip level 9.

## Development

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm -r typecheck
pnpm test
```

`pnpm test:e2e` runs the playground's browser tests (it needs the
Chromium that `pnpm --filter playground exec playwright install chromium`
downloads), `node scripts/token-map.mjs --check` fails when the token map
in `docs/generated/` is stale, and `pnpm storybook` serves the stories.
`pnpm build-storybook` builds the stories into `storybook-static/`, and
`pnpm --filter @ghostjima/stoa-react test:stories` runs the browser
tests against that build, the axe sweep over every story among them.
The playground, the tool the tokens are tuned in, is described in
[apps/playground/README.md](apps/playground/README.md). How to contribute,
and what every change has to pass: [CONTRIBUTING.md](CONTRIBUTING.md).

## Role

Timur Khubaev ([ghostjima](https://github.com/ghostjima)): design of the
system, its tokens and components, the accessibility and contrast checks,
the playground and the tests.

## License

MIT OR Apache-2.0, at your option. Fonts: SIL Open Font License 1.1.
