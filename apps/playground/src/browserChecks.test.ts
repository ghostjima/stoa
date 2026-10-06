// The mapping from live resolved tokens to the verification engine's check
// inputs, and back from a result to the tokens it reads. Pure, so it is
// tested the same way tokenModel.test.ts tests the resolver: against the
// real token sources, no browser and no build required.
import { describe, expect, it } from "vitest";
import knownViolationsJson from "../../../packages/tokens/known-violations.json";
import { rulesForToken, runBrowserChecks, tokensForCheck, type BrowserCheck } from "./browserChecks";
import { DENSITY_MODES, baseTokens, resolveTokens, type DensityMode, type Overrides, type ResolvedTokens } from "./tokenModel";

// Typed here: with the list empty, the JSON's own type is never[].
const knownViolations: { violations: { id: string }[] } = knownViolationsJson;

function inputsFor(overrides: Overrides) {
  const themes = { light: resolveTokens(baseTokens, overrides, "light", "regular"), dark: resolveTokens(baseTokens, overrides, "dark", "regular") };
  const densities = Object.fromEntries(
    DENSITY_MODES.map((mode) => [mode, resolveTokens(baseTokens, overrides, "light", mode)]),
  ) as Record<DensityMode, ResolvedTokens>;
  return { themes, densities };
}

function byId(checks: BrowserCheck[]): Map<string, BrowserCheck> {
  return new Map(checks.map((c) => [c.id, c]));
}

describe("runBrowserChecks against the base tokens", () => {
  const result = runBrowserChecks(inputsFor({}));
  if (!result.available) throw new Error(result.note);

  it("runs every rule in checks.mjs, one result per pair, theme and density mode", () => {
    // The same total scripts/checks.test.mjs asserts against the built CSS
    // (83): the playground's resolver and the real build agree, so the
    // count is one more place that agreement is exercised.
    expect(result.checks).toHaveLength(83);
  });

  it("classifies every known-violations.json entry as known, not new", () => {
    const ids = byId(result.checks);
    for (const violation of knownViolations.violations) {
      expect(ids.get(violation.id)?.status, violation.id).toBe("known");
    }
  });

  it("has no new or fixed results, so it would not fail scripts/checks.test.mjs", () => {
    expect(result.checks.filter((c) => c.status === "new")).toEqual([]);
    expect(result.checks.filter((c) => c.status === "fixed")).toEqual([]);
    expect(result.wouldFailServerTests).toBe(false);
  });

  it("marks a failure that is not enforced as reported, never as new", () => {
    const upDown = result.checks.find((c) => c.id === "up-down-distinguishability/light/contrast");
    expect(upDown?.pass).toBe(false);
    expect(upDown?.enforced).toBe(false);
    expect(upDown?.status).toBe("reported");
  });

  it("passes plainly for a pair recorded nowhere", () => {
    const passing = result.checks.find((c) => c.id === "text-contrast/light/text-on-surface");
    expect(passing?.status).toBe("pass");
  });
});

describe("runBrowserChecks reacting to an override", () => {
  it("turns a passing pair into a new failure, and reset clears it", () => {
    // text on surface needs 7:1 (AAA); a near-white text colour fails it
    // without touching any other theme or pair.
    const broken = runBrowserChecks(inputsFor({ "semantic.light:color.text": "oklch(0.98 0.002 250)" }));
    if (!broken.available) throw new Error(broken.note);
    const failed = byId(broken.checks).get("text-contrast/light/text-on-surface");
    expect(failed?.pass).toBe(false);
    expect(failed?.status).toBe("new");
    expect(broken.wouldFailServerTests).toBe(true);

    const reset = runBrowserChecks(inputsFor({}));
    if (!reset.available) throw new Error(reset.note);
    expect(byId(reset.checks).get("text-contrast/light/text-on-surface")?.status).toBe("pass");
  });

  it("turns a recorded violation into fixed when the override corrects it", () => {
    // The real list is empty, so the recorded violation is this test's own:
    // warning made too light to pass, then corrected by the override.
    const fixed = runBrowserChecks({
      ...inputsFor({ "semantic.light:color.warning": "oklch(0.35 0.15 80)" }),
      known: [{ id: "text-contrast/light/warning-on-surface" }],
    });
    if (!fixed.available) throw new Error(fixed.note);
    const entry = byId(fixed.checks).get("text-contrast/light/warning-on-surface");
    expect(entry?.pass).toBe(true);
    expect(entry?.status).toBe("fixed");
    expect(fixed.wouldFailServerTests).toBe(true);
  });

  it("is unavailable, not crashed, when an override is not a colour this module can read", () => {
    const result = runBrowserChecks(inputsFor({ "semantic.light:color.text": "chartreuse" }));
    expect(result.available).toBe(false);
    if (result.available) throw new Error("expected unavailable");
    expect(result.note).toMatch(/not a colour this module can read/);
  });
});

describe("runBrowserChecks against a known-violations list the gate would reject", () => {
  // scripts/checks.test.mjs fails on a listed entry whose rule is reported
  // only, and on a listed entry no rule produces. The real file has
  // neither, so these pass their own lists.
  const base = knownViolations.violations.map((v) => ({ id: v.id }));

  it("marks a listed entry whose rule is reported only, and says the gate would fail", () => {
    const result = runBrowserChecks({ ...inputsFor({}), known: [...base, { id: "up-down-distinguishability/light/contrast" }] });
    if (!result.available) throw new Error(result.note);
    expect(byId(result.checks).get("up-down-distinguishability/light/contrast")?.status).toBe("listed-reported");
    expect(result.unproduced).toEqual([]);
    expect(result.wouldFailServerTests).toBe(true);
  });

  it("lists an entry no rule produces, and says the gate would fail", () => {
    const result = runBrowserChecks({ ...inputsFor({}), known: [...base, { id: "text-contrast/light/no-such-pair" }] });
    if (!result.available) throw new Error(result.note);
    expect(result.unproduced).toEqual(["text-contrast/light/no-such-pair"]);
    expect(result.checks.filter((c) => c.status === "new" || c.status === "listed-reported")).toEqual([]);
    expect(result.wouldFailServerTests).toBe(true);
  });

  it("lists nothing as unproduced for the real file", () => {
    const result = runBrowserChecks(inputsFor({}));
    if (!result.available) throw new Error(result.note);
    expect(result.unproduced).toEqual([]);
  });
});

describe("tokensForCheck", () => {
  it("names the semantic colour tokens a contrast result reads", () => {
    expect(tokensForCheck({ id: "text-contrast/light/text-on-surface", rule: "text-contrast" })).toEqual([
      "semantic.light:color.text",
      "semantic.light:color.surface",
    ]);
  });

  it("includes the composited-over colour for a wash pair", () => {
    expect(tokensForCheck({ id: "text-contrast/dark/text-on-up-wash-over-surface", rule: "text-contrast" })).toEqual([
      "semantic.dark:color.text",
      "semantic.dark:color.up-wash",
      "semantic.dark:color.surface",
    ]);
  });

  it("names both sides of the up/down pair", () => {
    expect(tokensForCheck({ id: "up-down-distinguishability/light/de2000-protanopia", rule: "up-down-distinguishability" })).toEqual(
      ["semantic.light:color.up", "semantic.light:color.down"],
    );
  });

  it("names the density token a target-size result reads", () => {
    expect(tokensForCheck({ id: "target-size/compact/density-row-height", rule: "target-size" })).toEqual([
      "density:compact.row-height",
    ]);
  });
});

describe("rulesForToken", () => {
  it("lists every rule reading a semantic colour token", () => {
    const rules = rulesForToken("semantic.light:color.text");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.theme === "light")).toBe(true);
    expect(rules.map((r) => r.rule)).toContain("text-contrast");
  });

  it("lists the target-size rule for the density row-height token, in every mode", () => {
    for (const mode of DENSITY_MODES) {
      const rules = rulesForToken(`density:${mode}.row-height`);
      expect(rules).toEqual([{ rule: "target-size", subject: "density-row-height", theme: null }]);
    }
  });

  it("is empty for a primitive no rule names directly", () => {
    expect(rulesForToken("primitive:color.teal.600")).toEqual([]);
  });
});
