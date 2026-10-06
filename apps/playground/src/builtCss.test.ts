import { describe, expect, it } from "vitest";
import { compareVariables, variablesFromCss } from "./builtCss";

const CSS = `:root {
  --stoa-color-neutral-0: oklch(1 0 0);
  --stoa-color-surface: var(--stoa-color-neutral-0);
  --stoa-font-family-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
[data-theme="dark"] {
  --stoa-color-surface: oklch(0.16 0.007 250);
}
[data-density="compact"] {
  --stoa-density-row-height: 22px;
}
:root, [data-density="regular"] {
  --stoa-density-row-height: 28px;
}
`;

describe("variablesFromCss", () => {
  it("resolves var() chains to literals", () => {
    expect(variablesFromCss(CSS, "light", "regular")["--stoa-color-surface"]).toBe("oklch(1 0 0)");
  });

  it("layers the dark block over the light one", () => {
    expect(variablesFromCss(CSS, "dark", "regular")["--stoa-color-surface"]).toBe("oklch(0.16 0.007 250)");
    expect(variablesFromCss(CSS, "dark", "regular")["--stoa-color-neutral-0"]).toBe("oklch(1 0 0)");
  });

  it("takes the density mode that is asked for", () => {
    expect(variablesFromCss(CSS, "light", "compact")["--stoa-density-row-height"]).toBe("22px");
    expect(variablesFromCss(CSS, "light", "comfortable")["--stoa-density-row-height"]).toBeUndefined();
  });

  it("keeps a list value as one value", () => {
    expect(variablesFromCss(CSS, "light", "regular")["--stoa-font-family-mono"]).toBe(
      "'IBM Plex Mono', ui-monospace, monospace",
    );
  });
});

describe("compareVariables", () => {
  it("says nothing when both sides agree, ignoring spacing", () => {
    expect(compareVariables({ "--a": "cubic-bezier(0, 0,  0, 1)" }, { "--a": "cubic-bezier(0, 0, 0, 1)" })).toEqual([]);
  });

  it("reports a different value and a variable only one side has", () => {
    expect(compareVariables({ "--a": "red", "--b": "blue" }, { "--a": "green" })).toEqual([
      { variable: "--a", live: "red", built: "green" },
      { variable: "--b", live: "blue", built: "(missing)" },
    ]);
  });
});
