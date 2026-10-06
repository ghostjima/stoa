import { useId, type ReactNode } from "react";
import { ProgressBar } from "react-aria-components";
import { ReorderableList } from "./ReorderableList";
import { useStoaFormat, type StoaMessages } from "./locale";

/** Where a step stands. "awaiting" waits for the person to decide;
 * "undone" is a step whose effect was reverted. */
export type StepStatus = keyof StoaMessages["stepStatus"];

export type Step = {
  /** Stable key. */
  id: string;
  title: ReactNode;
  /** The title as plain text, where `title` is not a string: names the
   * step's buttons and announcements in a reorderable list. */
  textValue?: string;
  status: StepStatus;
  /** A line under the title: why the step stands where it does. */
  explanation?: ReactNode;
  /** Controls for this step only (Retry, Approve). */
  actions?: ReactNode;
  /** How far the step has got, from 0 to 1: a progress bar named by the
   * step's title. */
  progress?: number;
};

export type StepListProps = {
  /** Names the list for assistive technology. */
  label: string;
  steps: Step[];
  /** Move buttons and drag and drop on each step (ReorderableList). */
  reorderable?: boolean;
  /** Called with the steps in their new order, when `reorderable`. */
  onReorder?: (steps: Step[]) => void;
  /** Shows a Remove button on each step, when `reorderable`. */
  onRemove?: (step: Step) => void;
};

/** The symbol drawn before each status word; never the status alone. */
const SYMBOL: Record<StepStatus, string> = {
  waiting: "○",
  running: "◐",
  done: "✓",
  awaiting: "?",
  skipped: "↷",
  undone: "↺",
  error: "✗",
};

function StepBody({ step, index }: { step: Step; index: number }) {
  const { messages, integer } = useStoaFormat();
  const titleId = useId();
  return (
    <>
      <span className="stoa-step__number">{integer(index + 1)}</span>
      <div className="stoa-step__main">
        <div className="stoa-step__head">
          <span id={titleId} className="stoa-step__title">
            {step.title}
          </span>
          <span className={`stoa-step__status stoa-step__status--${step.status}`}>
            <span className="stoa-step__symbol" aria-hidden="true">
              {SYMBOL[step.status]}
            </span>{" "}
            {messages.stepStatus[step.status]}
          </span>
        </div>
        {step.explanation && <div className="stoa-step__explanation">{step.explanation}</div>}
        {step.progress !== undefined && (
          <ProgressBar className="stoa-step__progress" aria-labelledby={titleId} value={step.progress * 100}>
            {({ percentage, valueText }) => (
              <>
                <span className="stoa-step__track">
                  <span className="stoa-step__fill" style={{ inlineSize: `${percentage ?? 0}%` }} />
                </span>
                <span className="stoa-step__value">{valueText}</span>
              </>
            )}
          </ProgressBar>
        )}
        {step.actions && <div className="stoa-step__actions">{step.actions}</div>}
      </div>
    </>
  );
}

const textOf = (step: Step) => step.textValue ?? (typeof step.title === "string" ? step.title : step.id);

/** Numbered steps, each with a status shown as a symbol and a word, a
 * title, and optionally an explanation, its own actions and its progress.
 * A running step's symbol pulses, on the motion tokens, and stands still
 * under reduced motion. With `reorderable`, the steps sit in a
 * ReorderableList. */
export function StepList({ label, steps, reorderable = false, onReorder, onRemove }: StepListProps) {
  if (reorderable) {
    const items = steps.map((step) => ({ id: step.id, textValue: textOf(step), step }));
    return (
      <ReorderableList
        label={label}
        items={items}
        onReorder={(next) => onReorder?.(next.map((item) => item.step))}
        onRemove={onRemove && ((item) => onRemove(item.step))}
        itemClassName={(item) => `stoa-step stoa-step--${item.step.status}`}
        renderItem={(item, index) => (
          <div className="stoa-steps__row">
            <StepBody step={item.step} index={index} />
          </div>
        )}
      />
    );
  }
  return (
    <ol className="stoa-steps" aria-label={label}>
      {steps.map((step, index) => (
        <li key={step.id} className={`stoa-step stoa-step--${step.status}`}>
          <StepBody step={step} index={index} />
        </li>
      ))}
    </ol>
  );
}
