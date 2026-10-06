import { useRef, type ReactNode } from "react";
import { Button } from "./Controls";
import { keepFocusInPlace } from "./focus";
import { VisuallyHidden } from "./LiveRegion";
import { useStoaFormat, type StoaMessages } from "./locale";

/** The tones of a callout or a toast. Info is drawn in the accent colour;
 * positive, warning and negative in the up, warning and down colours. */
export type FeedbackTone = "info" | "positive" | "warning" | "negative";

/** The symbol drawn for each tone, so the tone is told by shape as well as
 * colour. Hidden from assistive technology, which reads the tone word.
 * None is a letter of any script: a Latin "i" for info would be the one
 * Latin letter in an Arabic interface. */
export const TONE_SYMBOL: Record<FeedbackTone, string> = { info: "◆", positive: "✓", warning: "!", negative: "✗" };

/** The tone as a word, in the locale's language. */
export function toneWord(messages: StoaMessages, tone: FeedbackTone): string {
  return { info: messages.toneInfo, positive: messages.tonePositive, warning: messages.toneWarning, negative: messages.toneNegative }[tone];
}

export type CalloutProps = {
  tone?: FeedbackTone;
  /** A short line above the body, drawn in bold. */
  title?: ReactNode;
  /** What the callout says. */
  children: ReactNode;
  /** A control that acts on what the callout says, for example a Retry
   * Button; drawn below the body. */
  action?: ReactNode;
  /** "status" (the default) is a polite live region; "alert" interrupts
   * the screen reader, for a negative callout that appears after an
   * action; "none" for a static note that is part of the page. A live
   * region is only read out when its content changes after it is in the
   * document, so a callout that appears with its text is announced
   * reliably only with "alert". */
  role?: "status" | "alert" | "none";
  /** Shows a close button (named with the locale's "Dismiss") that calls
   * this; the caller removes the callout. Once it is gone, the focus moves
   * to the tab stop that stands where it was (keepFocusInPlace), not to
   * the page's body. */
  onDismiss?: () => void;
};

/** A message set into the page: an error with a retry, a notice about the
 * data, a note on what a view shows. The tone is a symbol, a word and a
 * colour, never colour alone: the symbol is drawn, the word is read by
 * assistive technology before the text. */
export function Callout({ tone = "info", title, children, action, role = "status", onDismiss }: CalloutProps) {
  const { messages } = useStoaFormat();
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} className={`stoa-callout stoa-callout--${tone}`} role={role === "none" ? undefined : role}>
      <span className={`stoa-tone-symbol stoa-tone-symbol--${tone}`} aria-hidden="true">
        {TONE_SYMBOL[tone]}
      </span>
      <div className="stoa-callout__body">
        <VisuallyHidden>{`${toneWord(messages, tone)}:`}</VisuallyHidden>
        {title && <p className="stoa-callout__title">{title}</p>}
        <div className="stoa-callout__text">{children}</div>
        {action && <div className="stoa-callout__action">{action}</div>}
      </div>
      {onDismiss && (
        <Button
          className="stoa-dismiss"
          aria-label={messages.dismiss}
          onPress={() => {
            if (root.current) keepFocusInPlace(root.current);
            onDismiss();
          }}
        >
          <span aria-hidden="true">×</span>
        </Button>
      )}
    </div>
  );
}
