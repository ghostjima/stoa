import { useId, type ReactNode } from "react";
import { Callout } from "./Callout";
import { Ltr } from "./Ltr";
import { useStoaFormat, type FindingSeverity } from "./locale";

export type { FindingSeverity } from "./locale";

/** The severities, most severe first: the order of the groups. */
export const FINDING_SEVERITIES: readonly FindingSeverity[] = ["error", "warning", "info"];

/** A finding's severity when the caller gives none: something a person
 * should weigh before going on, not an error that blocks. */
export const DEFAULT_FINDING_SEVERITY: FindingSeverity = "warning";

export type FindingItem = {
  /** Stable key: the same finding keeps it between two checks. */
  id: string;
  /** The rule's code, shown as a reference ("R-12"), when the reader can
   * look it up; left to right in the numeric face. */
  code?: string;
  /** How much it matters; `DEFAULT_FINDING_SEVERITY` ("warning") when
   * left out. */
  severity?: FindingSeverity;
  /** What was found. */
  text: ReactNode;
  /** Where the rule comes from ("Rubric, item 4"; a link): isolated in
   * its own direction. */
  source?: ReactNode;
};

export type FindingsListProps = {
  findings: FindingItem[];
  /** The heading level of each severity's group: 3 by default. */
  groupLevel?: 2 | 3 | 4 | 5 | 6;
  /** What an empty list says, in a positive callout; the locale's "No
   * findings." by default. */
  emptyText?: ReactNode;
};

/** The symbol drawn before each severity, the same as a Callout's for the
 * tone it takes; never the severity alone. */
const SYMBOL: Record<FindingSeverity, string> = { error: "✗", warning: "!", info: "◆" };

/** The findings grouped by severity, most severe first, each group in the
 * caller's order; empty groups left out. */
export function groupFindings(findings: FindingItem[]): { severity: FindingSeverity; findings: FindingItem[] }[] {
  return FINDING_SEVERITIES.map((severity) => ({
    severity,
    findings: findings.filter((f) => (f.severity ?? DEFAULT_FINDING_SEVERITY) === severity),
  })).filter((group) => group.findings.length > 0);
}

/**
 * What a check found, for a person to weigh: findings grouped by
 * severity, errors first, then warnings, then notes, each group under a
 * heading with its count and as a list named by that heading. Each
 * finding shows its severity as a symbol and a word (the colour repeats
 * them), what was found, its code and its source. A finding the caller
 * gives no severity is a warning. No findings: a positive callout says
 * so.
 */
export function FindingsList({ findings, groupLevel = 3, emptyText }: FindingsListProps) {
  const { messages, integer } = useStoaFormat();
  const baseId = useId();
  if (findings.length === 0)
    return (
      <Callout tone="positive" role="none">
        {emptyText ?? messages.findingsNone}
      </Callout>
    );
  const Heading = `h${groupLevel}` as const;
  return (
    <div className="stoa-findings">
      {groupFindings(findings).map((group) => {
        const headingId = `${baseId}-${group.severity}`;
        return (
          <div key={group.severity} className={`stoa-findings__group stoa-findings__group--${group.severity}`}>
            <Heading id={headingId} className="stoa-findings__heading">
              <span className="stoa-findings__symbol" aria-hidden="true">
                {SYMBOL[group.severity]}
              </span>{" "}
              {messages.findingGroup(group.severity, integer(group.findings.length))}
            </Heading>
            <ul className="stoa-findings__list" aria-labelledby={headingId}>
              {group.findings.map((finding) => (
                <li key={finding.id} className="stoa-finding" data-severity={group.severity}>
                  <span className="stoa-findings__symbol" aria-hidden="true">
                    {SYMBOL[group.severity]}
                  </span>
                  <div className="stoa-finding__body">
                    <p className="stoa-finding__text">
                      <span className="stoa-finding__severity">{`${messages.findingSeverity[group.severity]}:`}</span> {finding.text}
                    </p>
                    {(finding.code || finding.source) && (
                      <p className="stoa-finding__meta">
                        {finding.code && <Ltr mono>{finding.code}</Ltr>}
                        {finding.source && (
                          <span className="stoa-finding__source">
                            {messages.findingSource}: <bdi>{finding.source}</bdi>
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
