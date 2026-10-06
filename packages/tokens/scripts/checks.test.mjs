// The verification engine: the resolver, the shape of a result, and the
// gate that keeps known-violations.json honest in both directions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RULES, pairName, runAllChecks, summarize } from "../src/checks.mjs";
import { resolveTokens } from "../src/resolve.mjs";
import { NON_TEXT_PAIRS, TARGETS, TEXT_AA, TEXT_PAIRS } from "../src/pairs.mjs";
import { CVD_MODELS } from "../src/color.mjs";

const css = await readFile(new URL("../dist/tokens.css", import.meta.url), "utf8");
const known = JSON.parse(await readFile(new URL("../known-violations.json", import.meta.url), "utf8"));

const resolved = resolveTokens(css);
const results = runAllChecks(resolved);
const byId = new Map(results.map((r) => [r.id, r]));

test("the resolver follows token references to a literal value", () => {
  // The light theme is written with `outputReferences`, so `color-text` is
  // `var(--stoa-color-neutral-950)` in the file itself.
  assert.match(css, /--stoa-color-text: var\(--stoa-color-neutral-950\);/);
  assert.equal(resolved.themes.light["color-text"], "oklch(0.16 0.007 250)");
  assert.equal(resolved.themes.light["color-up-wash"], "oklch(0.62 0.13 170 / 0.18)");
  // The dark theme overrides the semantic colours and inherits the rest.
  assert.equal(resolved.themes.dark["color-text"], "oklch(0.967 0.003 250)");
  assert.equal(resolved.themes.dark["color-neutral-0"], "oklch(1 0 0)");
  assert.equal(resolved.themes.dark["focus-width"], "2px");
});

test("the resolver does not let the prefers-color-scheme block leak into the light theme", () => {
  // dark-auto.css repeats the dark values under `:root:not([data-theme="light"])`
  // inside an at-rule. Reading it as a top-level rule would make the light
  // theme measure dark colours.
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.equal(resolved.themes.light["color-bg"], "oklch(0.985 0.002 250)");
  assert.notEqual(resolved.themes.light["color-bg"], resolved.themes.dark["color-bg"]);
});

test("the resolver reads every density mode, with regular as the default", () => {
  assert.deepEqual(Object.keys(resolved.densities), ["compact", "regular", "comfortable"]);
  assert.equal(resolved.densities.compact["density-row-height"], "24px");
  assert.equal(resolved.densities.regular["density-row-height"], "28px");
  assert.equal(resolved.densities.comfortable["density-row-height"], "36px");
  // Regular is declared on `:root` as well, so the theme maps carry it.
  assert.equal(resolved.themes.light["density-row-height"], "28px");
});

test("every check produces a complete, uniquely identified result", () => {
  assert.equal(new Set(results.map((r) => r.id)).size, results.length);
  for (const r of results) {
    assert.equal(typeof r.id, "string", r.id);
    assert.ok(Object.values(RULES).includes(r.rule), `${r.id}: unknown rule ${r.rule}`);
    assert.ok(r.theme === null || ["light", "dark"].includes(r.theme), `${r.id}: theme ${r.theme}`);
    assert.ok(r.subject.length > 0, `${r.id}: no subject`);
    assert.ok(r.reason.length > 0, `${r.id}: no reason`);
    assert.ok(Number.isFinite(r.value), `${r.id}: value ${r.value}`);
    assert.ok(["ratio", "dE2000", "px"].includes(r.unit), `${r.id}: unit ${r.unit}`);
    assert.ok(Number.isFinite(r.threshold), `${r.id}: threshold ${r.threshold}`);
    assert.equal(r.pass, r.value >= r.threshold, `${r.id}: pass does not follow from value and threshold`);
    assert.equal(typeof r.enforced, "boolean", `${r.id}: enforced`);
  }
});

test("the rule set covers the pair lists in both themes and every density", () => {
  const perRule = (rule) => results.filter((r) => r.rule === rule);
  assert.equal(perRule(RULES.textContrast).length, TEXT_PAIRS.length * 2);
  assert.equal(perRule(RULES.nonTextContrast).length, NON_TEXT_PAIRS.length * 2);
  // One luminance ratio plus one CIEDE2000 per colour-vision model, per theme.
  assert.equal(perRule(RULES.upDown).length, (1 + CVD_MODELS.length) * 2);
  assert.equal(perRule(RULES.targetSize).length, TARGETS.length * 3);
  assert.equal(results.length, 83);
});

test("a pair whose background is a wash is measured over the colour behind it", () => {
  // The ladder draws the size in `text` on top of the depth bar, so the
  // background is the wash composited over the ladder surface, not the wash
  // on its own. Measuring the wash alone would ignore its alpha and report
  // the ratio for an opaque teal.
  const overSurface = byId.get(`${RULES.textContrast}/light/text-on-up-wash-over-surface`);
  assert.ok(overSurface, "no result for text over the bid depth bar");
  assert.equal(overSurface.subject, "text on up-wash over surface");
  const onSurface = byId.get(`${RULES.textContrast}/light/text-on-surface`);
  // The wash lightens the light theme's surface a little, so the ratio under
  // the bar is lower than on the bare surface but still well over AA.
  assert.ok(overSurface.value < onSurface.value, `${overSurface.value} vs ${onSurface.value}`);
  assert.ok(overSurface.value > TEXT_AA, `${overSurface.value}`);
});

test("every pair in the data files carries a reason", () => {
  for (const pair of [...TEXT_PAIRS, ...NON_TEXT_PAIRS]) {
    assert.ok(pair.reason && pair.reason.length > 20, `${pair.fg} on ${pair.bg}: reason too thin`);
  }
  for (const target of TARGETS) assert.ok(target.reason.length > 20, `${target.token}: reason too thin`);
});

test("the colour-vision models are named in the result, not only in the docs", () => {
  for (const model of CVD_MODELS.filter((m) => m !== "normal")) {
    const r = byId.get(`${RULES.upDown}/light/de2000-${model}`);
    assert.ok(r, `no result for ${model}`);
    assert.match(r.model, /Machado 2009/);
    assert.match(r.model, new RegExp(model));
    assert.match(r.model, /severity 1\.0/);
    assert.match(r.model, /linear light/);
  }
});

test("only the up/down rule and the pairs marked reported-only are unenforced", () => {
  const unenforced = results.filter((r) => !r.enforced).map((r) => r.id);
  const expected = [
    ...NON_TEXT_PAIRS.filter((p) => p.enforced === false).flatMap((p) => [
      `${RULES.nonTextContrast}/light/${pairName(p)}`,
      `${RULES.nonTextContrast}/dark/${pairName(p)}`,
    ]),
    ...["light", "dark"].flatMap((t) => [
      `${RULES.upDown}/${t}/contrast`,
      ...CVD_MODELS.map((m) => `${RULES.upDown}/${t}/de2000-${m}`),
    ]),
  ];
  assert.deepEqual(unenforced.sort(), expected.sort());
});

test("a missing or unreadable token fails loudly rather than measuring a guess", () => {
  const broken = { themes: { light: { ...resolved.themes.light } }, densities: {} };
  delete broken.themes.light["color-text"];
  assert.throws(() => runAllChecks(broken), /token color-text is not defined/);

  const unreadable = { themes: { light: { ...resolved.themes.light, "color-text": "chartreuse" } }, densities: {} };
  assert.throws(() => runAllChecks(unreadable), /not a colour this module can read/);

  const notPixels = { themes: {}, densities: { compact: { "density-row-height": "1.5rem" } } };
  assert.throws(() => runAllChecks(notPixels), /not a pixel length/);
});

test("the check modules stay importable in a browser", async () => {
  // The playground runs the same rules on colours a person is editing, so
  // nothing under src/ may reach for a Node built-in, and every module has
  // to be reachable through the package's exports map.
  const sources = ["checks", "resolve", "pairs", "color"];
  for (const name of sources) {
    const text = await readFile(new URL(`../src/${name}.mjs`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /from\s+"node:/, `src/${name}.mjs imports a Node built-in`);
    assert.doesNotMatch(text, /require\(/, `src/${name}.mjs uses require`);
  }
  const viaExports = await import("@ghostjima/stoa-tokens/checks");
  assert.equal(typeof viaExports.runAllChecks, "function");
  const resolverViaExports = await import("@ghostjima/stoa-tokens/resolve");
  assert.equal(typeof resolverViaExports.resolveTokens, "function");
});

// The gate. Four ways for known-violations.json to be wrong, all of them
// a test failure, so the file cannot go stale in either direction.

/** The result an entry names, or an assertion that says which entry is
 * wrong. Reading the map without this guard turned an id no rule produces
 * into a TypeError on `undefined`, which named neither the file nor the
 * entry. */
function resultFor(entry) {
  const r = byId.get(entry.id);
  assert.ok(
    r,
    `known-violations.json: ${entry.id} is not produced by any rule; remove the entry or correct the id`,
  );
  return r;
}

test("an entry naming no rule fails with a message rather than a TypeError", () => {
  assert.throws(() => resultFor({ id: "text-contrast/light/no-such-pair" }), {
    name: "AssertionError",
    message: /known-violations\.json: text-contrast\/light\/no-such-pair is not produced by any rule/,
  });
});

test("no enforced check fails outside known-violations.json", () => {
  const listed = new Set(known.violations.map((v) => v.id));
  const unlisted = summarize(results)
    .failures.filter((r) => !listed.has(r.id))
    .map((r) => `${r.id} is ${r.value.toFixed(4)} ${r.unit}, needs ${r.threshold}`);
  assert.deepEqual(unlisted, [], `new violations:\n${unlisted.join("\n")}`);
});

test("every entry in known-violations.json still names a real check", () => {
  for (const v of known.violations) {
    assert.equal(resultFor(v).enforced, true, `${v.id} is reported only, so it does not belong here`);
  }
});

test("every entry in known-violations.json still fails", () => {
  const fixed = known.violations.filter((v) => resultFor(v).pass).map((v) => v.id);
  assert.deepEqual(fixed, [], `these now pass and must be removed from known-violations.json:\n${fixed.join("\n")}`);
});

test("every entry in known-violations.json still records the measured value", () => {
  for (const v of known.violations) {
    const r = resultFor(v);
    assert.equal(r.threshold, v.threshold, `${v.id}: threshold moved`);
    assert.equal(r.unit, v.unit, `${v.id}: unit moved`);
    const drift = Math.abs(r.value - v.value);
    assert.ok(
      drift <= known.tolerance,
      `${v.id}: recorded ${v.value}, measured ${r.value.toFixed(4)} (drift ${drift.toFixed(4)} over tolerance ${known.tolerance})`,
    );
  }
});

test("known-violations.json names the commit its numbers were measured on", () => {
  assert.match(known.measuredOn, /^[0-9a-f]{40}$/);
});
