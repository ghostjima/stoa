// Run the font engine over font files and print what it found, as Markdown.
//
// This is how the numbers in docs/type-measurements.md were taken: the same
// engine the panel uses, on named files, with the commit stated. The files
// are given on the command line because most of them are not in this
// repository; a measurement is only worth reading beside the file and the
// version it was taken on.
//
// Usage:
//   node apps/playground/scripts/font-report.mjs <label>=<path> [...]
//   node apps/playground/scripts/font-report.mjs <path> [...]
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { inspectFont } from "../src/type/engine.ts";
import { featureCountSentence } from "../src/type/report.ts";

const targets = process.argv.slice(2).map((argument) => {
  const at = argument.indexOf("=");
  return at > 0
    ? { label: argument.slice(0, at), path: argument.slice(at + 1) }
    : { label: basename(argument), path: argument };
});

if (targets.length === 0) {
  console.error("usage: node apps/playground/scripts/font-report.mjs [label=]<font file> ...");
  process.exit(2);
}

const commit = (() => {
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim() !== "";
    return `${head}${dirty ? " (working tree dirty)" : ""}`;
  } catch {
    return "unknown";
  }
})();

const row = (cells) => `| ${cells.join(" | ")} |`;

console.log(`Font engine report, commit ${commit}`);

const reports = [];
for (const target of targets) {
  const bytes = new Uint8Array(readFileSync(target.path));
  const report = await inspectFont(bytes);
  reports.push({ ...target, bytes, report });
}

console.log(`HarfBuzz ${reports[0]?.report.harfbuzz ?? "unknown"}\n`);

console.log("## Files\n");
console.log(row(["File", "Family", "Container", "sha256 (first 16)", "upem", "x-height", "GSUB tags"]));
console.log(row(["---", "---", "---", "---", "---:", "---:", "---:"]));
for (const { label, bytes, report } of reports) {
  const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  console.log(
    row([
      label,
      report.names.family || "not stated",
      report.format,
      sha,
      String(report.metrics.upem),
      String(report.metrics.xHeight ?? "not stated"),
      String(report.gsubTagCount),
    ]),
  );
}

console.log("\n## Digit advances, in font units, each digit shaped on its own\n");
console.log(row(["File", "Set", "Asked for", "Verdict", "Distinct", "Advances"]));
console.log(row(["---", "---", "---", "---", "---:", "---"]));
for (const { label, report } of reports) {
  for (const digits of report.digits) {
    console.log(
      row([
        label,
        digits.set,
        digits.feature === "tnum" ? "tnum 1" : "as shaped",
        digits.verdict,
        digits.present ? String(digits.distinct) : "n/a",
        digits.present ? digits.advances.join(", ") : "not in this file (at least one digit shaped to glyph 0)",
      ]),
    );
  }
}

console.log("\n## The same digits shaped as one run, where it differs\n");
let anyKerning = false;
for (const { label, report } of reports) {
  for (const digits of report.digits) {
    if (!digits.present || digits.advances.join() === digits.runAdvances.join()) continue;
    anyKerning = true;
    console.log(`- ${label}, ${digits.set}, ${digits.feature}: run ${digits.runAdvances.join(", ")}`);
  }
}
if (!anyKerning) console.log("- no file here shapes the ten digits differently in a run");

console.log("\n## Features\n");
for (const { label, report } of reports) {
  const gsub = report.features.filter((feature) => feature.table === "GSUB").map((feature) => feature.tag);
  console.log(`- ${label}: ${featureCountSentence(report)}`);
  console.log(`  - GSUB: ${gsub.join(" ") || "none"}`);
  if (report.axes.length > 0) {
    console.log(
      `  - axes: ${report.axes.map((axis) => `${axis.tag} ${axis.min} to ${axis.max}, default ${axis.default}`).join("; ")}`,
    );
  }
  if (report.instances.length > 0) {
    console.log(`  - named instances: ${report.instances.map((instance) => instance.name).join(", ")}`);
  }
}
