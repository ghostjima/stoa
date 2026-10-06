import type { ReactNode } from "react";
import { Label, ProgressBar as AriaProgressBar } from "react-aria-components";
import { LiveRegion } from "./LiveRegion";
import { isolate, useStoaFormat } from "./locale";

export type SkeletonProps = {
  /** What is loading, announced once ("Loading trades"); the locale's
   * "Loading…" by default. */
  label?: string;
  /** The placeholder shapes: SkeletonLines and SkeletonBlock, sized like
   * the content they stand in for. Three lines of text by default. */
  children?: ReactNode;
};

/** A placeholder for content that is loading. The shapes are hidden from
 * assistive technology; the container announces one loading label instead.
 * The pulse uses the motion tokens, so it stops under reduced motion.
 * A region that holds the skeleton can add `aria-busy` itself. */
export function Skeleton({ label, children }: SkeletonProps) {
  const { messages } = useStoaFormat();
  return (
    <div className="stoa-skeleton">
      <LiveRegion>{label ?? messages.loading}</LiveRegion>
      <div className="stoa-skeleton__shapes" aria-hidden="true">
        {children ?? <SkeletonLines />}
      </div>
    </div>
  );
}

/** Placeholder text lines at the current font size and line height; the
 * last line is shorter, like the end of a paragraph. */
export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="stoa-skeleton__lines">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="stoa-skeleton__line" />
      ))}
    </div>
  );
}

/** A placeholder rectangle: a chart, a canvas, an image. `blockSize` is a
 * CSS length, for example `var(--stoa-space-12)` or the height of the
 * view it stands in for. */
export function SkeletonBlock({ blockSize }: { blockSize: string }) {
  return <span className="stoa-skeleton__block" style={{ blockSize }} />;
}

export type ProgressBarProps = {
  /** What is in progress ("Loading AAPL"). Required: it names the bar. */
  label: string;
  /** Progress so far, from 0 to `maxValue`. */
  value?: number;
  maxValue?: number;
  /** The total is unknown: the bar moves without a value (and stands still
   * under reduced motion). */
  isIndeterminate?: boolean;
  /** Formats an amount (bytes, rows) for the value text, which then reads
   * "value of maximum" in the locale's words. Without it, the value text is
   * a percentage in the locale's digits. */
  formatValue?: (value: number) => string;
};

/** Progress of a task, on React Aria's ProgressBar: a label, a value text
 * that is shown and announced, and a bar. */
export function ProgressBar({ label, value = 0, maxValue = 100, isIndeterminate = false, formatValue }: ProgressBarProps) {
  const { messages } = useStoaFormat();
  // Each amount is a directional isolate: "1.8 MB" inside an Arabic
  // sentence would otherwise be split and reordered by the bidi algorithm,
  // its unit drawn on the wrong side of its number.
  const valueLabel =
    formatValue && !isIndeterminate ? messages.progressOf(isolate(formatValue(value)), isolate(formatValue(maxValue))) : undefined;
  return (
    <AriaProgressBar
      className={`stoa-progress${isIndeterminate ? " stoa-progress--indeterminate" : ""}`}
      value={value}
      maxValue={maxValue}
      isIndeterminate={isIndeterminate}
      valueLabel={valueLabel}
    >
      {({ percentage, valueText }) => (
        <>
          <Label className="stoa-progress__label">{label}</Label>
          {/* In the direction of the words: "3.1 MB of 4.3 MB" in English
              stays in that order in a right-to-left frame. */}
          {!isIndeterminate && (
            <span className="stoa-progress__value" dir={messages.direction}>
              {valueText}
            </span>
          )}
          <span className="stoa-progress__track">
            <span className="stoa-progress__fill" style={isIndeterminate ? undefined : { inlineSize: `${percentage ?? 0}%` }} />
          </span>
        </>
      )}
    </AriaProgressBar>
  );
}
