import type { ReactNode } from "react";
import { Label, RadioButton, RadioField, RadioGroup as AriaRadioGroup, Text } from "react-aria-components";
import { FieldErrorMessage } from "./Form";

export type RadioOption<T extends string> = {
  /** What the option stands for, given back by `onChange`. */
  value: T;
  /** The option's name, beside its circle; part of the target. */
  label: ReactNode;
  /** A line under the label on what choosing it means ("The reply goes to
   * the signatory as drafted"), read as the option's description. */
  description?: ReactNode;
  isDisabled?: boolean;
};

export type RadioGroupProps<T extends string> = {
  /** The question the options answer, shown above them. */
  label: string;
  /** Keep the label for assistive technology only, where the group sits
   * under a visible heading that asks the same question. */
  hideLabel?: boolean;
  /** A line under the group, read as the group's description. */
  description?: ReactNode;
  options: RadioOption<T>[];
  /** The chosen option's value, or null while none is chosen. */
  value: T | null;
  onChange: (value: T) => void;
  /** "vertical" (the default) stacks the options; "horizontal" sets them
   * in a row that wraps, for a few short options. The arrow keys move in
   * both directions either way, mirrored right to left. */
  orientation?: "vertical" | "horizontal";
  isDisabled?: boolean;
  /** An answer is needed: announced as required. Whether the missing
   * answer is an error is the caller's to say, with `isInvalid`. */
  isRequired?: boolean;
  /** The choice cannot be used as it is (none chosen when one is needed,
   * for example): the group is marked invalid, each circle is drawn in the
   * falling colour, and `errorMessage` is shown under the group. */
  isInvalid?: boolean;
  /** What is wrong and how to put it right, shown while `isInvalid`, read
   * as part of the group's description and announced politely when it
   * appears. */
  errorMessage?: string;
};

/** One of several options, all shown, on React Aria's RadioGroup: a
 * labelled group of radio buttons, each with an optional description. It
 * is one tab stop, on the chosen option (or the first while none is);
 * the arrow keys move to the next or previous option and choose it,
 * mirrored in a right-to-left locale. For a few options that fit on one
 * line without descriptions, ChoiceGroup draws a segmented control. */
export function RadioGroup<T extends string>({
  label,
  hideLabel = false,
  description,
  options,
  value,
  onChange,
  orientation = "vertical",
  isDisabled,
  isRequired,
  isInvalid = false,
  errorMessage,
}: RadioGroupProps<T>) {
  const hasDescription = description !== undefined && description !== null && description !== false && description !== "";
  return (
    <AriaRadioGroup
      className={`stoa-radio-group stoa-radio-group--${orientation}`}
      value={value}
      onChange={(next) => onChange(next as T)}
      orientation={orientation}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
      validationBehavior="aria"
    >
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label"}>{label}</Label>
      <div className="stoa-radio-group__items">
        {options.map((option) => (
          <RadioField key={option.value} value={option.value} isDisabled={option.isDisabled} className="stoa-radio">
            <RadioButton className="stoa-radio__button">
              <span className="stoa-radio__circle" aria-hidden="true" />
              <span className="stoa-radio__label">{option.label}</span>
            </RadioButton>
            {option.description !== undefined && option.description !== null && option.description !== "" && (
              <Text slot="description" className="stoa-field__description stoa-radio__note">
                {option.description}
              </Text>
            )}
          </RadioField>
        ))}
      </div>
      {hasDescription && (
        <Text slot="description" className="stoa-field__description">
          {description}
        </Text>
      )}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
    </AriaRadioGroup>
  );
}
