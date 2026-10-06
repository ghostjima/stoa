// Run every check in src/checks.mjs against the built tokens, write the
// full result list to dist/verify.json and print a short table.
//
// Usage: pnpm --filter @ghostjima/stoa-tokens verify
//
// This script is the Node side of the verification layer: reading files and
// printing lives here, the rules themselves stay pure in src/ so the
// playground can run the same checks in the browser.
import { readFile, writeFile } from "node:fs/promises";
import { runAllChecks, summarize } from "../src/checks.mjs";
import { resolveTokens } from "../src/resolve.mjs";

const cssPath = new URL("../dist/tokens.css", import.meta.url);
const css = await readFile(cssPath, "utf8").catch(() => {
  console.error("dist/tokens.css is missing; run the package build first.");
  process.exit(1);
});

const results = runAllChecks(resolveTokens(css));
const { checks, failures, reportedFailures, byRule } = summarize(results);

await writeFile(new URL("../dist/verify.json", import.meta.url), `${JSON.stringify({ results }, null, 2)}\n`);

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);
const W = Math.max(8, ...Object.keys(byRule).map((r) => r.length)) + 2;

// The colour-vision models belong in the header rather than only in the
// failure lines: a reader needs to know which simulation produced the
// distinguishability numbers even when every one of those rows passes.
const models = [...new Set(results.map((r) => r.model).filter(Boolean))];
if (models.length) console.log(`colour-vision models: ${models.join("; ")}\n`);

console.log(`${pad("rule", W)}${num("checks", 7)}${num("failures", 10)}${num("reported", 10)}`);
for (const [rule, s] of Object.entries(byRule)) {
  console.log(`${pad(rule, W)}${num(s.checks, 7)}${num(s.failures, 10)}${num(s.reportedFailures, 10)}`);
}
console.log(`${pad("total", W)}${num(checks, 7)}${num(failures.length, 10)}${num(reportedFailures.length, 10)}`);

const show = (r) => `  ${pad(r.id, 52)} ${num(r.value.toFixed(2), 7)} ${r.unit}, needs ${r.threshold}`;
if (failures.length) {
  console.log(`\nenforced failures (${failures.length}):`);
  for (const r of failures) console.log(show(r));
}
if (reportedFailures.length) {
  console.log(`\nbelow threshold, reported only (${reportedFailures.length}):`);
  for (const r of reportedFailures) console.log(show(r));
}
console.log(`\ndist/verify.json: ${results.length} results`);
