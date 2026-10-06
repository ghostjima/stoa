// The panel list: the one place the shell knows about an area panel.
//
// Stage 1's later briefs each add a panel under src/<area>/ and one line
// here, so two briefs being worked on at once do not meet in App.tsx. A
// panel may contribute three things besides its own controls: variables for
// every preview frame, content inside every preview frame, and what a
// snapshot should record for it.
import type { ComponentType, ReactNode } from "react";
import { TypePanel } from "./type/TypePanel";
import type { DensityMode, ResolvedTokens, Theme } from "./tokenModel";

export type Contribution = {
  /** CSS custom properties written on every preview frame, after the token
   * values, so a panel can override a token for the previews. */
  variables?: Record<string, string>;
  /** Content rendered inside every preview frame, after the dense screen. */
  frameContent?: ReactNode;
  /** What a snapshot records under this panel's id. */
  snapshot?: unknown;
};

export type PanelProps = {
  density: DensityMode;
  tokens: Record<Theme, ResolvedTokens>;
  /** Called with everything this panel contributes, whenever it changes. */
  onContribute: (contribution: Contribution) => void;
};

export type PanelSpec = {
  /** Also the key a snapshot records this panel's state under. */
  id: string;
  title: string;
  Component: ComponentType<PanelProps>;
};

export const AREA_PANELS: PanelSpec[] = [{ id: "type", title: "Type", Component: TypePanel }];

/** The variables of every panel, later panels winning, as one object for a
 * preview frame's style. */
export function mergedVariables(contributions: Record<string, Contribution>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const panel of AREA_PANELS) Object.assign(out, contributions[panel.id]?.variables ?? {});
  return out;
}

/** What the snapshot carries for the panels that contributed anything. */
export function panelSnapshots(contributions: Record<string, Contribution>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const panel of AREA_PANELS) {
    const snapshot = contributions[panel.id]?.snapshot;
    if (snapshot !== undefined) out[panel.id] = snapshot;
  }
  return out;
}
