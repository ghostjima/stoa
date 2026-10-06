// The panel's markup for the two known-violations.json cases the gate in
// scripts/checks.test.mjs fails on but the live values alone never
// produce: a listed entry whose rule is reported only, and a listed entry
// no rule produces. Rendered to static markup, so no DOM is needed.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import knownViolationsJson from "../../../packages/tokens/known-violations.json";
import { BrowserChecksPanel } from "./BrowserChecksPanel";
import { runBrowserChecks } from "./browserChecks";
import { DENSITY_MODES, baseTokens, resolveTokens, type DensityMode, type ResolvedTokens } from "./tokenModel";

// Typed here: with the list empty, the JSON's own type is never[].
const knownViolations: { violations: { id: string }[] } = knownViolationsJson;

const themes = { light: resolveTokens(baseTokens, {}, "light", "regular"), dark: resolveTokens(baseTokens, {}, "dark", "regular") };
const densities = Object.fromEntries(DENSITY_MODES.map((mode) => [mode, resolveTokens(baseTokens, {}, "light", mode)])) as Record<
  DensityMode,
  ResolvedTokens
>;

describe("BrowserChecksPanel", () => {
  const known = [
    ...knownViolations.violations.map((v) => ({ id: v.id })),
    { id: "up-down-distinguishability/light/contrast" },
    { id: "text-contrast/light/no-such-pair" },
  ];
  const result = runBrowserChecks({ themes, densities, known });
  if (!result.available) throw new Error(result.note);
  const html = renderToStaticMarkup(
    createElement(BrowserChecksPanel, { checks: result.checks, unproduced: result.unproduced, onSelect: () => {} }),
  );

  it("shows a listed entry whose rule is reported only with its own status", () => {
    expect(html).toMatch(
      /data-check="up-down-distinguishability\/light\/contrast" data-status="listed-reported"[\s\S]*?listed, but reported only: remove from known-violations\.json/,
    );
  });

  it("shows a listed entry no rule produces", () => {
    expect(html).toMatch(
      /data-entry="text-contrast\/light\/no-such-pair" data-status="unproduced"[\s\S]*?not produced by any rule/,
    );
  });
});
