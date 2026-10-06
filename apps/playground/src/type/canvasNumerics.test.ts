// The parts of the canvas check that hold without a browser. The routes
// themselves are measured in a browser, by the panel and by the Playwright
// test, because whether canvas honours a face descriptor is exactly the
// thing a unit test cannot answer.
import { describe, expect, it } from "vitest";
import { descriptorVerdict, tabularFromWidths, type CanvasNumericsReport, type NumericRoute } from "./canvasNumerics.ts";

const route = (id: NumericRoute["id"], widths: number[]): NumericRoute => ({
  id,
  label: id,
  widths,
  distinct: new Set(widths).size,
  tabular: tabularFromWidths(widths),
});

const report = (over: Partial<CanvasNumericsReport> = {}): CanvasNumericsReport => ({
  userAgent: "test",
  descriptorPresent: true,
  reportedFeatureSettings: '"tnum"',
  probeSizePx: 400,
  routes: [],
  ladder: null,
  note: null,
  ...over,
});

describe("tabularFromWidths", () => {
  it("is only true for ten equal advances", () => {
    expect(tabularFromWidths([259, 259, 259])).toBe(true);
    expect(tabularFromWidths([259, 259, 258.5])).toBe(false);
    expect(tabularFromWidths([])).toBe(false);
  });
});

describe("descriptorVerdict", () => {
  const proportional = [252, 163, 244, 247, 258, 237, 248, 226, 247, 248];
  const tabular = Array(10).fill(259);

  it("says the descriptor worked when the advances changed and evened out", () => {
    const verdict = descriptorVerdict(
      report({ routes: [route("plain", proportional), route("descriptor", tabular)] }),
    );
    expect(verdict).toContain("reached canvas");
    expect(verdict).toContain("one advance");
  });

  it("does not claim a pass when the advances changed but stayed unequal", () => {
    const verdict = descriptorVerdict(
      report({ routes: [route("plain", proportional), route("descriptor", [...proportional.slice(1), 300])] }),
    );
    expect(verdict).toContain("still not all equal");
  });

  it("reports a present descriptor that canvas ignored", () => {
    const verdict = descriptorVerdict(
      report({ routes: [route("plain", proportional), route("descriptor", proportional)] }),
    );
    expect(verdict).toContain("did not take effect here");
  });

  it("reports an absent descriptor as absent", () => {
    const verdict = descriptorVerdict(
      report({
        descriptorPresent: false,
        routes: [route("plain", proportional), route("descriptor", proportional)],
      }),
    );
    expect(verdict).toContain("no featureSettings descriptor");
  });

  it("says nothing was tried when no font is loaded", () => {
    expect(descriptorVerdict(report())).toContain("no font loaded");
  });
});
