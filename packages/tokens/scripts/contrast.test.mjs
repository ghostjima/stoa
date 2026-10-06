// WCAG 2.2 contrast of Stoa's semantic colours, measured on the built
// values in both themes. Text needs 4.5:1 (AA, normal text); prices in
// bid/ask/up/down colours are text too; borders and focus need 3:1
// against the surface (non-text contrast, 1.4.11).
//
// The measurements now come from src/checks.mjs, which checks a wider list
// against more surfaces. This file keeps asserting exactly the pairs and
// thresholds it asserted before that engine existed, so the acceptance gate
// did not move when the engine arrived. The wider list is in
// scripts/checks.test.mjs; the failures it finds are recorded in
// known-violations.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RULES, runAllChecks } from "../src/checks.mjs";
import { resolveTokens } from "../src/resolve.mjs";

const css = await readFile(new URL("../dist/tokens.css", import.meta.url), "utf8");
const byId = new Map(runAllChecks(resolveTokens(css)).map((r) => [r.id, r]));

const pairs = [
  ["text", "bg", 7, RULES.textContrast],
  ["text", "surface", 7, RULES.textContrast],
  ["text-muted", "surface", 4.5, RULES.textContrast],
  ["text-muted", "surface-sunken", 4.5, RULES.textContrast],
  ["accent", "surface", 4.5, RULES.textContrast],
  ["bid", "surface", 4.5, RULES.textContrast],
  ["ask", "surface", 4.5, RULES.textContrast],
  ["up", "surface", 4.5, RULES.textContrast],
  ["down", "surface", 4.5, RULES.textContrast],
  ["focus", "surface", 3, RULES.nonTextContrast],
];

for (const name of ["light", "dark"]) {
  for (const [fg, bg, min, rule] of pairs) {
    test(`${name}: ${fg} on ${bg} >= ${min}:1`, () => {
      const result = byId.get(`${rule}/${name}/${fg}-on-${bg}`);
      assert.ok(result, `${fg} on ${bg} is not in the ${rule} pair list any more`);
      assert.equal(result.threshold, min, `${fg} on ${bg} is now checked against ${result.threshold}:1`);
      assert.ok(result.pass, `${fg} on ${bg} is ${result.value.toFixed(2)}:1`);
    });
  }
}
