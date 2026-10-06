import type { ReactNode, Ref } from "react";
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
  description?: string;
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
      {description && (
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

/** Tabs with arrow-key navigation (React Aria). With `keepMounted`, inactive
 * panels stay mounted (inert and hidden), so their state survives a switch. */
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
  return (
    <AriaTabs className="stoa-tabs" selectedKey={selected} onSelectionChange={(k: Key) => onChange?.(String(k))}>
      <TabList aria-label={label} className="stoa-tabs__list">
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
