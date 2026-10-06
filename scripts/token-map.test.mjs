import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTokenMap, renderMarkdown } from "./token-map/lib.mjs";

// A small fixture tree covering: a CSS var read, an inline style var read,
// a canvas read (through readCanvasTokens's getPropertyValue alias, one hop
// of call-graph propagation to its caller), a semantic alias to a primitive,
// a token that nothing reads, a dark-only alias, a var() fallback (with a
// nested var()), a combinator selector, a named colour and keyword easing,
// a named colour in a comma-separated multi-value property, a declaration
// with no trailing semicolon, and per-density values.
const tokensCssText = `
:root {
  --stoa-color-neutral-500: #888888;
  --stoa-color-neutral-900: #111111;
  --stoa-color-text: var(--stoa-color-neutral-500);
  --stoa-color-focus: #4477ff;
  --stoa-color-accent: #224499;
  --stoa-color-warning: #ffaa00;
  --stoa-space-2: 8px;
  --stoa-space-unused: 99px;
  --stoa-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
}

[data-theme="dark"] {
  --stoa-color-text: #111111;
}

[data-density="compact"] {
  --stoa-density-row-height: 22px;
}

:root, [data-density="regular"] {
  --stoa-density-row-height: 28px
}

[data-density="comfortable"] {
  --stoa-density-row-height: 36px;
}
`;

// The DTCG sources: `text` aliases a different primitive per theme, which
// tokens.css alone cannot say (the dark build inlines a literal, not a
// `var()`, since it never had the primitives in scope to reference).
const semanticLightJson = { color: { text: { $value: "{color.neutral.500}" } } };
const semanticDarkJson = { color: { text: { $value: "{color.neutral.900}" } } };

const cssFiles = [
  {
    path: "packages/react/src/styles.css",
    content: `
.fx-panel {
  color: var(--stoa-color-text);
  padding: var(--stoa-space-2);
  outline-color: var(--stoa-color-focus, var(--stoa-color-accent, blue));
  transition: color 200ms cubic-bezier(0.2, 0, 0, 1);
  animation-timing-function: ease-in-out;
  box-shadow: 0 0 0 1px red, 0 0 2px blue;
  background: green
}
.fx-badge--warning > span:first-child { color: var(--stoa-color-warning) }
`,
  },
];

const sourceFiles = [
  {
    path: "packages/react/src/Panel.tsx",
    content: `
export function Panel({ children }) {
  return <section className="fx-panel">{children}</section>;
}
`,
  },
  {
    path: "packages/react/src/Badge.tsx",
    content: `
export function Badge({ children }) {
  return <span style={{ color: "var(--stoa-color-text)" }}>{children}</span>;
}
`,
  },
  {
    path: "packages/react/src/StatusBadge.tsx",
    content: `
export function StatusBadge({ tone, children }) {
  return <span className={\`fx-badge fx-badge--\${tone}\`} style={{ color: "#888888" }}>{children}</span>;
}
`,
  },
  {
    path: "packages/react/src/tokens.ts",
    content: `
export function readCanvasTokens(el) {
  const s = getComputedStyle(el);
  const v = (n) => s.getPropertyValue(n).trim();
  return { text: v("--stoa-color-text") };
}
`,
  },
  {
    path: "packages/react/src/Ladder.tsx",
    content: `
import { readCanvasTokens } from "./tokens";
export function Ladder() {
  const t = readCanvasTokens(document.body);
  return null;
}
`,
  },
];

const knownComponents = new Set(["Panel", "Badge", "StatusBadge", "Ladder"]);

function map() {
  return buildTokenMap({ tokensCssText, cssFiles, sourceFiles, storyFiles: [], knownComponents, semanticLightJson, semanticDarkJson });
}

function tokenNamed(m, name) {
  const t = m.tokens.find((t) => t.name === name);
  assert.ok(t, `expected a token named ${name}`);
  return t;
}

describe("token-map", () => {
  it("resolves a semantic alias to its primitive value, showing both", () => {
    const text = tokenNamed(map(), "--stoa-color-text");
    assert.equal(text.kind, "semantic");
    assert.equal(text.aliasOf, "--stoa-color-neutral-500");
    assert.equal(text.resolvedValue, "#888888");
  });

  it("attributes a CSS var() read to the component owning the class", () => {
    const text = tokenNamed(map(), "--stoa-color-text");
    assert.ok(text.readBy.components.some((c) => c.component === "Panel" && c.file === "packages/react/src/styles.css"));
    const space = tokenNamed(map(), "--stoa-space-2");
    assert.ok(space.readBy.components.some((c) => c.component === "Panel"));
  });

  it("attributes an inline style var() read to its component", () => {
    const text = tokenNamed(map(), "--stoa-color-text");
    assert.ok(text.readBy.components.some((c) => c.component === "Badge" && c.file === "packages/react/src/Badge.tsx"));
  });

  it("propagates a canvas read through readCanvasTokens to its caller", () => {
    const text = tokenNamed(map(), "--stoa-color-text");
    assert.ok(text.readBy.components.some((c) => c.component === "Ladder" && c.via === "readCanvasTokens"));
  });

  it("marks a token nothing reads as unused, without flagging its reached primitive", () => {
    const m = map();
    // --stoa-motion-easing-standard is unused too: styles.css hard-codes its
    // value (see the next test) instead of reading it with var().
    assert.deepEqual(m.unusedTokens, ["--stoa-density-row-height", "--stoa-motion-easing-standard", "--stoa-space-unused"]);
    assert.equal(tokenNamed(m, "--stoa-color-neutral-500").unused, false);
    assert.equal(tokenNamed(m, "--stoa-color-text").unused, false);
  });

  it("flags a hard-coded easing literal that matches a token", () => {
    const m = map();
    const easing = m.hardcodedLiterals.find((l) => l.category === "easing" && l.file.endsWith("styles.css"));
    assert.ok(easing);
    assert.equal(easing.matchingToken, "--stoa-motion-easing-standard");
    const duration = m.hardcodedLiterals.find((l) => l.category === "duration");
    assert.ok(duration, "a hard-coded duration with no matching token is still reported");
    assert.equal(duration.matchingToken, null);
  });

  it("reports a var() reference to an undefined custom property, of any prefix", () => {
    const m = buildTokenMap({
      tokensCssText,
      cssFiles: [{ path: "packages/react/src/styles.css", content: `.fx-panel { color: var(--stoa-color-missing); border-color: var(--rac-focus-ring); }` }],
      sourceFiles: [],
      storyFiles: [],
      knownComponents,
      semanticLightJson,
      semanticDarkJson,
    });
    assert.ok(m.undefinedCustomProperties.some((u) => u.name === "--stoa-color-missing"));
    assert.ok(m.undefinedCustomProperties.some((u) => u.name === "--rac-focus-ring"));
  });

  // An undefined custom property with a fallback still reports the
  // fallback literal, instead of dropping it.
  it("reports the fallback literal of an undefined custom property with a fallback", () => {
    const m = buildTokenMap({
      tokensCssText,
      cssFiles: [{ path: "packages/react/src/styles.css", content: `.fx-panel { color: var(--stoa-x, rgb(255 255 255)); }` }],
      sourceFiles: [],
      storyFiles: [],
      knownComponents,
      semanticLightJson,
      semanticDarkJson,
    });
    const undefinedRef = m.undefinedCustomProperties.find((u) => u.name === "--stoa-x");
    assert.ok(undefinedRef, "expected --stoa-x to be reported even though it has a fallback");
    assert.equal(undefinedRef.fallback, "rgb(255 255 255)");
    assert.ok(
      renderMarkdown(m).includes("`--stoa-x` | packages/react/src/styles.css | 1 | `rgb(255 255 255)` |"),
      "expected the markdown's undefined-custom-property table to include the fallback",
    );
  });

  // A custom property defined locally in component CSS (`.x { --local-gap:
  // 4px; gap: var(--local-gap); }`) is not part of the token system, but
  // it is defined, so it must not be reported as undefined.
  it("treats a custom property defined in component CSS as defined, not undefined", () => {
    const m = buildTokenMap({
      tokensCssText,
      cssFiles: [{ path: "packages/react/src/styles.css", content: `.fx-local { --local-gap: 4px; gap: var(--local-gap); }` }],
      sourceFiles: [],
      storyFiles: [],
      knownComponents,
      semanticLightJson,
      semanticDarkJson,
    });
    assert.ok(!m.undefinedCustomProperties.some((u) => u.name === "--local-gap"));
  });

  // Finding 1: dark-theme aliases are resolved from the DTCG sources, not
  // by looking for `var()` in the built CSS (the dark build inlines a
  // literal instead).
  describe("per-theme alias resolution (dark theme)", () => {
    it("reaches a primitive that only the dark theme aliases", () => {
      const m = map();
      assert.equal(tokenNamed(m, "--stoa-color-neutral-900").unused, false);
    });

    it("reports the dark alias and resolved value on the semantic token", () => {
      const text = tokenNamed(map(), "--stoa-color-text");
      assert.equal(text.theme.dark.aliasOf, "--stoa-color-neutral-900");
      assert.equal(text.theme.dark.resolvedValue, "#111111");
    });

    // A primitive's `unused` flag is combined across both themes, which
    // hides that it is reached under only one of them. `reachedByTheme`
    // reports each theme separately, and names the semantic token whose
    // alias, in that theme, targets the primitive.
    it("reports that neutral-900 is reached only in the dark theme, through --stoa-color-text", () => {
      const neutral900 = tokenNamed(map(), "--stoa-color-neutral-900");
      assert.deepEqual(neutral900.reachedByTheme.light, { direct: false, via: [] });
      assert.deepEqual(neutral900.reachedByTheme.dark, { direct: false, via: ["--stoa-color-text"] });
      assert.equal(neutral900.unused, false);
    });

    it("reports that neutral-500 is reached only in the light theme, through --stoa-color-text", () => {
      const neutral500 = tokenNamed(map(), "--stoa-color-neutral-500");
      assert.deepEqual(neutral500.reachedByTheme.light, { direct: false, via: ["--stoa-color-text"] });
      assert.deepEqual(neutral500.reachedByTheme.dark, { direct: false, via: [] });
    });

    it("marks a directly read token as reached in both themes", () => {
      const text = tokenNamed(map(), "--stoa-color-text");
      assert.equal(text.reachedByTheme.light.direct, true);
      assert.equal(text.reachedByTheme.dark.direct, true);
    });

    it("renders per-theme reachability in the markdown, by alias target rather than dark value", () => {
      const md = renderMarkdown(map());
      assert.match(md, /## Primitive reachability by theme/);
      assert.ok(
        md.includes("| `--stoa-color-neutral-900` | _not reached_ | via `--stoa-color-text` |"),
        "expected neutral-900's markdown row to name the semantic token reaching it in the dark theme, not a resolved colour value",
      );
      assert.ok(
        md.includes("| `--stoa-color-neutral-500` | via `--stoa-color-text` | _not reached_ |"),
        "expected neutral-500's markdown row to show it reached only in the light theme",
      );
    });
  });

  // Finding 2: `var()` fallbacks, including a nested `var()` inside the
  // fallback, are recognised and reported.
  describe("var() fallbacks", () => {
    it("reads the primary token and reports its fallback literal", () => {
      const focus = tokenNamed(map(), "--stoa-color-focus");
      assert.equal(focus.unused, false);
      const read = focus.readBy.components.find((c) => c.component === "Panel");
      assert.ok(read);
      assert.equal(read.fallback, "var(--stoa-color-accent, blue)");
    });

    it("also reads a nested var() inside the fallback", () => {
      const accent = tokenNamed(map(), "--stoa-color-accent");
      assert.equal(accent.unused, false);
      const read = accent.readBy.components.find((c) => c.component === "Panel");
      assert.ok(read);
      assert.equal(read.fallback, "blue");
    });
  });

  // Finding 3: a rule is attributed to the component class appearing
  // anywhere in the selector, not just its last compound.
  it("attributes a combinator selector to the component owning the ancestor class", () => {
    const warning = tokenNamed(map(), "--stoa-color-warning");
    assert.ok(warning.readBy.components.some((c) => c.component === "StatusBadge"));
    assert.ok(!warning.readBy.components.some((c) => c.component === "(css) .fx-badge--warning > span:first-child"));
  });

  // Finding 4: a primitive reached only through an alias still shows who
  // reads it, via the semantic token that aliases it.
  it("propagates readBy from a semantic token to the primitive it aliases", () => {
    const primitive = tokenNamed(map(), "--stoa-color-neutral-500");
    const propagated = primitive.readBy.components.find((c) => c.component === "Badge" && c.via === "--stoa-color-text");
    assert.ok(propagated, "expected neutral-500's readers to include Badge via --stoa-color-text");
  });

  // Finding 5: detection gaps.
  describe("detection gaps", () => {
    it("scans inline TSX styles for hard-coded literals", () => {
      const m = map();
      const literal = m.hardcodedLiterals.find((l) => l.file === "packages/react/src/StatusBadge.tsx");
      assert.ok(literal, "expected a hard-coded literal reported from an inline style");
      assert.equal(literal.category, "color");
      assert.equal(literal.matchingToken, "--stoa-color-neutral-500");
    });

    it("flags a named colour and a keyword easing", () => {
      const m = map();
      const named = m.hardcodedLiterals.find((l) => l.value === "green");
      assert.ok(named, "expected the named colour `green` to be flagged");
      assert.equal(named.category, "color");
      const easing = m.hardcodedLiterals.find((l) => l.value === "ease-in-out");
      assert.ok(easing, "expected the keyword easing `ease-in-out` to be flagged");
      assert.equal(easing.category, "easing");
    });

    // A named colour followed by a comma (a layer separator in a
    // multi-value property like `box-shadow`) is still flagged, not just
    // the last layer's colour.
    it("flags a named colour followed by a comma in a multi-value property", () => {
      const m = map();
      const red = m.hardcodedLiterals.find((l) => l.value === "red" && l.property === "box-shadow");
      assert.ok(red, "expected the named colour `red` (followed by a comma) to be flagged");
      assert.equal(red.category, "color");
      const blue = m.hardcodedLiterals.find((l) => l.value === "blue" && l.property === "box-shadow");
      assert.ok(blue, "expected the named colour `blue` to be flagged too");
      assert.equal(blue.category, "color");
    });

    it("parses the last declaration of a block with no trailing semicolon", () => {
      const m = map();
      const density = tokenNamed(m, "--stoa-density-row-height");
      assert.equal(density.density.regular, "28px");
    });

    it("shows a density token's value for every density mode", () => {
      const m = map();
      const density = tokenNamed(m, "--stoa-density-row-height");
      assert.deepEqual(density.density, { regular: "28px", compact: "22px", comfortable: "36px" });
      assert.equal(density.value, "28px");
    });
  });
});
