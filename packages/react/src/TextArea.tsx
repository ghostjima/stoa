import { useCallback, useEffect, useId, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import { Label, Text, TextArea as AriaTextArea, TextField as AriaTextField } from "react-aria-components";
import { FieldErrorMessage } from "./Form";
import { LiveRegion } from "./LiveRegion";
import { useStoaFormat, type PluralCategory } from "./locale";

export type TextAreaProps = {
  /** The textarea element, for a caller that moves focus to it. */
  ref?: Ref<HTMLTextAreaElement>;
  /** Shown above the field. */
  label: string;
  /** Keep the label for assistive technology only, where the field sits
   * under a visible name that says the same. */
  hideLabel?: boolean;
  value: string;
  onChange: (v: string) => void;
  /** A line under the field that says what it takes ("Shown to the
   * signatory"), read as the field's description. Text or nodes; it holds
   * no controls, as TextField's. */
  description?: ReactNode;
  placeholder?: string;
  /** Direction of the typed text; "auto" follows its first letter. */
  dir?: "ltr" | "rtl" | "auto";
  /** Lines shown while the text is short, 3 by default. */
  rows?: number;
  /** The field grows with its text up to this many lines, 8 by default,
   * and scrolls after that. */
  maxRows?: number;
  /** The most characters the field takes, as the browser counts them for
   * the maxlength attribute (UTF-16 code units: a letter outside the basic
   * plane counts two). Sets a count under the field, read as part of its
   * description; the characters left are announced politely once they
   * are few. */
  maxLength?: number;
  /** The text cannot be used as it is: the field is marked invalid
   * (aria-invalid) and drawn in the falling colour, and `errorMessage` is
   * shown under it. Validation is the caller's, as in TextField. */
  isInvalid?: boolean;
  /** What is wrong and how to put it right, shown while `isInvalid`, read
   * as part of the field's description and announced politely when it
   * appears. */
  errorMessage?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  autoFocus?: boolean;
  /** Ids of further elements that describe the field, announced after
   * `description` and the count. */
  "aria-describedby"?: string;
};

/** From how many characters left the count is announced: a tenth of the
 * limit, and at least 10. */
function announceFrom(maxLength: number): number {
  return Math.max(10, Math.ceil(maxLength / 10));
}

/** Sets the textarea's height to fit its text, between `rows` and
 * `maxRows` lines, and lets it scroll only beyond `maxRows`. */
function fitRows(el: HTMLTextAreaElement, rows: number, maxRows: number) {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (!style) return;
  const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.45;
  const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  // scrollHeight is the content and the padding; the height property sets
  // the content box, or the border box when box-sizing says so.
  const outer = style.boxSizing === "border-box" ? padding + border : 0;
  el.style.blockSize = "auto";
  const content = el.scrollHeight - padding;
  const lines = Math.min(Math.max(content, line * rows), line * maxRows);
  el.style.blockSize = `${lines + outer}px`;
  // A pixel of slack: line heights in fractions round either way.
  el.style.overflowY = content > line * maxRows + 1 ? "auto" : "hidden";
}

/** Multi-line text, on React Aria's TextField: a labelled textarea with a
 * description, an error message and, with `maxLength`, a count of the
 * characters used. It grows with its text from `rows` to `maxRows`
 * lines, then scrolls; Enter starts a new line. */
export function TextArea({
  ref,
  label,
  hideLabel = false,
  value,
  onChange,
  description,
  placeholder,
  dir,
  rows = 3,
  maxRows = 8,
  maxLength,
  isInvalid = false,
  errorMessage,
  isDisabled,
  isReadOnly,
  autoFocus,
  "aria-describedby": describedBy,
}: TextAreaProps) {
  const { locale, messages, integer } = useStoaFormat();
  const countId = useId();
  const own = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      own.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  const top = Math.max(rows, maxRows);

  useLayoutEffect(() => {
    if (own.current) fitRows(own.current, rows, top);
  }, [value, rows, top]);

  // The width decides where lines wrap, and a face that arrives late
  // changes line heights: both refit, a frame later, so the height set
  // here is not itself reported back as a change.
  useEffect(() => {
    const el = own.current;
    const View = el?.ownerDocument.defaultView;
    if (!el || !View || typeof View.ResizeObserver !== "function") return;
    let width = el.clientWidth;
    let frame = 0;
    const observer = new View.ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      View.cancelAnimationFrame(frame);
      frame = View.requestAnimationFrame(() => fitRows(el, rows, top));
    });
    observer.observe(el);
    const fonts = el.ownerDocument.fonts;
    const refit = () => fitRows(el, rows, top);
    fonts?.addEventListener?.("loadingdone", refit);
    return () => {
      observer.disconnect();
      View.cancelAnimationFrame(frame);
      fonts?.removeEventListener?.("loadingdone", refit);
    };
  }, [rows, top]);

  const counted = maxLength !== undefined && maxLength > 0;
  const used = value.length;
  const left = counted ? maxLength - used : 0;
  const remaining = Math.max(0, left);
  // Said once the characters left are few; nothing before that.
  const announcement =
    counted && remaining <= announceFrom(maxLength)
      ? messages.textLeft(integer(remaining), new Intl.PluralRules(locale).select(remaining) as PluralCategory)
      : "";
  const hasDescription = description !== undefined && description !== null && description !== false && description !== "";
  const extra = [counted ? countId : undefined, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <AriaTextField
      className="stoa-field stoa-textarea"
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      aria-describedby={extra}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      maxLength={counted ? maxLength : undefined}
      validationBehavior="aria"
    >
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label"}>{label}</Label>
      <AriaTextArea
        ref={setRef}
        className="stoa-field__input stoa-textarea__input"
        placeholder={placeholder}
        dir={dir}
        rows={rows}
      />
      {(hasDescription || counted) && (
        <div className="stoa-textarea__foot">
          {hasDescription && (
            <Text slot="description" className="stoa-field__description">
              {description}
            </Text>
          )}
          {counted && (
            <span className="stoa-textarea__count" data-full={left <= 0 || undefined}>
              {/* Drawn as "120/500"; read as words. */}
              <span aria-hidden="true">
                <bdi>{`${integer(used)}/${integer(maxLength)}`}</bdi>
              </span>
              <span id={countId} className="stoa-visually-hidden">
                {messages.textCount(integer(used), integer(maxLength))}
              </span>
            </span>
          )}
        </div>
      )}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
      {counted && <LiveRegion announceEvery={1000}>{announcement}</LiveRegion>}
    </AriaTextField>
  );
}
