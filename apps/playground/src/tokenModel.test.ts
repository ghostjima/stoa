// The resolver is a shortcut around the real build, so the test that
// matters is that it says the same thing as the build's own CSS. The CSS
// comes from packages/tokens/dist, which `pnpm build` writes.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareVariables, variablesFromCss } from "./builtCss";
import {
  DENSITY_MODES,
  baseTokens,
  digest,
  filesWithOverrides,
  flattenFile,
  resolveAllValues,
  resolveTokens,
  serializeFiles,
  type DensityMode,
  type Theme,
} from "./tokenModel";

const BUILT_CSS = new URL("../../../packages/tokens/dist/tokens.css", import.meta.url);

function builtCss(): string {
  try {
    return readFileSync(BUILT_CSS, "utf8");
  } catch {
    throw new Error("packages/tokens/dist/tokens.css is missing: run pnpm build first");
  }
}

describe("resolveTokens against the built CSS", () => {
  const css = builtCss();
  const themes: Theme[] = ["light", "dark"];
  for (const theme of themes) {
    for (const density of DENSITY_MODES) {
      it(`agrees with the build for ${theme} at ${density} density`, () => {
        const live = resolveTokens(baseTokens, {}, theme, density).variables;
        const built = variablesFromCss(css, theme, density);
        expect(compareVariables(live, built)).toEqual([]);
        expect(Object.keys(live).length).toBeGreaterThan(50);
      });
    }
  }
});

describe("the override layer", () => {
  it("follows references: overriding a primitive moves the semantic token", () => {
    const base = resolveTokens(baseTokens, {}, "light", "regular");
    const edited = resolveTokens(baseTokens, { "primitive:color.teal.600": "oklch(0.5 0.2 160)" }, "light", "regular");
    expect(base.variables["--stoa-color-bid"]).toBe("oklch(0.53 0.11 170)");
    expect(edited.variables["--stoa-color-bid"]).toBe("oklch(0.5 0.2 160)");
  });

  it("reports the derived value beside the override", () => {
    const values = resolveAllValues(baseTokens, { "semantic.light:color.bid": "oklch(0.4 0.2 150)" });
    expect(values["semantic.light:color.bid"]).toEqual({
      derived: "oklch(0.53 0.11 170)",
      effective: "oklch(0.4 0.2 150)",
    });
    expect(values["semantic.dark:color.bid"]?.effective).toBe("oklch(0.74 0.12 170)");
  });

  it("leaves one theme alone when the other theme's semantics are edited", () => {
    const overrides = { "semantic.dark:color.surface": "oklch(0.2 0 0)" };
    expect(resolveTokens(baseTokens, overrides, "dark", "regular").variables["--stoa-color-surface"]).toBe("oklch(0.2 0 0)");
    expect(resolveTokens(baseTokens, overrides, "light", "regular").variables["--stoa-color-surface"]).toBe("oklch(1 0 0)");
  });

  it("applies only the selected density mode", () => {
    const rowHeight = (density: DensityMode) =>
      resolveTokens(baseTokens, { "density:compact.row-height": "18px" }, "light", density).variables[
        "--stoa-density-row-height"
      ];
    expect(rowHeight("compact")).toBe("18px");
    expect(rowHeight("regular")).toBe("28px");
  });

  it("writes overrides back into the file they came from", () => {
    const files = filesWithOverrides(baseTokens, {
      "semantic.dark:color.bid": "{color.teal.600}",
      "primitive:font.weight.medium": "550",
    });
    const semantic = JSON.parse(serializeFiles(files)["semantic.dark.json"] ?? "{}");
    expect(semantic.color.bid.$value).toBe("{color.teal.600}");
    // A numeric token stays a number, so the file is still what the build reads.
    const primitive = JSON.parse(serializeFiles(files)["primitive.json"] ?? "{}");
    expect(primitive.font.weight.medium.$value).toBe(550);
    // The base is untouched.
    expect(serializeFiles(baseTokens)["primitive.json"]).toContain('"$value": 500');
  });

  it("ignores an override for a token that is not there", () => {
    const files = filesWithOverrides(baseTokens, { "primitive:color.teal.999": "red", "nonsense": "red" });
    expect(serializeFiles(files)).toEqual(serializeFiles(baseTokens));
  });
});

describe("token naming", () => {
  it("names the variable the build names", () => {
    const primitive = flattenFile("primitive", baseTokens.primitive);
    const byId = new Map(primitive.map((e) => [e.id, e]));
    expect(byId.get("primitive:color.teal.wash")?.variable).toBe("--stoa-color-teal-wash");
    expect(byId.get("primitive:space.0-5")?.variable).toBe("--stoa-space-0-5");
    expect(byId.get("primitive:focus.width")?.variable).toBe("--stoa-focus-width");
  });

  it("gives the density modes one variable each, not one per mode", () => {
    const density = flattenFile("density", baseTokens.density);
    const rowHeights = density.filter((e) => e.path[1] === "row-height");
    expect(rowHeights).toHaveLength(3);
    expect(new Set(rowHeights.map((e) => e.variable))).toEqual(new Set(["--stoa-density-row-height"]));
  });

  it("inherits the group's type", () => {
    const entry = flattenFile("primitive", baseTokens.primitive).find((e) => e.id === "primitive:color.blue.500");
    expect(entry?.type).toBe("color");
  });
});

describe("digest", () => {
  it("changes when the values change and is stable otherwise", () => {
    const light = resolveTokens(baseTokens, {}, "light", "regular").variables;
    const edited = resolveTokens(baseTokens, { "primitive:color.blue.600": "oklch(0.5 0.2 260)" }, "light", "regular")
      .variables;
    expect(digest(JSON.stringify(light))).toBe(digest(JSON.stringify(light)));
    expect(digest(JSON.stringify(light))).not.toBe(digest(JSON.stringify(edited)));
  });
});
