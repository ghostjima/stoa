// The in-browser verification results: every rule in
// packages/tokens/src/checks.mjs, run on the live token values, grouped by
// rule and matched against known-violations.json.
import { useMemo, useState } from "react";
import { Button, ChoiceGroup, Disclosure, StatusBadge, type StatusTone } from "@ghostjima/stoa-react";
import type { BrowserCheck, CheckStatus } from "./browserChecks";
import { useChromeText } from "./chromeLanguage";
import type { RuleId } from "./chromeText";

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


function groupByRule(checks: BrowserCheck[]): [string, BrowserCheck[]][] {
  const byRule = new Map<string, BrowserCheck[]>();
  for (const check of checks) byRule.set(check.rule, [...(byRule.get(check.rule) ?? []), check]);
  return [...byRule.entries()];
}

export function BrowserChecksPanel({ checks, unproduced, onSelect }: BrowserChecksPanelProps) {
  const t = useChromeText();
  /** A rule's name in the chrome's words; a rule this panel does not know
   * yet keeps its id. */
  const ruleName = (rule: string) => (rule in t.checks.rules ? t.checks.rules[rule as RuleId] : rule);
  const themeName = (theme: string) => (theme === "light" || theme === "dark" ? t.tokens.themes[theme] : theme);
  const [filter, setFilter] = useState<"all" | "new">("all");
  const groups = useMemo(() => groupByRule(checks), [checks]);
  const newCount = checks.filter((c) => c.status === "new").length;

  return (
    <div className="pg-checks" data-testid="browser-checks">
      <div className="pg-row pg-row--between">
        <StatusBadge tone={newCount === 0 ? "positive" : "negative"}>
          {newCount === 0 ? t.checks.noNew(checks.length) : t.checks.newCount(newCount)}
        </StatusBadge>
        <ChoiceGroup
          label={t.checks.filterLabel}
          hideLabel
          choices={[
            { id: "all", label: t.checks.all },
            { id: "new", label: t.checks.newOnly },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as "all" | "new")}
        />
      </div>
      {unproduced.length > 0 && (
        <table className="stoa-table" data-testid="unproduced-entries">
          <caption>{t.checks.unproducedCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.checks.entry}</th>
              <th scope="col">{t.checks.status}</th>
            </tr>
          </thead>
          <tbody>
            {unproduced.map((id) => (
              <tr key={id} data-entry={id} data-status="unproduced">
                <td>
                  <code>{id}</code>
                </td>
                <td>
                  <StatusBadge tone="negative">{t.checks.unproduced}</StatusBadge>
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
            summary={t.checks.groupSummary(ruleName(rule), String(ruleChecks.length), String(flagged))}
          >
            <table className="stoa-table">
              <caption className="stoa-visually-hidden">{t.checks.resultsCaption(ruleName(rule))}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.checks.check}</th>
                  <th scope="col">{t.checks.result}</th>
                  <th scope="col" className="pg-check__action">
                    <span className="stoa-visually-hidden">{t.checks.highlight}</span>
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
                        {t.checks.measure(
                          check.theme === null ? t.checks.bothThemes : themeName(check.theme),
                          check.value.toFixed(2),
                          check.unit,
                          String(check.threshold),
                        )}
                      </span>
                    </td>
                    <td>
                      <StatusBadge tone={STATUS_TONE[check.status]}>{t.checks.statuses[check.status]}</StatusBadge>
                    </td>
                    <td className="pg-check__action">
                      <Button onPress={() => onSelect(check)} isDisabled={check.tokens.length === 0}>
                        {t.checks.highlight}
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
