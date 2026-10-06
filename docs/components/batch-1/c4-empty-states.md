# C4: EmptyState, and states on Ladder and Heatmap

Why: there is no stale indicator while a seek is pending, and no
EmptyState for regions that are not canvases. The empty states of Ladder
and Heatmap exist (a message drawn on the canvas and given as text, see
`drawEmpty` and `emptyText`).

Build `EmptyState` (title, description, optional action) for regions
with nothing to show yet.

Add to `Ladder` and `Heatmap`:
- a `stale` prop (for example while a seek is pending) that shows a
  visible marker and a text alternative, without redrawing the canvas
  differently in a way that could be mistaken for data;
- Heatmap height from the density tokens instead of a caller-computed
  value (the Tyche demo now reads the row height itself); keep the prop
  as an override.

Tests cover each state; stories show empty, stale and live.
