// What both preview frames show: which screen, in which data state, and
// how many rows the data grid holds. These are global settings of the
// side panel, not of a frame: the two frames always show the same screen
// in the same state, so one look takes in both themes and both
// directions of it.

export type ScreenId = "market" | "controls" | "feedback" | "overlays" | "charts" | "grid";

/** The screens, in the order the side panel lists them. Market is the
 * dense screen the playground started with; the others put the
 * components of each group to work on a screen of their own. */
export const SCREENS: { id: ScreenId; label: string }[] = [
  { id: "market", label: "Market" },
  { id: "controls", label: "Controls" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays and lists" },
  { id: "charts", label: "Charts and tables" },
  { id: "grid", label: "Data grid" },
];

/** The state of the data behind a component screen. Live is the data
 * itself; the other three are what a screen shows instead of it. */
export type DataState = "live" | "loading" | "empty" | "error";

export const DATA_STATES: { id: DataState; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "error", label: "Error" },
];

/** Rows in the data grid: a page of a few hundred, a day's blotter, and
 * the size the grid is virtualised for. The default stays light, because
 * two frames each hold a grid. */
export const GRID_ROW_COUNTS = [300, 5_000, 50_000] as const;
export type GridRowCount = (typeof GRID_ROW_COUNTS)[number];

export type ScreenSettings = {
  screen: ScreenId;
  state: DataState;
  gridRows: GridRowCount;
};

export const DEFAULT_SCREEN_SETTINGS: ScreenSettings = { screen: "market", state: "live", gridRows: 300 };
