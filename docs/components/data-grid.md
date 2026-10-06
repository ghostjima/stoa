# DataGrid

A grid for large tables: 50,000 rows by 30 columns is the design load. It
replaces the table demo of design-engineer (TanStack Table v9 and
`@tanstack/react-virtual`). Source: `packages/react/src/DataGrid.tsx`;
stories under Data/DataGrid.

## Foundation: Stoa's own grid on arithmetic windowing

Decided 2026-10-04 on the measurements below. The grid is an ARIA grid
of div elements with Stoa's own semantics and key map. It renders the
rows and columns in view, plus the active row and column. Rows have the
density's row height and columns their given widths, so the window is
computed, not measured. No dependency was added for it.

Three spikes rendered the same 50,000 x 30 dataset (strings and numbers,
deterministic), each with two pinned columns:

- **React Aria Components 1.21.1**: `Virtualizer` with a `TableLayout`
  subclass, `Table` with multiple selection, a checkbox column and
  sortable columns.
- **@tanstack/react-virtual 3.14.13**: a row and a column virtualiser
  under the grid markup Stoa now uses.
- **Arithmetic window**: the same markup, with the window computed from
  `scrollTop`, `scrollLeft` and the fixed sizes.

### What React Aria Components 1.21.1 provides

Checked in `node_modules`, not taken from its documentation:

- `Virtualizer` and `TableLayout` (from `react-stately` 3.50.0)
  virtualise rows, and cells within a row along x (`binarySearch` on
  both axes in `TableLayout.getVisibleLayoutInfos`). The header row is
  sticky.
- Pinned columns: `TableLayout` has a protected `isStickyColumn` hook
  that returns false. Overriding it keeps those cells mounted, but the
  table renders cells as plain children of the row, with no position of
  their own. In the spike, the pinned cells scrolled away: after a
  1,500 px sideways scroll, the row header sat at x = -1,425 px.
- No inline editing in `Table`.
- `GridList` is a grid with one cell per row, so it has no columns to
  virtualise or pin. It was not measured.
- The collection holds every row and cell. At 50,000 x 31 that cost
  dominates every number below.

### Measurements

Machine: Apple M4 Pro (12 cores), 24 GB, macOS 26.6.2. Browser: Chromium
153.0.8010.12 headless (Playwright 1.63.0, revision 1243), viewport
1280 x 800. Node 22.18.0. Production builds (Vite 8.3.1).

What each figure measures:

- **First render**: from the call that renders the grid to the first
  animation frame with grid cells in the DOM, median of 3 runs. The
  dataset is built before the clock starts.
- **DOM elements**: elements inside the grid element after the first
  render.
- **JS heap**: `usedJSHeapSize` after the first render, without a forced
  garbage collection; median of 3.
- **Scroll frames**: intervals between animation frames while a script
  scrolls 56 px down per frame for 300 frames, then 24 px sideways per
  frame for 120 frames. Every run's intervals are pooled (1,260). At
  60 Hz, 16.7 ms is on time. This does not measure compositor-only
  frames or visible blank areas.
- **Move per key**: ArrowDown on the focused cell, from dispatch until
  the next task (the handler, React's render and commit, and the focus
  move), 1,000 presses from row 1, each after the previous one's frame.
  Pooled p50 and p95. Every variant landed on row 1,001 (aria-rowindex
  1,002) in every run.
- **Burst of 1,000**: the same presses with only a task between them;
  total time, median of 3. Each variant moved 1,000 rows.

Spikes, on ceb7591 with throwaway spike code (not committed; the
temporary `@tanstack/react-virtual` install was reverted). Grid area
1,200 x 600 px.

| | React Aria Table | TanStack Virtual | Arithmetic window |
|---|---|---|---|
| First render | 3,234 ms | 15.9 ms | 14.6 ms |
| DOM elements | 1,055 | 434 | 394 |
| JS heap | 1,596 MiB | 31 MiB | 31 MiB |
| Scroll frames p50 / p95 / max | 22.7 / 28.3 / 836.6 ms | 16.7 / 17.6 / 19.8 ms | 16.7 / 17.6 / 20.4 ms |
| Scroll frames over 20 ms | 1,157 of 1,260 | 0 | 1 |
| Move per key p50 / p95 | 13.9 / 19.4 ms | 1.0 / 1.5 ms | 1.4 / 2.0 ms |
| Burst of 1,000 | 58,396 ms | 454 ms | 390 ms |
| Pinned columns | do not stick | stick | stick |

React Aria's Table is two orders of magnitude slower to mount, holds
1.6 GB, misses most frames while scrolling, and does not pin columns.
TanStack Virtual and the arithmetic window are within noise of each
other. With fixed row heights and given column widths, a virtualiser
library has nothing to measure, so it did not earn the dependency.

DataGrid itself, on 0889d05, measured with
`packages/react/e2e/data-grid.measure.mjs` against the FiftyThousandRows
story (built Storybook; grid area 1,220 x 448 px; first render from the
story's render, including the panel and search field):

| | DataGrid |
|---|---|
| First render | 26.3 ms (min 25.8, max 34.5) |
| DOM elements | 570 at first render, 705 after the scroll (26 rows) |
| JS heap | 46 MiB |
| Scroll frames p50 / p95 / p99 / max | 16.7 / 17.4 / 17.9 / 19.6 ms; none over 20 ms |
| Move per key p50 / p95 / max | 2.4 / 3.0 / 6.0 ms |
| Burst of 1,000 | 864 ms; 1,000 rows moved |

A move costs more than in the spike because each row also draws a
checkbox with its label and formats its numbers in the locale. It is
still well inside a 16.7 ms frame.

Each new `rows` array rebuilds the set of row keys (`new Set(rows.map(rowKey))`,
which counts the selection against the rows) and the display order. On
2a9155a, in Chromium 153 (Playwright's headless build), with 50,000 order
rows and one row inserted at the top for each of 200 new arrays, the key
set took 1.3 ms at the median (p95 1.4 ms, max 4.0 ms) and the order 0.6 ms
(p95 0.8 ms); this times those two expressions alone, not a render. That is
under a tenth of a 16.7 ms frame, so both are left as they are.

When `rows` change, the active cell and an open editor follow their row by
its key: a row inserted above does not move them to another row, and the
focus stays on the active cell (at the same position when its row is
gone). Finding a row that moved is a scan of the display order, done only
when the key at the old position has changed.

## API

```tsx
<DataGrid
  label="Orders"
  rows={orders}
  rowKey={(o) => o.id}
  columns={[
    { id: "id", header: "Order", accessor: (o) => o.id, width: 120, pinned: true, sortable: true },
    { id: "status", header: "Status", accessor: (o) => o.status, width: 128,
      editor: { kind: "enum", options: [{ id: "new", label: "New" }, { id: "filled", label: "Filled" }] } },
    { id: "note", header: "Note", accessor: (o) => o.note, width: 200,
      editor: { kind: "text", validate: (v) => (v.length > 40 ? "At most 40 characters." : null) } },
    { id: "price", header: "Price", accessor: (o) => o.price, width: 112, sortable: true },
  ]}
  selectionMode="multiple"
  onEdit={({ rowKey, column, value }) => save(rowKey, column, value)}
/>
```

- Columns: `id`, `header`, `accessor`, `width` (CSS pixels), `pinned`
  (leading), `sortable`, `format` (text from the value, the row and the
  locale's formats), `editor` (`enum` with options or `text`, each with
  an optional `validate` that returns the error to announce).
- Sort, selection and active cell are controlled (`sort`,
  `selectedKeys`, `activeCell`) or not (`defaultSort`,
  `defaultSelectedKeys`, `defaultActiveCell`), with `onSortChange`,
  `onSelectionChange`, `onActiveCellChange`. `manualSorting` shows a
  sort without reordering rows that come sorted.
- `onEdit` fires with the row, its key, the column id and the new value,
  only when the value changed. The grid does not change `rows`.
- `loading` draws skeleton lines and marks the grid busy; `emptyState`
  replaces the locale's "No rows to show."; `highlight` marks matching
  text.
- Built-in words (select all, a row's checkbox, sort announcements,
  counts, loading, empty) are in `locale.ts`, in English and Arabic.
  Numbers use the locale's digits.

## Accessibility, as far as the tests go

- Unit tests (`dataGrid.test.tsx`, jsdom): role grid with
  `aria-rowcount`, `aria-colcount` and `aria-multiselectable`;
  `aria-rowindex` and `aria-colindex` on the rendered window;
  `aria-sort` on sortable headers; `aria-selected` on rows; a single
  tab stop; every key of the key map; right-to-left arrows; editor
  errors as alerts tied to the field with `aria-describedby` and
  `aria-invalid`; polite announcements of counts and sort.
- Browser tests (`e2e/dataGrid.e2e.ts`, Chromium, built stories): only
  the rows and columns in view are in the DOM; `aria-rowindex` matches
  the row after scrolling to row 40,000; Ctrl+End reaches row 50,000;
  the header and pinned columns stick, also right to left.
- axe-core 4.13.0 over the five stories in light and dark, left to
  right and right to left, English and Arabic, and over selected,
  sorted, editing-with-error and search states: no serious or critical
  violation. The moderate ones are the story frame's (no main landmark,
  no first-level heading).
- Colours are pairs that `packages/tokens/src/pairs.mjs` already checks:
  body text on the surface and on the hover fill (selected rows), muted
  text on the sunken surface (headers), the down colour on the surface
  (errors). A search match is marked by weight and an accent underline,
  not a new fill.

## Not included

Column resizing and reordering, variable row heights, Shift+click
ranges, typeahead in the list editor, and the demo's edit-conflict
panel (an application concern, built on `onEdit`).
