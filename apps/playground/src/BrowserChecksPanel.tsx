// The in-browser verification results: every rule in
// packages/tokens/src/checks.mjs, run on the live token values, grouped by
// rule and matched against known-violations.json.
import { useMemo, useState } from "react";
import { Button, ChoiceGroup, Disclosure, StatusBadge, type StatusTone } from "@ghostjima/stoa-react";
import type { BrowserCheck, CheckStatus } from "./browserChecks";

export type BrowserChecksPanelProps = {
  checks: BrowserCheck[];
  /** Ids in known-violations.json no rule produced (see `BrowserChecks`). */
  unproduced: string[];
  /** A failure was picked: highlight the tokens it reads. */
  onSelect: (check: BrowserCheck) => void;
};

const STATUS_TONE: Record<CheckStatus, StatusTone> = {
  pass: "positive",
  fixed: "positive",
  known: "neutral",
  new: "negative",
  reported: "warning",
  "listed-reported": "negative",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "passed",
  fixed: "fixed, remove from known-violations.json",
  known: "known",
  new: "new failure",
  reported: "reported only",
  "listed-reported": "listed, but reported only: remove from known-violations.json",
};

const RULE_LABEL: Record<string, string> = {
  "text-contrast": "Text contrast",
  "non-text-contrast": "Non-text contrast",
  "up-down-distinguishability": "Up/down distinguishability",
  "target-size": "Target size",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New only" },
];

function groupByRule(checks: BrowserCheck[]): [string, BrowserCheck[]][] {
  const byRule = new Map<string, BrowserCheck[]>();
  for (const check of checks) byRule.set(check.rule, [...(byRule.get(check.rule) ?? []), check]);
  return [...byRule.entries()];
}

export function BrowserChecksPanel({ checks, unproduced, onSelect }: BrowserChecksPanelProps) {
  const [filter, setFilter] = useState<"all" | "new">("all");
  const groups = useMemo(() => groupByRule(checks), [checks]);
  const newCount = checks.filter((c) => c.status === "new").length;

  return (
    <div className="pg-checks" data-testid="browser-checks">
      <div className="pg-row pg-row--between">
        <StatusBadge tone={newCount === 0 ? "positive" : "negative"}>
          {newCount === 0 ? `${checks.length} checks, no new failures` : `${newCount} new failure${newCount === 1 ? "" : "s"}`}
        </StatusBadge>
        <ChoiceGroup label="Show" hideLabel choices={FILTERS} value={filter} onChange={(v) => setFilter(v as "all" | "new")} />
      </div>
      {unproduced.length > 0 && (
        <table className="stoa-table" data-testid="unproduced-entries">
          <caption>known-violations.json entries no rule produces</caption>
          <thead>
            <tr>
              <th scope="col">Entry</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {unproduced.map((id) => (
              <tr key={id} data-entry={id} data-status="unproduced">
                <td>
                  <code>{id}</code>
                </td>
                <td>
                  <StatusBadge tone="negative">not produced by any rule: remove the entry or correct the id</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {groups.map(([rule, ruleChecks]) => {
        const shown = filter === "new" ? ruleChecks.filter((c) => c.status === "new") : ruleChecks;
        if (shown.length === 0) return null;
        const flagged = ruleChecks.filter((c) => c.status !== "pass").length;
        return (
          <Disclosure
            key={rule}
            className="pg-check-group"
            defaultOpen={flagged > 0}
            summary={`${RULE_LABEL[rule] ?? rule} (${ruleChecks.length}, ${flagged} flagged)`}
          >
            <table className="stoa-table">
              <caption className="stoa-visually-hidden">{RULE_LABEL[rule] ?? rule} results</caption>
              <thead>
                <tr>
                  <th scope="col">Check</th>
                  <th scope="col">Result</th>
                  <th scope="col" className="pg-check__action">
                    <span className="stoa-visually-hidden">Highlight</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((check) => (
                  <tr key={check.id} data-check={check.id} data-status={check.status}>
                    <td>
                      {check.subject}
                      {check.model ? ` (${check.model})` : ""}
                      <span className="pg-check__measure">
                        {check.theme ?? "both themes"}: {check.value.toFixed(2)} {check.unit}, threshold {check.threshold}
                      </span>
                    </td>
                    <td>
                      <StatusBadge tone={STATUS_TONE[check.status]}>{STATUS_LABEL[check.status]}</StatusBadge>
                    </td>
                    <td className="pg-check__action">
                      <Button onPress={() => onSelect(check)} isDisabled={check.tokens.length === 0}>
                        Highlight
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        );
      })}
    </div>
  );
}
