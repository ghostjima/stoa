// Shields.io endpoint badges from what CI measured on this commit.
//
// Usage (CI runs it after the tests; see .github/workflows/ci.yml):
//   node scripts/badges.mjs --out <dir>
//     --unit <log of `pnpm test`>
//     --browser <Playwright JSON report> [--browser <another> ...]
//     --verify packages/tokens/dist/verify.json
//     --known packages/tokens/known-violations.json
//     --css packages/react/dist/styles.css --css packages/tokens/dist/tokens.css
//
// Each badge is one JSON file, {"schemaVersion":1,"label","message","color"},
// which CI commits to the `badges` branch for img.shields.io/endpoint to
// read. A value that cannot be read, or a run that did not pass, stops the
// script with an error: a badge is never written from a guess.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

export class BadgeError extends Error {}
const fail = (message) => {
  throw new BadgeError(message);
};

const read = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    return fail(`cannot read ${path}: ${e.message}`);
  }
};
const readJson = (path) => {
  try {
    return JSON.parse(read(path));
  } catch (e) {
    if (e instanceof BadgeError) throw e;
    return fail(`${path} is not JSON: ${e.message}`);
  }
};

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
// pnpm prefixes a workspace package's output with "<dir> test: ".
const PREFIX = String.raw`(?:(\S+) test: )?`;
const STARTED = /^(\S+) test\$ (.+)$/;
const VITEST = new RegExp(`^${PREFIX}\\s*Tests\\s+(.+?)\\s+\\((\\d+)\\)\\s*$`);
// node:test prints TAP ("# pass 54") when not on a terminal and its spec
// reporter ("ℹ pass 54") on one; the summary lines are not indented.
const NODE = new RegExp(`^${PREFIX}(?:#|\\u2139) (tests|pass|fail|cancelled|skipped|todo) (\\d+)$`);

/** Unit test counts from the output of `pnpm test`: one Vitest summary
 * per package that runs Vitest, one node:test summary per package that
 * runs node:test, and one more without a prefix for the root scripts. */
export function parseUnitLog(text) {
  const started = new Set();
  const summaries = [];
  let node = null;
  for (const raw of text.replace(ANSI, "").split(/\r?\n/)) {
    const line = raw.trimEnd();
    let m;
    if ((m = STARTED.exec(line))) {
      started.add(m[1]);
    } else if ((m = VITEST.exec(line))) {
      const counts = { passed: 0, failed: 0, skipped: 0, todo: 0 };
      for (const part of m[2].split("|")) {
        const p = /^\s*(\d+) (passed|failed|skipped|todo)\s*$/.exec(part);
        if (!p) fail(`unrecognised Vitest summary: "${line}"`);
        counts[p[2]] += Number(p[1]);
      }
      const total = counts.passed + counts.failed + counts.skipped + counts.todo;
      if (total !== Number(m[3])) fail(`Vitest summary does not add up: "${line}"`);
      summaries.push({ scope: m[1] ?? "", runner: "vitest", ...counts });
    } else if ((m = NODE.exec(line))) {
      const [, scope = "", key, value] = m;
      if (key === "tests") {
        node = { scope, runner: "node:test", tests: Number(value) };
        summaries.push(node);
      } else {
        if (!node || node.scope !== scope) fail(`node:test "${key}" line before its "tests" line: "${line}"`);
        node[key] = Number(value);
      }
    }
  }
  for (const s of summaries.filter((s) => s.runner === "node:test")) {
    for (const key of ["pass", "fail", "cancelled", "skipped", "todo"]) {
      if (!Number.isInteger(s[key])) fail(`node:test summary${s.scope ? ` for ${s.scope}` : ""} has no "${key}" line`);
    }
    if (s.pass + s.fail + s.cancelled + s.skipped + s.todo !== s.tests) fail(`node:test summary${s.scope ? ` for ${s.scope}` : ""} does not add up`);
    Object.assign(s, { passed: s.pass, failed: s.fail + s.cancelled, skipped: s.skipped, todo: s.todo });
  }
  if (summaries.length === 0) fail("no Vitest or node:test summary in the unit test log");
  for (const scope of started) {
    if (!summaries.some((s) => s.scope === scope)) fail(`${scope} started its tests but printed no summary`);
  }
  if (!summaries.some((s) => s.scope === "")) fail("no summary from the root scripts' tests");
  const sum = (key) => summaries.reduce((n, s) => n + s[key], 0);
  return { suites: summaries.length, passed: sum("passed"), failed: sum("failed"), skipped: sum("skipped") + sum("todo") };
}

/** Pass counts from a Playwright JSON report (reporter "json"). */
export function readPlaywright(report, name) {
  const s = report?.stats;
  if (!s || ![s.expected, s.unexpected, s.flaky, s.skipped].every(Number.isInteger)) fail(`${name} has no Playwright stats`);
  if (s.unexpected > 0) fail(`${name}: ${s.unexpected} browser test(s) failed`);
  if (s.expected + s.flaky === 0) fail(`${name}: no browser test passed`);
  return { passed: s.expected, flaky: s.flaky, skipped: s.skipped };
}

function* playwrightTests(suite) {
  for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) yield { title: spec.title, ...test };
  for (const child of suite.suites ?? []) yield* playwrightTests(child);
}

/** The axe sweep's matrix, from the "axe-sweep" annotations that
 * packages/react/e2e/axe.e2e.ts records, one per mode. */
export function readAxeSweep(reports) {
  const modes = [];
  for (const [name, report] of reports) {
    for (const suite of report.suites ?? []) {
      for (const test of playwrightTests(suite)) {
        const notes = (test.annotations ?? []).filter((a) => a.type === "axe-sweep");
        if (notes.length === 0) continue;
        if (test.status !== "expected") fail(`${name}: axe sweep "${test.title}" did not pass`);
        for (const note of notes) modes.push(JSON.parse(note.description));
      }
    }
  }
  if (modes.length === 0) fail("no axe sweep in the browser test reports");
  const stories = new Set(modes.map((m) => m.stories));
  if (stories.size !== 1) fail(`the axe sweep covered different story counts per mode: ${[...stories].join(", ")}`);
  if (modes.some((m) => m.serious !== 0)) fail("the axe sweep found serious or critical violations");
  return { stories: modes[0].stories, modes: modes.length };
}

const CONTRAST_RULES = ["text-contrast", "non-text-contrast"];

/** Enforced WCAG 2 contrast checks from dist/verify.json, and the known
 * violations of those rules that known-violations.json accepts. */
export function readContrast(verify, known) {
  if (!Array.isArray(verify?.results)) fail("verify.json has no results");
  if (!Array.isArray(known?.violations)) fail("known-violations.json has no violations list");
  const enforced = verify.results.filter((r) => CONTRAST_RULES.includes(r.rule) && r.enforced === true);
  if (enforced.length === 0) fail("verify.json has no enforced contrast checks");
  const passing = enforced.filter((r) => r.pass === true).length;
  const knownCount = known.violations.filter((v) => CONTRAST_RULES.some((rule) => String(v.id ?? "").startsWith(`${rule}/`))).length;
  return { passing, total: enforced.length, known: knownCount };
}

export const gzipBytes = (path) => {
  let data;
  try {
    data = readFileSync(path);
  } catch (e) {
    return fail(`cannot read ${path}: ${e.message}`);
  }
  if (data.length === 0) fail(`${path} is empty`);
  return gzipSync(data, { level: 9 }).length;
};
export const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

function parseArgs(argv) {
  const args = { browser: [], css: [] };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (!key || value === undefined) fail(`expected --name value pairs, got "${argv.slice(i).join(" ")}"`);
    if (Array.isArray(args[key])) args[key].push(value);
    else args[key] = value;
  }
  for (const key of ["out", "unit", "verify", "known"]) if (!args[key]) fail(`--${key} is required`);
  if (args.browser.length === 0) fail("--browser is required");
  if (args.css.length === 0) fail("--css is required");
  return args;
}

export function buildBadges(args) {
  const unit = parseUnitLog(read(args.unit));
  if (unit.failed > 0) fail(`${unit.failed} unit test(s) failed`);
  const reports = args.browser.map((path) => [path, readJson(path)]);
  const browser = reports.map(([name, report]) => readPlaywright(report, name));
  const sum = (key) => browser.reduce((n, b) => n + b[key], 0);
  const axe = readAxeSweep(reports);
  const contrast = readContrast(readJson(args.verify), readJson(args.known));
  const extra = (skipped, flaky = 0) => `${skipped ? `, ${skipped} skipped` : ""}${flaky ? `, ${flaky} flaky` : ""}`;
  return {
    "unit-tests": { label: "unit tests", message: `${unit.passed} passed${extra(unit.skipped)}`, color: "brightgreen" },
    "browser-tests": { label: "browser tests", message: `${sum("passed")} passed${extra(sum("skipped"), sum("flaky"))}`, color: sum("flaky") ? "yellow" : "brightgreen" },
    axe: { label: "axe", message: `0 serious, ${axe.stories} stories x ${axe.modes}`, color: "brightgreen" },
    contrast: {
      label: "WCAG 2 contrast",
      message: `${contrast.passing}/${contrast.total} enforced, ${contrast.known} known`,
      color: contrast.passing === contrast.total && contrast.known === 0 ? "brightgreen" : "yellow",
    },
    "css-size": { label: "CSS gzip", message: args.css.map((path) => `${basename(path)} ${kB(gzipBytes(path))}`).join(", "), color: "blue" },
  };
}

export function writeBadges(out, badges) {
  mkdirSync(out, { recursive: true });
  for (const [name, { label, message, color }] of Object.entries(badges)) {
    const json = `${JSON.stringify({ schemaVersion: 1, label, message, color })}\n`;
    writeFileSync(join(out, `${name}.json`), json);
    process.stdout.write(`${name}.json ${json}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    writeBadges(args.out, buildBadges(args));
  } catch (e) {
    if (!(e instanceof BadgeError)) throw e;
    console.error(`badges: ${e.message}`);
    process.exit(1);
  }
}
