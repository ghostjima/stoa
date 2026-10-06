import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Controls";
import { Ltr } from "./Ltr";
import { Table, type TableColumn } from "./Table";
import { useStoaFormat, type StoaMessages } from "./locale";

/** How long the result of a copy stays on screen, in ms. */
const COPY_STATUS_MS = 2000;

export type DerivationSource = {
  /** Where the rule or the number comes from ("Tax Code, art. 214.1",
   * "Bank of Russia key rate"). */
  name: string;
  /** Which revision of it: a date or an edition, as the caller writes
   * it. */
  revision?: string;
  /** A link to it. */
  href?: string;
};

export type DerivationStep = {
  /** Stable key. */
  id: string;
  /** What the step works out ("Accrued interest"). */
  label: string;
  /** How: the formula with the numbers put in, written left to right
   * ("1000 × 7.5% × 92 / 365"), and kept that way in a right-to-left page. */
  formula?: string;
  /** The step's result, as the caller formats it ("18.90 RUB"). */
  value: string;
  source?: DerivationSource;
};

export type DerivationTableProps = {
  /** What the table works out ("Yield after tax"): its caption, the name
   * of the table and the first line of a copy. */
  caption: string;
  /** Keep the caption for assistive technology only, under a visible
   * heading. */
  hideCaption?: boolean;
  steps: DerivationStep[];
  /** A Copy button that puts the derivation on the clipboard as plain
   * text. On by default. */
  copyable?: boolean;
};

/** One step as a line of plain text: "Accrued interest: 1000 × 7.5% × 92
 * / 365 = 18.90 RUB (Tax Code, art. 214.1, revision 2025-12-01)". */
function stepLine(step: DerivationStep, messages: StoaMessages): string {
  const working = step.formula ? `${step.formula} = ${step.value}` : step.value;
  const source = step.source ? [step.source.name, step.source.revision && messages.derivationRevision(step.source.revision)].filter(Boolean).join(", ") : "";
  return `${step.label}: ${working}${source ? ` (${source})` : ""}`;
}

/** The derivation as plain text: the caption, then a line per step. No
 * invisible direction marks: a formula copied out of a right-to-left page
 * reads as it was written. */
export function derivationText(caption: string, steps: DerivationStep[], messages: StoaMessages): string {
  return [caption, ...steps.map((step) => stepLine(step, messages))].join("\n");
}

/**
 * How a figure was worked out, step by step: what each step works out,
 * its formula with the numbers put in, its value and the source of the
 * rule or the number, with that source's revision. A Table (its caption
 * names it; each step's name is its row's header), so it is read as one,
 * and a Copy button puts the whole derivation on the clipboard as plain
 * text, announcing that it did, politely.
 *
 * Right to left, the formula stays one left-to-right run in the numeric
 * face, and each value takes the direction of its own first letter.
 */
export function DerivationTable({ caption, hideCaption = false, steps, copyable = true }: DerivationTableProps) {
  const { messages } = useStoaFormat();
  const captionId = useId();
  const [status, setStatus] = useState<"copied" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(derivationText(caption, steps, messages));
      setStatus("copied");
    } catch {
      // No clipboard (an insecure page, a denied permission): say so.
      setStatus("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), COPY_STATUS_MS);
  };

  const columns: TableColumn<DerivationStep>[] = [
    { id: "label", header: messages.derivationStep, cell: (step) => step.label },
    {
      id: "formula",
      header: messages.derivationFormula,
      cell: (step) => (step.formula ? <Ltr mono>{step.formula}</Ltr> : null),
    },
    { id: "value", header: messages.derivationValue, numeric: true, cell: (step) => step.value },
    {
      id: "source",
      header: messages.derivationSource,
      cell: (step) =>
        step.source ? (
          <span className="stoa-derivation__source">
            {step.source.href ? <a href={step.source.href}>{step.source.name}</a> : <span>{step.source.name}</span>}
            {step.source.revision && <span className="stoa-derivation__revision">{messages.derivationRevision(step.source.revision)}</span>}
          </span>
        ) : null,
    },
  ];

  return (
    <div className="stoa-derivation">
      {copyable && (
        <div className="stoa-derivation__bar">
          <span role="status" className="stoa-derivation__status">
            {status === "copied" ? messages.copied : status === "failed" ? messages.copyFailed : ""}
          </span>
          <Button size="small" aria-describedby={captionId} onPress={copy}>
            {messages.copy}
          </Button>
        </div>
      )}
      <span id={captionId} hidden>
        {caption}
      </span>
      <Table<DerivationStep> caption={caption} hideCaption={hideCaption} columns={columns} rows={steps} rowKey={(step) => step.id} rowHeader="label" emptyText="" />
    </div>
  );
}
