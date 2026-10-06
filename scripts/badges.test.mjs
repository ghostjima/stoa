import assert from "node:assert/strict";
import { test } from "node:test";
import { BadgeError, parseUnitLog, readAxeSweep, readContrast, readPlaywright } from "./badges.mjs";

const LOG = `Scope: 3 of 4 workspace projects
packages/react test$ vitest run
packages/tokens test$ node --test scripts/*.test.mjs
packages/tokens test: # Subtest: nested
packages/tokens test:     # tests 99
packages/tokens test: # tests 5
packages/tokens test: # suites 0
packages/tokens test: # pass 5
packages/tokens test: # fail 0
packages/tokens test: # cancelled 0
packages/tokens test: # skipped 0
packages/tokens test: # todo 0
packages/react test:  \x1b[2m Test Files \x1b[22m 2 passed (2)
packages/react test: \x1b[2m      Tests \x1b[22m 7 passed | 1 skipped (8)
ℹ tests 3
ℹ suites 1
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
`;

test("unit counts add the Vitest and node:test summaries of every package and the root", () => {
  assert.deepEqual(parseUnitLog(LOG), { suites: 3, passed: 15, failed: 0, skipped: 1 });
});

test("a package that started its tests without a summary stops the badge", () => {
  const log = LOG.replace(/packages\/react test: .*Tests.*\n/, "");
  assert.throws(() => parseUnitLog(log), BadgeError);
});

test("failed Vitest tests are counted, and a summary that does not add up is refused", () => {
  const failed = LOG.replace("7 passed | 1 skipped (8)", "2 failed | 5 passed | 1 skipped (8)");
  assert.equal(parseUnitLog(failed).failed, 2);
  assert.throws(() => parseUnitLog(LOG.replace("(8)", "(9)")), BadgeError);
});

test("a log without the root scripts' summary stops the badge", () => {
  assert.throws(() => parseUnitLog(LOG.split("ℹ tests")[0]), BadgeError);
});

const report = (status, annotations, stats = { expected: 1, unexpected: 0, flaky: 0, skipped: 0 }) => ({
  stats,
  suites: [{ specs: [], suites: [{ specs: [{ title: "sweep", tests: [{ status, annotations }] }] }] }],
});
const mode = (theme, dir, stories = 104, serious = 0) => ({ type: "axe-sweep", description: JSON.stringify({ theme, dir, stories, serious }) });

test("the axe matrix is read from the sweep's annotations", () => {
  const r = report("expected", [mode("light", "ltr"), mode("dark", "ltr"), mode("light", "rtl"), mode("dark", "rtl")]);
  assert.deepEqual(readAxeSweep([["r", r]]), { stories: 104, modes: 4 });
});

test("a failed sweep, a missing sweep or uneven story counts stop the axe badge", () => {
  assert.throws(() => readAxeSweep([["r", report("unexpected", [mode("light", "ltr")])]]), BadgeError);
  assert.throws(() => readAxeSweep([["r", report("expected", [])]]), BadgeError);
  assert.throws(() => readAxeSweep([["r", report("expected", [mode("light", "ltr"), mode("dark", "ltr", 103)])]]), BadgeError);
});

test("browser counts come from the report's stats, and a failure stops the badge", () => {
  assert.deepEqual(readPlaywright({ stats: { expected: 12, unexpected: 0, flaky: 0, skipped: 1 } }, "r"), { passed: 12, flaky: 0, skipped: 1 });
  assert.throws(() => readPlaywright({ stats: { expected: 12, unexpected: 1, flaky: 0, skipped: 0 } }, "r"), BadgeError);
  assert.throws(() => readPlaywright({}, "r"), BadgeError);
});

test("contrast counts only enforced text and non-text contrast checks", () => {
  const results = [
    { rule: "text-contrast", enforced: true, pass: true },
    { rule: "non-text-contrast", enforced: true, pass: false },
    { rule: "non-text-contrast", enforced: false, pass: false },
    { rule: "target-size", enforced: true, pass: true },
  ];
  const known = { violations: [{ id: "non-text-contrast/light/x" }, { id: "target-size/y" }] };
  assert.deepEqual(readContrast({ results }, known), { passing: 1, total: 2, known: 1 });
  assert.throws(() => readContrast({ results: [] }, known), BadgeError);
});
