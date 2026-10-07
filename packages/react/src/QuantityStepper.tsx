import { useState, type ReactNode } from "react";
import { Button as AriaButton, Label, NumberField as AriaNumberField, Text } from "react-aria-components";
import { NumberInput } from "./Controls";
import { FieldErrorMessage } from "./Form";
import { LiveRegion } from "./LiveRegion";
import { useStoaFormat, type PluralCategory } from "./locale";

export type QuantityStepperProps = {
  /** Shown above the field ("Quantity, lots"). */
  label: string;
  /** Keep the label for assistive technology only, where a visible
   * heading names the field. */
  hideLabel?: boolean;
  /** The order's size, in lots. */
  value: number;
  /** Called with a committed number of lots: on a press of − or +, an
   * arrow-key step, Enter, or on leaving the field. An emptied field
   * reports nothing. */
  onChange: (lots: number) => void;
  /** Fewest lots, 1 by default. */
  min?: number;
  /** Most lots, if there is a limit. */
  max?: number;
  /** Lots per press or arrow key, 1 by default. A typed number, and a
   * `value` off the step, are rounded to it, counted from `min`, as React
   * Aria's NumberField does: with a step of 10 from 1, 150 shows as 151. */
  step?: number;
  /** Bonds in one lot: said in words under the field, with the order's
   * size in lots and in bonds. */
  lotSize: number;
  /** A line after the lot's words, read as part of the description. */
  description?: ReactNode;
  isDisabled?: boolean;
  /** The quantity cannot be used as it is (more than the book holds, for
   * example): the input is marked invalid and `errorMessage` is shown
   * under it. Validation is the caller's, as in NumberField. */
  isInvalid?: boolean;
  errorMessage?: string;
};

/** An order's size in lots: a number field between a − and a + button,
 * on React Aria's NumberField. The arrow keys step it (Page Up and Page
 * Down by ten steps, Home and End to the limits), and the buttons, which
 * Tab skips as the keys do the same, are named "Decrease" and "Increase"
 * with the field's label in the locale's words. Under the field the lot's
 * size, the order's size in lots and in bonds and the limits are said in
 * words and read as its description; after a change the size in lots and
 * bonds is announced politely. Digits in the locale's, tabular. */
export function QuantityStepper({
  label,
  hideLabel = false,
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  lotSize,
  description,
  isDisabled,
  isInvalid,
  errorMessage,
}: QuantityStepperProps) {
  const { locale, messages, integer } = useStoaFormat();
  // Announced only after a change made here, not when the field appears.
  const [changed, setChanged] = useState(false);
  const plural = (n: number) => new Intl.PluralRules(locale).select(n) as PluralCategory;
  const lots = Number.isFinite(value) ? value : 0;
  const bonds = lots * lotSize;
  const total = messages.lotTotal(integer(lots), plural(lots), integer(bonds), plural(bonds));
  const words = [messages.lotSize(integer(lotSize), plural(lotSize)), `${total}.`, max !== undefined ? messages.lotRange(integer(min), integer(max)) : ""]
    .filter(Boolean)
    .join(" ");
  const hasDescription = description !== undefined && description !== null && description !== false && description !== "";
  return (
    <AriaNumberField
      className="stoa-number stoa-stepper"
      value={value}
      onChange={(next) => {
        if (!Number.isFinite(next)) return;
        setChanged(true);
        onChange(next);
      }}
      minValue={min}
      maxValue={max}
      step={step}
      formatOptions={{ maximumFractionDigits: 0 }}
      isDisabled={isDisabled}
      {...(isInvalid !== undefined ? { validationBehavior: "aria" as const, isInvalid } : {})}
    >
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label"}>{label}</Label>
      <NumberInput
        start={
          <AriaButton slot="decrement" className="stoa-button stoa-stepper__button">
            <span aria-hidden="true">−</span>
          </AriaButton>
        }
        end={
          <AriaButton slot="increment" className="stoa-button stoa-stepper__button">
            <span aria-hidden="true">+</span>
          </AriaButton>
        }
      />
      <Text slot="description" className="stoa-field__description stoa-stepper__note">
        {words}
        {hasDescription && <> {description}</>}
      </Text>
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
      <LiveRegion>{changed ? total : ""}</LiveRegion>
    </AriaNumberField>
  );
}
