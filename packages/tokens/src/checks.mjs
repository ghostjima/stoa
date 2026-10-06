// Stoa's colour and size promises as checks.
//
// Pure functions over resolved token maps: no `fs`, no `node:test`, no
// reading of the file system or the DOM, so the same code backs the tests,
// CI and the playground. `resolve.mjs` produces the input.
//
// A result is one measurement:
//
//   {
//     id,         stable identifier, safe to record in known-violations.json
//     rule,       which rule produced it
//     theme,      theme name, or null for a rule that is not theme-scoped
//     subject,    what was measured, in words
//     reason,     why this measurement exists (from pairs.mjs)
//     value,      the measured number
//     unit,       "ratio" for WCAG contrast, "dE2000", or "px"
//     threshold,  the number `value` is compared against
//     pass,       whether the comparison holds
//     enforced,   whether a failure should fail a test
//     model?      colour-vision model, on the CVD rule only
//   }
//
// `enforced: false` means reported only. See pairs.mjs for why an entry
// carries it.

import { CVD_MODELS, clipToGamut, compositeOver, contrast, deltaE2000Srgb, parseColor, simulateCvd } from "./color.mjs";
import {
  NON_TEXT_PAIRS,
  TARGETS,
  TEXT_PAIRS,
  UP_DOWN,
  UP_DOWN_MIN_CONTRAST,
  UP_DOWN_MIN_DELTA_E,
} from "./pairs.mjs";

export const RULES = {
  textContrast: "text-contrast",
  nonTextContrast: "non-text-contrast",
  upDown: "up-down-distinguishability",
  targetSize: "target-size",
};

function colorOf(tokens, name, where) {
  const raw = tokens[`color-${name}`];
  if (raw === undefined) throw new Error(`${where}: token color-${name} is not defined`);
  const parsed = parseColor(raw);
  if (!parsed) throw new Error(`${where}: token color-${name} is not a colour this module can read: ${raw}`);
  return parsed;
}

function pixelsOf(tokens, name, where) {
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`${where}: token ${name} is not defined`);
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(raw.trim());
  if (!m) throw new Error(`${where}: token ${name} is not a pixel length: ${raw}`);
  return Number.parseFloat(m[1]);
}

/** The background a pair is measured against. A `bgOver` names the opaque
 * colour behind a translucent `bg`, so the measurement sees the composite a
 * browser or a canvas draws rather than the wash on its own. */
function backgroundOf(tokens, pair, where) {
  const bg = colorOf(tokens, pair.bg, where);
  if (pair.bgOver === undefined) return bg;
  return compositeOver(clipToGamut(bg), clipToGamut(colorOf(tokens, pair.bgOver, where)));
}

/** What a pair is called in a result id and subject: `fg-on-bg`, or
 * `fg-on-bg-over-base` when the background is a wash over an opaque colour.
 * Exported so a test can name a pair without rebuilding this string. */
export function pairName(pair) {
  return pair.bgOver === undefined ? `${pair.fg}-on-${pair.bg}` : `${pair.fg}-on-${pair.bg}-over-${pair.bgOver}`;
}

function contrastResults(rule, pairs, theme, tokens) {
  return pairs.map((pair) => {
    const where = `${rule}/${theme}`;
    const name = pairName(pair);
    const value = contrast(colorOf(tokens, pair.fg, where), backgroundOf(tokens, pair, where));
    return {
      id: `${rule}/${theme}/${name}`,
      rule,
      theme,
      subject: pair.bgOver === undefined ? `${pair.fg} on ${pair.bg}` : `${pair.fg} on ${pair.bg} over ${pair.bgOver}`,
      reason: pair.reason,
      value,
      unit: "ratio",
      threshold: pair.min,
      pass: value >= pair.min,
      enforced: pair.enforced !== false,
    };
  });
}

/** WCAG 2 text contrast for one theme. A translucent foreground, or a
 * background given as a wash with a `bgOver`, is composited first. */
export function checkTextContrast(theme, tokens) {
  return contrastResults(RULES.textContrast, TEXT_PAIRS, theme, tokens);
}

/** WCAG 2 non-text contrast (1.4.11) for one theme. A translucent
 * foreground is composited over its background first. */
export function checkNonTextContrast(theme, tokens) {
  return contrastResults(RULES.nonTextContrast, NON_TEXT_PAIRS, theme, tokens);
}

/** How far apart the rising and falling colours are for one theme: their
 * WCAG 2 contrast with each other, and CIEDE2000 under normal vision and
 * under each simulated dichromacy. All reported, none enforced: Stage 2
 * decides the colours, and both thresholds are this project's rather than
 * a standard's. */
export function checkUpDownDistinguishability(theme, tokens) {
  const rule = RULES.upDown;
  const where = `${rule}/${theme}`;
  const a = colorOf(tokens, UP_DOWN.a, where);
  const b = colorOf(tokens, UP_DOWN.b, where);
  const luminance = contrast(a, b);
  const results = [
    {
      id: `${rule}/${theme}/contrast`,
      rule,
      theme,
      subject: `${UP_DOWN.a} against ${UP_DOWN.b}, luminance only`,
      reason: UP_DOWN.contrastReason,
      value: luminance,
      unit: "ratio",
      threshold: UP_DOWN_MIN_CONTRAST,
      pass: luminance >= UP_DOWN_MIN_CONTRAST,
      enforced: false,
      model: "normal vision",
    },
  ];
  for (const model of CVD_MODELS) {
    const value = deltaE2000Srgb(simulateCvd(a, model), simulateCvd(b, model));
    results.push({
      id: `${rule}/${theme}/de2000-${model}`,
      rule,
      theme,
      subject: `${UP_DOWN.a} against ${UP_DOWN.b}, ${model}`,
      reason: UP_DOWN.reason,
      value,
      unit: "dE2000",
      threshold: UP_DOWN_MIN_DELTA_E,
      pass: value >= UP_DOWN_MIN_DELTA_E,
      enforced: false,
      model: model === "normal" ? "normal vision" : `Machado 2009, ${model}, severity 1.0, linear light`,
    });
  }
  return results;
}

/** WCAG 2.2 target size (2.5.8) for the size tokens of one density mode. */
export function checkTargetSize(density, tokens) {
  return TARGETS.map((target) => {
    const where = `${RULES.targetSize}/${density}`;
    const value = pixelsOf(tokens, target.token, where);
    return {
      id: `${RULES.targetSize}/${density}/${target.token}`,
      rule: RULES.targetSize,
      theme: null,
      subject: `${density} ${target.token}`,
      reason: target.reason,
      value,
      unit: "px",
      threshold: target.min,
      pass: value >= target.min,
      enforced: true,
    };
  });
}

/** Every check, in a stable order: the colour rules per theme, then target
 * size per density mode.
 *
 * @param {{ themes: Record<string, Record<string, string>>, densities: Record<string, Record<string, string>> }} resolved
 */
export function runAllChecks({ themes, densities }) {
  const results = [];
  for (const [theme, tokens] of Object.entries(themes)) {
    results.push(...checkTextContrast(theme, tokens));
    results.push(...checkNonTextContrast(theme, tokens));
    results.push(...checkUpDownDistinguishability(theme, tokens));
  }
  for (const [density, tokens] of Object.entries(densities)) {
    results.push(...checkTargetSize(density, tokens));
  }
  return results;
}

/** Counts per rule plus the enforced failures, for a printed summary. */
export function summarize(results) {
  const byRule = {};
  for (const r of results) {
    const s = (byRule[r.rule] ??= { checks: 0, failures: 0, reportedFailures: 0 });
    s.checks++;
    if (!r.pass) s[r.enforced ? "failures" : "reportedFailures"]++;
  }
  return {
    checks: results.length,
    failures: results.filter((r) => r.enforced && !r.pass),
    reportedFailures: results.filter((r) => !r.enforced && !r.pass),
    byRule,
  };
}
