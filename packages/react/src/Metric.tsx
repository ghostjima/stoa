import type { ReactNode } from "react";
import { StatusBadge } from "./Form";
import { useStoaFormat } from "./locale";

export type MetricThreshold = {
  /** Which side of its threshold the value is on. */
  tone: "positive" | "negative" | "neutral";
  /** The word that says so ("Above target"); drawn with a symbol. */
  label: string;
};

export type MetricProps = {
  label: string;
  /** A number, formatted in the locale's digits, or preformatted text
   * whose numbers are rewritten in them (`digits`): a date such as "4 сент.
   * 2026 г." keeps its full stops. */
  value: number | string;
  /** Decimals shown for a numeric value; 0 by default. */
  fractionDigits?: number;
  /** Drawn after the value ("ms"). */
  unit?: string;
  /** What the value is measured over or against ("p95 over 60 s"). */
  basis?: ReactNode;
  threshold?: MetricThreshold;
};

/** A metric's term and descriptions, for a description list: the
 * standalone Metric's own, or a StatBar's. */
export function MetricParts({ label, value, fractionDigits = 0, unit, basis, threshold }: MetricProps) {
  const { decimal, digits } = useStoaFormat();
  return (
    <>
      <dt className="stoa-metric__label">{label}</dt>
      <dd className="stoa-metric__value">
        {/* The number and its unit are one isolate, in the direction of its
            first letter: "١٦٫٩ ms" stays in that order in a right-to-left
            page, a unit in Arabic letters reads right to left. */}
        <bdi>
          <span className="stoa-metric__number">{typeof value === "number" ? decimal(value, fractionDigits) : digits(value)}</span>
          {unit && <span className="stoa-metric__unit"> {unit}</span>}
        </bdi>
      </dd>
      {threshold && (
        <dd className="stoa-metric__threshold">
          <StatusBadge tone={threshold.tone}>{threshold.label}</StatusBadge>
        </dd>
      )}
      {basis && <dd className="stoa-metric__basis">{basis}</dd>}
    </>
  );
}

/** One measured value: its label, the value in tabular figures with its
 * unit, and optionally what it is measured over and which side of a
 * threshold it is on (a symbol and a word, never colour alone). */
export function Metric(props: MetricProps) {
  return (
    <dl className="stoa-metric">
      <MetricParts {...props} />
    </dl>
  );
}
