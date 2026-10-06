# C5: Toolbar and ButtonGroup

Why: the replay demo's transport row and the algebra demo's action row
are plain flex divs; keyboard users tab through every control.

Build:
- `Toolbar` (React Aria `Toolbar`): `role="toolbar"`, an accessible
  label, arrow-key roving focus between its controls, orientation;
  separators between groups;
- `ButtonGroup`: visually grouped buttons with consistent spacing and
  shared border radius, inside or outside a toolbar.

Tests: Tab enters and leaves the toolbar once, arrows move within it
(reversed in RTL), Home/End work.
