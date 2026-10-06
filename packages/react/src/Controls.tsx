import { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, type ChangeEvent, type KeyboardEvent, type ReactElement, type ReactNode, type Ref } from "react";
import { mergeProps, useFocusRing, useHover, usePress } from "react-aria";
import { Chevron } from "./Chevron";
import { ariaKeyShortcuts, isApplePlatform, Kbd, shortcutKeys, type Shortcut } from "./Shortcuts";
import { useStoaFormat } from "./locale";
import {
  Button as AriaButton,
  Group,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  NumberField as AriaNumberField,
  NumberFieldStateContext,
  Popover,
  Select as AriaSelect,
  SelectValue,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  ToggleButton,
  type ButtonProps as AriaButtonProps,
  type Key,
  useLocale,
} from "react-aria-components";

/** `default` is a bordered button; `primary` the one main action of a view,
 * on the accent fill; `secondary` a quieter action on the sunken surface,
 * without a border; `ghost` an action with no fill or border until hovered
 * (in a toolbar, for example); `danger` an action that destroys or cannot
 * be undone, on the falling colour. Say what the danger is in the label
 * ("Delete 3 orders"): the colour is not the only sign. */
export type ButtonProps = AriaButtonProps & {
  variant?: "default" | "primary" | "secondary" | "ghost" | "danger";
  /** "small" matches the small ChoiceGroup, Select and FilterChip, for a
   * toolbar or a header; still at least 24 px tall (WCAG 2.5.8). */
  size?: ControlSize;
  /** The keyboard shortcut that does what the button does (registered
   * with `useShortcuts`, for example): drawn after the label with Kbd,
   * hidden from assistive technology, and given to it as
   * `aria-keyshortcuts`, so the button's name stays its label. */
  shortcut?: Pick<Shortcut, "key" | "modifiers">;
  /** The shortcut in ARIA's own words ("Control+K"), for a shortcut the
   * button does not draw; `shortcut` sets it otherwise. */
  "aria-keyshortcuts"?: string;
};

/** An action. Its label says what it does; `shortcut` adds the key that
 * does the same, shown and announced. */
export function Button({
  variant = "default",
  size = "regular",
  className,
  shortcut,
  "aria-keyshortcuts": keyShortcuts,
  render,
  children,
  ...rest
}: ButtonProps) {
  const { messages } = useStoaFormat();
  const sized = size === "small" ? " stoa-button--small" : "";
  const apple = isApplePlatform();
  const aria = keyShortcuts ?? (shortcut ? ariaKeyShortcuts(shortcut, apple) : undefined);
  const hint = shortcut && (
    <span className="stoa-button__shortcut" aria-hidden="true">
      <Kbd keys={shortcutKeys(shortcut, apple, messages)} />
    </span>
  );
  const content: AriaButtonProps["children"] =
    hint === undefined
      ? children
      : typeof children === "function"
        ? (values) => (
            <>
              <span className="stoa-button__label">{children(values)}</span>
              {hint}
            </>
          )
        : (
            <>
              <span className="stoa-button__label">{children}</span>
              {hint}
            </>
          );
  return (
    <AriaButton
      {...rest}
      className={`stoa-button stoa-button--${variant}${sized} ${className ?? ""}`.trim()}
      // React Aria's Button passes on only the attributes it knows, and
      // aria-keyshortcuts is not one of them: it is set on the element here.
      render={
        aria === undefined
          ? render
          : (props, values) => {
              const own = { ...props, "aria-keyshortcuts": aria };
              return render ? render(own, values) : <button {...own} />;
            }
      }
    >
      {content}
    </AriaButton>
  );
}

export type Choice<T extends Key> = { id: T; label: ReactNode };

/** "small" is for toolbars and headers: smaller type and padding, still
 * at least 24 px tall (WCAG 2.5.8). */
export type ControlSize = "regular" | "small";

/** The visible label and description of a group of buttons, and the
 * attributes that tie them to it. With `hideLabel` the label names the
 * group for assistive technology only. */
export function useGroupLabel(label: string, hideLabel: boolean, description: ReactNode | undefined) {
  const labelId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null && description !== "";
  return {
    groupProps: {
      "aria-label": hideLabel ? label : undefined,
      "aria-labelledby": hideLabel ? undefined : labelId,
      "aria-describedby": hasDescription ? descriptionId : undefined,
    },
    /** The group, inside its label and description when it has them. */
    frame: (group: ReactElement) =>
      hideLabel && !hasDescription ? (
        group
      ) : (
        <div className="stoa-group-field">
          {!hideLabel && (
            <span id={labelId} className="stoa-field__label">
              {label}
            </span>
          )}
          {group}
          {hasDescription && (
            <span id={descriptionId} className="stoa-field__description">
              {description}
            </span>
          )}
        </div>
      ),
  };
}

export type ChoiceGroupProps<T extends Key> = {
  /** Names the group, shown above it. */
  label: string;
  /** Keep the label for assistive technology only, where the options
   * name themselves (a theme or language switch in a header, for
   * example). */
  hideLabel?: boolean;
  /** A line under the group, read as its description: what the choice
   * changes, or why it is disabled. */
  description?: ReactNode;
  /** No option can be chosen; the chosen one stays shown. */
  isDisabled?: boolean;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: ControlSize;
};

/** One option of a ChoiceGroup: a button with the radio role, drawn as a
 * segment of the group. React Aria's hooks give it the same press, hover
 * and focus-ring states as Stoa's other buttons. */
function ChoiceOption({
  checked,
  isDisabled,
  tabStop,
  onSelect,
  onKeyDown,
  buttonRef,
  children,
}: {
  checked: boolean;
  isDisabled: boolean;
  tabStop: boolean;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  const { pressProps, isPressed } = usePress({ isDisabled, onPress: onSelect });
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();
  return (
    <button
      {...mergeProps(pressProps, hoverProps, focusProps, { onKeyDown })}
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={isDisabled}
      tabIndex={tabStop ? 0 : -1}
      className="stoa-button stoa-choice"
      data-selected={checked || undefined}
      data-pressed={isPressed || undefined}
      data-hovered={isHovered || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}
    >
      {children}
    </button>
  );
}

/** One of a few options (for example a playback speed), as a radio group
 * drawn as one segmented control. It is one tab stop, on the chosen
 * option; the arrow keys move to the next or previous option and choose
 * it, wrapping at the ends, mirrored in a right-to-left locale; Space or
 * Enter, or a press, chooses the focused option. */
export function ChoiceGroup<T extends Key>({
  label,
  hideLabel = false,
  description,
  isDisabled = false,
  choices,
  value,
  onChange,
  size = "regular",
}: ChoiceGroupProps<T>) {
  const { groupProps, frame } = useGroupLabel(label, hideLabel, description);
  const { direction } = useLocale();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen = choices.findIndex((c) => c.id === value);
  // The tab stop: the chosen option, or the first when none is.
  const stop = chosen < 0 ? 0 : chosen;

  const choose = (index: number) => {
    const choice = choices[index];
    if (!choice) return;
    if (choice.id !== value) onChange(choice.id);
    buttons.current[index]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (isDisabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const next = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const previous = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    const count = choices.length;
    if (e.key === next || e.key === "ArrowDown") choose((index + 1) % count);
    else if (e.key === previous || e.key === "ArrowUp") choose((index - 1 + count) % count);
    else return;
    e.preventDefault();
  };

  return frame(
    <div {...groupProps} role="radiogroup" aria-disabled={isDisabled || undefined} className={`stoa-choice-group stoa-choice-group--${size}`}>
      {choices.map((c, index) => (
        <ChoiceOption
          key={String(c.id)}
          checked={c.id === value}
          isDisabled={isDisabled}
          tabStop={index === stop}
          onSelect={() => choose(index)}
          onKeyDown={(e) => onKeyDown(e, index)}
          buttonRef={(el) => {
            buttons.current[index] = el;
          }}
        >
          {c.label}
        </ChoiceOption>
      ))}
    </div>,
  );
}

export type SelectProps<T extends Key> = {
  label: string;
  /** Keep the label for assistive technology only, where the options
   * name themselves (a view picker in a header, for example). */
  hideLabel?: boolean;
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: ControlSize;
};

/** One of several options in a drop-down list: for a choice with more
 * options, or less room, than a ChoiceGroup can show. Enter, Space or an
 * arrow key opens the list; typing a name selects the option it starts.
 *
 * Each option's text is isolated in the direction of its own first letter
 * (`dir="auto"`), in the list and in the button that shows the chosen one,
 * so "1 day" does not turn into "day 1" in a right-to-left page; it is
 * still aligned by the page's direction. */
export function Select<T extends Key>({ label, hideLabel = false, options, value, onChange, size = "regular" }: SelectProps<T>) {
  return (
    <AriaSelect
      className={`stoa-select stoa-select--${size}`}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(key as T);
      }}
    >
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label"}>{label}</Label>
      <AriaButton className="stoa-button stoa-select__button">
        <SelectValue className="stoa-select__value" />
        <Chevron className="stoa-select__chevron" />
      </AriaButton>
      <Popover className={`stoa-select__popover stoa-select__popover--${size}`} offset={4}>
        <ListBox className="stoa-select__list">
          {options.map((option) => (
            <ListBoxItem
              key={String(option.id)}
              id={option.id}
              className="stoa-select__option"
              textValue={typeof option.label === "string" ? option.label : String(option.id)}
            >
              {/* The button shows this same content for the chosen option. */}
              <span dir="auto">{option.label}</span>
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export type ToggleProps = {
  /** The name of the setting the toggle turns on ("Reduced motion"). */
  children: ReactNode;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  size?: ControlSize;
};

/** One setting turned on or off: a button that stays pressed while the
 * setting is on (aria-pressed), drawn like a chosen option when it is. */
export function Toggle({ children, isSelected, onChange, size = "regular" }: ToggleProps) {
  return (
    <ToggleButton
      isSelected={isSelected}
      onChange={onChange}
      className={`stoa-button stoa-choice stoa-toggle stoa-toggle--${size}`}
    >
      {children}
    </ToggleButton>
  );
}

export type TimeSliderProps = {
  /** Shown above the track. */
  label: string;
  /** Keep the label for assistive technology only, where the slider sits
   * under a visible name (a panel's title, for example). */
  hideLabel?: boolean;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  /** The value stopped moving: the drag was released or the key let go.
   * A caller that records history uses this to end one step. */
  onChangeEnd?: (value: number) => void;
  /** Text for the current value, shown and announced. */
  format: (value: number) => string;
  /** Ids of elements that describe the slider, announced with its value. */
  "aria-describedby"?: string;
  /** Show the formatted value beside the track. Off when a field next to
   * the slider already shows (and edits) the value; the value is still
   * announced. */
  showOutput?: boolean;
};

/** A time scrubber: keyboard steps, and the value read out as text.
 *
 * React Aria formats slider values only with Intl.NumberFormat; a time of
 * day needs its own text, so the thumb's input gets `aria-valuetext`
 * after each render. */
export function TimeSlider({
  label,
  hideLabel = false,
  min,
  max,
  step,
  value,
  onChange,
  onChangeEnd,
  format,
  "aria-describedby": describedBy,
  showOutput = true,
}: TimeSliderProps) {
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    input.current?.setAttribute("aria-valuetext", format(value));
  });
  return (
    <Slider
      className={showOutput ? "stoa-slider" : "stoa-slider stoa-slider--bare"}
      minValue={min}
      maxValue={max}
      step={step}
      value={value}
      onChange={(v) => onChange(v as number)}
      onChangeEnd={onChangeEnd && ((v) => onChangeEnd(v as number))}
      aria-describedby={describedBy}
    >
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label stoa-slider__label"}>{label}</Label>
      {showOutput && (
        <SliderOutput className="stoa-slider__output">{({ state }) => format(state.getThumbValue(0))}</SliderOutput>
      )}
      <SliderTrack className="stoa-slider__track">
        <SliderThumb className="stoa-slider__thumb" inputRef={input} />
      </SliderTrack>
    </Slider>
  );
}

export type NumberFieldProps = {
  label: string;
  /** Keep the label for assistive technology only, where the field sits
   * beside a visible name (a slider's heading, for example). */
  hideLabel?: boolean;
  value: number;
  /** Called with a committed number: on Enter, on leaving the field, or on
   * each arrow-key step. An emptied field reports nothing. */
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  /** The arrow keys' stride. A typed value is also rounded to the nearest
   * step (counted from `minValue`, or from 0) when it is committed, as
   * React Aria's NumberField does: with a step of 10000, a typed 500
   * becomes 0. Set `keepTypedValue` to keep what was typed. */
  step?: number;
  /** Keep a typed value as typed instead of rounding it to the step; it is
   * still clamped to `minValue` and `maxValue`, and the arrow keys still
   * move by `step`. For an amount that is usually changed in round steps
   * but may be any number. Off by default. */
  keepTypedValue?: boolean;
  /** A unit drawn after the number ("px"). Include it in `label` too: the
   * drawn unit is hidden from assistive technology. */
  unit?: string;
  size?: ControlSize;
  "aria-describedby"?: string;
};

const LATIN_DIGIT = /[0-9.]/;

/** For a locale tag that fixes its numbering system ("ar-u-nu-arab"), a
 * function that rewrites typed Latin digits, and "." as the decimal
 * separator, in the locale's own; null when the locale writes Latin
 * digits. React Aria's number parser tries other numbering systems only
 * when the tag does not fix one, so without this a person on a Latin
 * keyboard layout could not type a number at all. */
function typedDigits(locale: string): ((text: string) => string) | null {
  if (!locale.includes("-nu-")) return null;
  const plain = new Intl.NumberFormat(locale, { useGrouping: false });
  const map = new Map<string, string>(Array.from({ length: 10 }, (_, d) => [String(d), plain.format(d)]));
  if (map.get("0") === "0") return null;
  const point = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).formatToParts(1.5).find((part) => part.type === "decimal")?.value;
  if (point) map.set(".", point);
  return (text) => (LATIN_DIGIT.test(text) ? text.replace(/[0-9.]/g, (character) => map.get(character) ?? character) : text);
}

/** The field's input. Under a locale with its own digits, digits typed in
 * Latin are written in the locale's as they are typed: in the browser
 * before the input changes (React Aria refuses the Latin text in its own
 * beforeinput listener, which this one runs ahead of), and on a change
 * that arrives without a beforeinput event (a test, an autofill). */
function NumberInput({ unit }: { unit?: string }) {
  const { locale } = useLocale();
  const state = useContext(NumberFieldStateContext);
  const toLocal = useMemo(() => typedDigits(locale), [locale]);
  const group = useRef<HTMLDivElement>(null);
  const latest = useRef({ state, toLocal });
  useLayoutEffect(() => {
    latest.current = { state, toLocal };
  });

  useEffect(() => {
    const box = group.current;
    if (!box || !toLocal) return;
    // Capture, on the group: it runs before React Aria's listener on the
    // input itself.
    const onBeforeInput = (event: Event) => {
      const e = event as InputEvent;
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || e.data == null || !e.inputType.startsWith("insert")) return;
      const local = latest.current.toLocal?.(e.data) ?? e.data;
      if (local === e.data) return;
      e.preventDefault();
      // insertText keeps the browser's undo history and caret; it fires a
      // beforeinput of its own, with the locale's digits, which passes.
      if (input.ownerDocument.execCommand("insertText", false, local)) return;
      const { selectionStart: from, selectionEnd: to, value } = input;
      const next = value.slice(0, from ?? value.length) + local + value.slice(to ?? value.length);
      if (latest.current.state?.validate(next)) latest.current.state.setInputValue(next);
    };
    box.addEventListener("beforeinput", onBeforeInput, true);
    return () => box.removeEventListener("beforeinput", onBeforeInput, true);
  }, [toLocal]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const local = toLocal?.(raw) ?? raw;
    if (local !== raw && state && !state.validate(raw) && state.validate(local)) state.setInputValue(local);
  };

  return (
    <Group ref={group} className="stoa-number__group">
      <Input className="stoa-field__input stoa-field__input--mono stoa-number__input" onChange={onChange} />
      {unit && (
        <span className="stoa-number__unit" aria-hidden="true">
          {unit}
        </span>
      )}
    </Group>
  );
}

/** A number typed by hand, on React Aria: the arrow keys step it, and it
 * is formatted in the locale. Under a locale with its own digits
 * (Arabic-Indic in "ar-u-nu-arab"), digits typed on a Latin keyboard
 * layout are taken and shown in the locale's digits. */
export function NumberField({
  label,
  hideLabel = false,
  value,
  onChange,
  minValue,
  maxValue,
  step,
  keepTypedValue = false,
  unit,
  size = "regular",
  "aria-describedby": describedBy,
}: NumberFieldProps) {
  const clamp = (next: number) => Math.min(maxValue ?? Infinity, Math.max(minValue ?? -Infinity, next));
  return (
    <AriaNumberField
      className={`stoa-number stoa-number--${size}`}
      value={value}
      onChange={(next) => {
        if (Number.isFinite(next)) onChange(keepTypedValue ? clamp(next) : next);
      }}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      aria-describedby={describedBy}
      // React Aria's "validate" keeps the typed value and would report a
      // value off the step as invalid; here the step is only the arrow
      // keys' stride, and the range is applied by clamping above.
      {...(keepTypedValue ? { commitBehavior: "validate", validationBehavior: "aria", isInvalid: false } : {})}
    >
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label"}>{label}</Label>
      <NumberInput unit={unit} />
    </AriaNumberField>
  );
}
