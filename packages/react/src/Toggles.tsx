import { useId, type ReactNode } from "react";
import {
  CheckboxButton,
  CheckboxField,
  CheckboxGroup as AriaCheckboxGroup,
  Label,
  SwitchButton,
  SwitchField,
  Text,
} from "react-aria-components";
import type { ControlSize } from "./Controls";

export type SwitchProps = {
  /** The setting the switch turns on, shown beside it ("Live updates"). */
  children: ReactNode;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  /** A line under the label on what the setting does, announced with it. */
  description?: ReactNode;
  isDisabled?: boolean;
  /** Why the switch cannot be changed now ("Needs a live feed"). Shown and
   * announced with the switch while it is disabled, so the state is
   * explained rather than only greyed out. */
  disabledReason?: ReactNode;
  size?: ControlSize;
};

/** A setting that takes effect at once, on or off: role switch on React
 * Aria, with its label beside the track. Space toggles it. For a choice
 * that is applied later with a form, use a Checkbox. */
export function Switch({ children, isSelected, onChange, description, isDisabled = false, disabledReason, size = "regular" }: SwitchProps) {
  const reasonId = useId();
  const showReason = isDisabled && disabledReason !== undefined;
  return (
    <SwitchField
      className={`stoa-switch stoa-switch--${size}`}
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-describedby={showReason ? reasonId : undefined}
    >
      <SwitchButton className="stoa-switch__button">
        <span className="stoa-switch__track" aria-hidden="true">
          <span className="stoa-switch__thumb" />
        </span>
        <span className="stoa-switch__label">{children}</span>
      </SwitchButton>
      {description && (
        <Text slot="description" className="stoa-field__description stoa-switch__note">
          {description}
        </Text>
      )}
      {showReason && (
        <span id={reasonId} className="stoa-field__description stoa-switch__note">
          {disabledReason}
        </span>
      )}
    </SwitchField>
  );
}

export type CheckboxProps = {
  children: ReactNode;
  /** On its own: whether it is checked, and the change. Inside a
   * CheckboxGroup the group holds both, and `value` names the box. */
  isSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
  value?: string;
  /** Neither checked nor unchecked: a box that stands for several others
   * of which only some are checked. Announced as mixed; pressing it
   * checks it. */
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  description?: ReactNode;
};

/** A box that is checked or not (or mixed), on React Aria. Space toggles
 * it; the label is part of the target. */
export function Checkbox({ children, isSelected, onChange, value, isIndeterminate, isDisabled, description }: CheckboxProps) {
  return (
    <CheckboxField
      className="stoa-checkbox"
      isSelected={isSelected}
      onChange={onChange}
      value={value}
      isIndeterminate={isIndeterminate}
      isDisabled={isDisabled}
    >
      <CheckboxButton className="stoa-checkbox__button">
        {({ isSelected: checked, isIndeterminate: mixed }) => (
          <>
            <span className="stoa-checkbox__box" aria-hidden="true">
              {(checked || mixed) && (
                <svg className="stoa-checkbox__mark" viewBox="0 0 16 16" width="12" height="12">
                  {mixed ? <path d="M3.5 8h9" /> : <path d="M3 8.5l3.2 3L13 4.5" />}
                </svg>
              )}
            </span>
            <span className="stoa-checkbox__label">{children}</span>
          </>
        )}
      </CheckboxButton>
      {description && (
        <Text slot="description" className="stoa-field__description stoa-checkbox__note">
          {description}
        </Text>
      )}
    </CheckboxField>
  );
}

export type CheckboxGroupProps = {
  /** The question the boxes answer, shown above them ("Show columns"). */
  label: string;
  /** Keep the label for assistive technology only, where the boxes sit
   * under a visible heading that asks the same question. */
  hideLabel?: boolean;
  /** The values of the checked boxes. */
  value: string[];
  onChange: (value: string[]) => void;
  description?: ReactNode;
  isDisabled?: boolean;
  /** Checkbox elements, each with a `value`. */
  children: ReactNode;
};

/** Several boxes answering one question, any number checked: a labelled
 * group. Each box is its own Tab stop, as native checkboxes are. */
export function CheckboxGroup({ label, hideLabel = false, value, onChange, description, isDisabled, children }: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup className="stoa-checkbox-group" value={value} onChange={onChange} isDisabled={isDisabled}>
      <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label"}>{label}</Label>
      <div className="stoa-checkbox-group__items">{children}</div>
      {description && (
        <Text slot="description" className="stoa-field__description">
          {description}
        </Text>
      )}
    </AriaCheckboxGroup>
  );
}
