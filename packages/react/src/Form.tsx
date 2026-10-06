import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import {
  FieldError,
  Input,
  Label,
  Tab as AriaTab,
  TabList,
  TabPanel,
  Tabs as AriaTabs,
  Text,
  TextField as AriaTextField,
  type Key,
} from "react-aria-components";

export type TextFieldProps = {
  /** The input element, for a caller that moves focus to it ("/" to
   * search, back to the field after an error). */
  ref?: Ref<HTMLInputElement>;
  /** Shown above the input. */
  label: string;
  /** Keep the label for assistive technology only, where the field sits
   * under a visible name (a search box in a panel's header, for
   * example). */
  hideLabel?: boolean;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  /** A line under the input that says what it takes ("Tick 0.01"), read
   * as the input's description. Text or nodes: a value in it can keep its
   * own direction (`Ltr`), a word its emphasis. Its text is what assistive
   * technology reads, so it holds no controls: a link or a button in it
   * would be read as plain words. */
  description?: ReactNode;
  placeholder?: string;
  /** Direction of the typed text; maths stays left to right in an RTL page. */
  dir?: "ltr" | "rtl" | "auto";
  /** The monospace face with tabular figures, for a value whose
   * characters must line up: a number or an amount, code, a line of
   * maths. Off by default: names, searches and prose take the sans face.
   * The monospace stack draws Arabic with Noto Sans Arabic, so a mono
   * field that may hold Arabic text needs that font loaded (without it
   * the browser falls back to a face that may not join the letters). */
  mono?: boolean;
  autoFocus?: boolean;
  /** Ids of further elements that describe the input, announced after
   * `description`. */
  "aria-describedby"?: string;
  /** "search" makes it a search box (role searchbox), for a field that
   * filters or finds. */
  type?: "text" | "search";
  /** The value cannot be used as it is: the input is marked invalid
   * (aria-invalid) and drawn in the falling colour, and `errorMessage` is
   * shown under it. */
  isInvalid?: boolean;
  /** What is wrong and how to put it right ("A view needs a name."),
   * shown while `isInvalid` and read as part of the input's description,
   * after `description`. The words carry the meaning; the colour repeats
   * it. */
  errorMessage?: string;
};

/** A labelled text input, in the sans face (`mono` for numbers, code and
 * maths). Enter can submit without a surrounding form. Validation is the
 * caller's: it decides when the value is invalid and says why in
 * `errorMessage` (React Aria's FieldError). */
export function TextField({
  ref,
  label,
  hideLabel = false,
  value,
  onChange,
  onEnter,
  description,
  placeholder,
  dir,
  mono = false,
  autoFocus,
  "aria-describedby": describedBy,
  type = "text",
  isInvalid = false,
  errorMessage,
}: TextFieldProps) {
  return (
    <AriaTextField
      className="stoa-field"
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      aria-describedby={describedBy}
      type={type}
      isInvalid={isInvalid}
      validationBehavior="aria"
    >
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label"}>{label}</Label>
      <Input
        ref={ref}
        className={mono ? "stoa-field__input stoa-field__input--mono" : "stoa-field__input"}
        placeholder={placeholder}
        dir={dir}
        spellCheck={false}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      {description !== undefined && description !== null && description !== false && description !== "" && (
        <Text slot="description" className="stoa-field__description">
          {description}
        </Text>
      )}
      <FieldError className="stoa-field__error">{errorMessage}</FieldError>
    </AriaTextField>
  );
}

export type StatusTone = "positive" | "negative" | "warning" | "neutral";

/** A short status with a symbol and a word, never colour alone. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  const symbol = { positive: "✓", negative: "✗", warning: "!", neutral: "·" }[tone];
  return (
    <span className={`stoa-badge stoa-badge--${tone}`}>
      <span aria-hidden="true">{symbol}</span> {children}
    </span>
  );
}

export type TabItem = { id: string; label: string; content: ReactNode };

/** Scrolls a row sideways the least distance that brings `item` clear of
 * its faded ends, without scrolling anything around the row. */
function revealInRow(row: HTMLElement, item: Element) {
  // The fade is as wide as the row's scroll padding (styles.css).
  const fade = parseFloat((row.ownerDocument.defaultView ?? window).getComputedStyle(row).scrollPaddingInlineStart) || 0;
  const box = row.getBoundingClientRect();
  const own = item.getBoundingClientRect();
  if (own.left < box.left + fade) row.scrollLeft -= box.left + fade - own.left;
  else if (own.right > box.right - fade) row.scrollLeft += own.right - (box.right - fade);
}

/** Which ends of a box that scrolls sideways hold content out of view, in
 * logical terms: "start", "end", both, or neither. Kept current as the box
 * scrolls or changes size. In a right-to-left box scrollLeft runs from 0
 * at the start to negative values toward the end. The item that takes the
 * focus, and the selected one at first, are scrolled into view. */
function useHiddenEdges(el: RefObject<HTMLElement | null>): string {
  const [edges, setEdges] = useState("");
  useEffect(() => {
    const node = el.current;
    const View = node?.ownerDocument.defaultView;
    if (!node || !View) return;
    const measure = () => {
      const max = node.scrollWidth - node.clientWidth;
      const at = Math.abs(node.scrollLeft);
      // A pixel of slack: zoomed pages scroll by fractions.
      const next = [at > 1 ? "start" : "", at < max - 1 ? "end" : ""].filter(Boolean).join(" ");
      setEdges(next);
    };
    const selected = node.querySelector('[aria-selected="true"]');
    if (selected) revealInRow(node, selected);
    measure();
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof View.Element && e.target !== node) revealInRow(node, e.target);
    };
    node.addEventListener("scroll", measure, { passive: true });
    node.addEventListener("focusin", onFocus);
    const observer = typeof View.ResizeObserver === "function" ? new View.ResizeObserver(measure) : null;
    observer?.observe(node);
    for (const child of node.children) observer?.observe(child);
    return () => {
      node.removeEventListener("scroll", measure);
      node.removeEventListener("focusin", onFocus);
      observer?.disconnect();
    };
  }, [el]);
  return edges;
}

/** Tabs with arrow-key navigation (React Aria). With `keepMounted`, inactive
 * panels stay mounted (inert and hidden), so their state survives a switch.
 *
 * Tabs that do not fit stay on one row, which scrolls sideways: the end
 * that hides tabs fades out, so it shows there are more, and the arrow
 * keys bring each tab into view as it takes the focus, as they always
 * did. */
export function Tabs({
  label,
  items,
  selected,
  onChange,
  keepMounted = false,
}: {
  label: string;
  items: TabItem[];
  selected?: string;
  onChange?: (id: string) => void;
  keepMounted?: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const hidden = useHiddenEdges(list);
  return (
    <AriaTabs className="stoa-tabs" selectedKey={selected} onSelectionChange={(k: Key) => onChange?.(String(k))}>
      <TabList ref={list} aria-label={label} className="stoa-tabs__list" data-hidden-edges={hidden || undefined}>
        {items.map((t) => (
          <AriaTab key={t.id} id={t.id} className="stoa-tabs__tab">
            {t.label}
          </AriaTab>
        ))}
      </TabList>
      {items.map((t) => (
        <TabPanel key={t.id} id={t.id} className="stoa-tabs__panel" shouldForceMount={keepMounted}>
          {t.content}
        </TabPanel>
      ))}
    </AriaTabs>
  );
}
