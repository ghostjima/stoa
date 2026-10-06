# C3: Skeleton and ProgressBar

Why: Themis shows a blank page while its engine loads; Tyche shows
"Loading AAPL..." as text although it knows the download size.

Build:
- `ProgressBar` (React Aria `ProgressBar`): determinate with value, max
  and a formatted value label (for example bytes), and indeterminate;
  label required.
- `Skeleton`: placeholder blocks (text lines, a rectangle) with the size
  of the content they stand in for; `aria-hidden`, with the loading
  state announced by the container (`aria-busy`) or a ProgressBar.
  Any shimmer uses the motion tokens and stops under reduced motion.

Out of scope: spinners.
