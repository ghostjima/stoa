// The two sizing rules and the pairing arithmetic, which are the parts of
// the role model that can be wrong without looking wrong.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROLES,
  DEFAULT_SCALE,
  MIN_SIZE_PX,
  NO_METRICS,
  RATIO_MAX,
  RATIO_MIN,
  ROLE_IDS,
  allRoleVariables,
  familyStack,
  featureSettingsCss,
  featuresText,
  parseFeatureSettings,
  readingSize,
  roleSize,
  roleSizeAdjust,
  roleToken,
  sizeAdjustPercent,
  sizeProvenance,
  trackingCss,
  variationSettingsCss,
  workingSize,
  type SizeContext,
} from "./roles.ts";

const context = (over: Partial<SizeContext> = {}): SizeContext => ({
  scale: DEFAULT_SCALE,
  densityFontSize: 13,
  ...over,
});

describe("the reading scale", () => {
  it("steps by the ratio and lands on whole pixels", () => {
    const scale = { base: 14, ratio: 1.25 };
    expect(readingSize(scale, 0)).toBe(14);
    expect(readingSize(scale, 1)).toBe(18);
    expect(readingSize(scale, 2)).toBe(22);
    expect(readingSize(scale, 3)).toBe(27);
    expect(Number.isInteger(readingSize({ base: 13, ratio: 1.333 }, 3))).toBe(true);
  });

  it("covers the ratio range the panel offers", () => {
    expect(readingSize({ base: 16, ratio: RATIO_MIN }, 2)).toBe(20);
    expect(readingSize({ base: 16, ratio: RATIO_MAX }, 2)).toBe(28);
  });

  it("never goes below the floor", () => {
    expect(readingSize({ base: 4, ratio: 1.125 }, 0)).toBe(MIN_SIZE_PX);
  });
});

describe("the working sizes", () => {
  it("follows density, not the scale", () => {
    expect(workingSize(12, -1)).toBe(11);
    expect(workingSize(13, 0)).toBe(13);
    expect(workingSize(14, 2)).toBe(16);
    expect(workingSize(12, -20)).toBe(MIN_SIZE_PX);
  });

  it("leaves the reading roles alone when density changes", () => {
    const compact = context({ densityFontSize: 12 });
    const comfortable = context({ densityFontSize: 14 });
    expect(roleSize(DEFAULT_ROLES.body, compact)).toBe(roleSize(DEFAULT_ROLES.body, comfortable));
    expect(roleSize(DEFAULT_ROLES.label, compact)).toBe(11);
    expect(roleSize(DEFAULT_ROLES.label, comfortable)).toBe(13);
  });

  it("leaves the working roles alone when the ratio changes", () => {
    const tight = context({ scale: { base: 14, ratio: RATIO_MIN } });
    const wide = context({ scale: { base: 14, ratio: RATIO_MAX } });
    expect(roleSize(DEFAULT_ROLES.numeric, tight)).toBe(roleSize(DEFAULT_ROLES.numeric, wide));
    expect(roleSize(DEFAULT_ROLES.display, tight)).not.toBe(roleSize(DEFAULT_ROLES.display, wide));
  });

  it("says where each size came from", () => {
    expect(sizeProvenance(DEFAULT_ROLES.heading, context(), "regular")).toBe(
      "14px base times 1.25 to the power 1, rounded",
    );
    expect(sizeProvenance(DEFAULT_ROLES.label, context({ densityFontSize: 12 }), "compact")).toBe(
      "compact density font-size 12px -1px",
    );
    expect(sizeProvenance(DEFAULT_ROLES.numeric, context(), "regular")).toBe("regular density font-size 13px +0px");
  });
});

describe("size-adjust from x-heights", () => {
  // IBM Plex Sans and IBM Plex Sans Arabic as this engine reads them: the
  // same x-height over the same em, so the pairing needs no adjustment.
  it("is 100% for two faces with the same x-height ratio", () => {
    expect(sizeAdjustPercent({ xHeight: 516, upem: 1000 }, { xHeight: 516, upem: 1000 })).toBe(100);
  });

  it("scales the fallback up when its x-height is smaller", () => {
    // Inter over Noto Sans Arabic, both as measured here: 1118/2048 over
    // 536/1000.
    expect(sizeAdjustPercent({ xHeight: 1118, upem: 2048 }, { xHeight: 536, upem: 1000 })).toBe(101.8);
  });

  it("scales the fallback down when its x-height is larger", () => {
    expect(sizeAdjustPercent({ xHeight: 500, upem: 1000 }, { xHeight: 600, upem: 1000 })).toBe(83.3);
  });

  it("gives no number when a metric is missing", () => {
    expect(sizeAdjustPercent(NO_METRICS, { xHeight: 536, upem: 1000 })).toBeNull();
    expect(sizeAdjustPercent({ xHeight: 516, upem: 1000 }, { xHeight: null, upem: 1000 })).toBeNull();
    expect(sizeAdjustPercent({ xHeight: 516, upem: 0 }, { xHeight: 536, upem: 1000 })).toBeNull();
  });

  it("is null for a role with no pairing at all", () => {
    expect(roleSizeAdjust(DEFAULT_ROLES.body, { xHeight: 516, upem: 1000 })).toBeNull();
    const paired = {
      ...DEFAULT_ROLES.body,
      arabic: { family: "Noto Sans Arabic", metrics: { xHeight: 536, upem: 1000 } },
    };
    expect(roleSizeAdjust(paired, { xHeight: 516, upem: 1000 })).toBe(96.3);
  });
});

describe("CSS text", () => {
  it("writes feature and variation settings, or normal", () => {
    expect(featureSettingsCss({ tnum: 1, zero: 1 })).toBe('"tnum" 1, "zero" 1');
    expect(featureSettingsCss({ liga: 0 })).toBe('"liga" 0');
    expect(featureSettingsCss({})).toBe("normal");
    expect(variationSettingsCss({ wght: 450, opsz: 32 })).toBe('"wght" 450, "opsz" 32');
    expect(variationSettingsCss({})).toBe("normal");
  });

  it("reads a feature field and says what it could not read", () => {
    expect(parseFeatureSettings('tnum, zero 1, "ss01" 1, cv01 2')).toEqual({
      features: { tnum: 1, zero: 1, ss01: 1, cv01: 2 },
      invalid: [],
    });
    expect(parseFeatureSettings("tnum, tabular numbers, ss1")).toEqual({
      features: { tnum: 1 },
      invalid: ["tabular numbers", "ss1"],
    });
    expect(parseFeatureSettings("  ")).toEqual({ features: {}, invalid: [] });
  });

  it("round-trips the feature field", () => {
    expect(featuresText({ tnum: 1, liga: 0 })).toBe("tnum, liga 0");
    expect(parseFeatureSettings(featuresText({ tnum: 1, liga: 0 })).features).toEqual({ tnum: 1, liga: 0 });
  });

  it("writes tracking in the unit it was given", () => {
    expect(trackingCss({ value: -0.01, unit: "rem" })).toBe("-0.01rem");
    expect(trackingCss({ value: 0.5, unit: "px" })).toBe("0.5px");
    expect(trackingCss({ value: 0, unit: "rem" })).toBe("0");
  });

  it("gives every role its own variables", () => {
    const variables = allRoleVariables(DEFAULT_ROLES, context());
    for (const id of ROLE_IDS) expect(variables[`--stoa-type-${id}-size`]).toMatch(/^\d+px$/);
    expect(variables["--stoa-type-numeric-features"]).toBe('"tnum" 1, "zero" 1');
    expect(variables["--stoa-type-body-size"]).toBe("14px");
    expect(variables["--stoa-type-label-size"]).toBe("12px");
    expect(variables["--stoa-type-body-family"]).toBe('"IBM Plex Sans", system-ui, sans-serif');
  });

  it("puts the pairing face in the stack when one is given", () => {
    const variables = allRoleVariables(DEFAULT_ROLES, context(), (role) =>
      familyStack(role.family, role.id === "body" ? "StoaLoadedNotoAdj96p3" : null),
    );
    expect(variables["--stoa-type-body-family"]).toBe(
      '"IBM Plex Sans", StoaLoadedNotoAdj96p3, system-ui, sans-serif',
    );
    expect(variables["--stoa-type-label-family"]).toBe('"IBM Plex Sans", system-ui, sans-serif');
  });
});

describe("roleToken", () => {
  it("puts axes, features and the pairing under dev.stoa.type", () => {
    const role = {
      ...DEFAULT_ROLES.numeric,
      axes: { wght: 420 },
      arabic: { family: "Noto Sans Arabic", metrics: { xHeight: 536, upem: 1000 } },
    };
    expect(roleToken(role, 13, { xHeight: 516, upem: 1000 })).toEqual({
      $type: "typography",
      $value: {
        fontFamily: "IBM Plex Mono",
        fontSize: "13px",
        fontWeight: 400,
        lineHeight: 1.25,
        letterSpacing: "0",
      },
      $extensions: {
        "dev.stoa.type": {
          hierarchy: "working",
          densityOffset: 0,
          axes: { wght: 420 },
          features: { tnum: 1, zero: 1 },
          arabic: { family: "Noto Sans Arabic", sizeAdjust: "96.3%" },
        },
      },
    });
  });

  it("records the scale step for a reading role and no pairing claim", () => {
    const token = roleToken(DEFAULT_ROLES.display, 27);
    expect(token.$extensions["dev.stoa.type"]).toMatchObject({ hierarchy: "reading", scaleStep: 3 });
    expect(token.$extensions["dev.stoa.type"].arabic).toEqual({ family: "", sizeAdjust: null });
  });
});
