import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Controls";
import { StatusBadge, type StatusTone } from "./Form";
import { Ltr } from "./Ltr";
import { focusWhenReady, type FocusTarget } from "./focus";
import { useStoaFormat } from "./locale";
import type { Shortcut } from "./Shortcuts";

export type DetailIdentifier = {
  /** What the identifier is ("Case", "Account"). */
  label: string;
  /** The identifier itself ("Z-000104", "40817 810 0 0000 0012345"):
   * drawn left to right in the numeric face, in a page of either
   * direction. */
  value: string;
};

export type DetailBack = {
  /** Goes back: the caller's state change (closing the record, showing
   * the list). */
  onBack: () => void;
  /** Where the focus lands after Back: the element, its id, or a function
   * that finds it (the list's active row, drawn again once the record is
   * closed). Never the page's body: until the target is there, the focus
   * stays on a tab stop where Back was (focusWhenReady). */
  focusAfter: FocusTarget;
  /** The button's words; the locale's "Back" by default. */
  label?: string;
  /** The key that does the same, drawn in the button and given to
   * assistive technology (Button's `shortcut`). The caller registers it
   * (useShortcuts), with a handler that calls focusWhenReady with the same
   * target before `onBack`. */
  shortcut?: Pick<Shortcut, "key" | "modifiers">;
};

export type DetailHeaderProps = {
  /** What the record is ("Z-000104, Ivanova A. P."). */
  title: ReactNode;
  /** The title's heading level in the page's outline: 2 by default. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The heading's id, for a section that the title names
   * (`aria-labelledby`); one is made when it is left out. */
  titleId?: string;
  /** Moves the focus to the title when the header is first drawn, so the
   * next Tab starts in the record, never at the top of the page. Give
   * the header a `key` of the record to move it again when another record
   * opens in its place. */
  focusOnOpen?: boolean;
  /** Identifiers of the record, each with its label. */
  identifiers?: DetailIdentifier[];
  /** Where the record stands, as a StatusBadge: a symbol and a word. */
  status?: { tone: StatusTone; label: ReactNode };
  /** More about where it stands, beside the status: a Tag, a Countdown. */
  meta?: ReactNode;
  /** Controls for the record, at the end of the bar. */
  actions?: ReactNode;
  /** A Back button at the start of the bar. */
  back?: DetailBack;
};

/**
 * The bar at the top of a record opened from a list: Back, the record's
 * title as a heading (which can take the focus when the record opens),
 * its identifiers, its status, and its own actions. Back moves the focus
 * to a target the caller names (the row the record was opened from), not
 * to the page's body. The parts wrap onto more lines on a narrow screen;
 * right to left, the bar starts at the right and each identifier still
 * reads left to right.
 */
export function DetailHeader({ title, level = 2, titleId, focusOnOpen = false, identifiers = [], status, meta, actions, back }: DetailHeaderProps) {
  const { messages } = useStoaFormat();
  const ownId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const Heading = `h${level}` as const;
  useEffect(() => {
    if (focusOnOpen) heading.current?.focus();
    // Only when the header is first drawn: a new record remounts it.
  }, []);
  return (
    <div className="stoa-detail-header">
      {back && (
        <Button
          variant="ghost"
          shortcut={back.shortcut}
          onPress={(e) => {
            focusWhenReady(back.focusAfter, e.target);
            back.onBack();
          }}
        >
          {back.label ?? messages.back}
        </Button>
      )}
      <div className="stoa-detail-header__title">
        <Heading ref={heading} id={titleId ?? ownId} tabIndex={-1} className="stoa-detail-header__heading">
          {title}
        </Heading>
        {identifiers.length > 0 && (
          <dl className="stoa-detail-header__ids">
            {identifiers.map((id) => (
              <div key={id.label} className="stoa-detail-header__id">
                <dt>{id.label}</dt>
                <dd>
                  <Ltr mono>{id.value}</Ltr>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {(status || meta) && (
        <div className="stoa-detail-header__status">
          {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
          {meta}
        </div>
      )}
      {actions && <div className="stoa-detail-header__actions">{actions}</div>}
    </div>
  );
}
