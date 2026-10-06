import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { Label, Slider as AriaSlider, SliderOutput, SliderThumb, SliderTrack, useLocale } from "react-aria-components";
import type { ControlSize } from "./Controls";

export type SliderProps = {
  /** Shown above the track, with the value at the other end of the line. */
  label: string;
  /** Keep the label for assistive technology only, where the slider sits
   * under a visible name; the value stays shown. */
  hideLabel?: boolean;
  value: number;
  onChange: (value: number) => void;
  /** The value stopped moving: the drag was released or the key let go. */
  onChangeEnd?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Text for a value ("25 %", "12 levels"), shown and announced as the
   * value (aria-valuetext). Without it the number is written in the
   * locale's digits. */
  format?: (value: number) => string;
  /** A line under the track on what the value does, announced with it. */
  hint?: ReactNode;
  isDisabled?: boolean;
  size?: ControlSize;
};

/** A number picked on a track, on React Aria: arrow keys step it, Page Up
 * and Page Down take bigger steps, Home and End go to the ends, and the
 * keys follow the reading direction in a right-to-left locale. The part of
 * the track up to the thumb is filled.
 *
 * React Aria formats slider values only with Intl.NumberFormat, so a
 * `format` reaches the thumb's input as `aria-valuetext` after each
 * render, as TimeSlider does it. */
export function Slider({
  label,
  hideLabel = false,
  value,
  onChange,
  onChangeEnd,
  min = 0,
  max = 100,
  step = 1,
  format,
  hint,
  isDisabled = false,
  size = "regular",
}: SliderProps) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const { direction } = useLocale();
  useLayoutEffect(() => {
    if (format) input.current?.setAttribute("aria-valuetext", format(value));
  });
  return (
    <AriaSlider
      className={`stoa-range stoa-range--${size}`}
      minValue={min}
      maxValue={max}
      step={step}
      value={value}
      onChange={(v) => onChange(v as number)}
      onChangeEnd={onChangeEnd && ((v) => onChangeEnd(v as number))}
      isDisabled={isDisabled}
      aria-describedby={hint ? hintId : undefined}
    >
      <div className="stoa-range__head">
        <Label className={hideLabel ? "stoa-visually-hidden" : "stoa-field__label stoa-range__label"}>{label}</Label>
        <SliderOutput className="stoa-range__output">
          {({ state }) => (format ? format(state.getThumbValue(0)) : state.getThumbValueLabel(0))}
        </SliderOutput>
      </div>
      {/* React Aria places the thumb by the locale's direction, not the
          page's. The track takes the locale's direction too, so the fill
          (placed by logical properties against the track) meets the thumb
          even where the page and the locale disagree. */}
      <SliderTrack className="stoa-slider__track stoa-range__track" dir={direction}>
        {({ state }) => (
          <>
            <span className="stoa-range__fill" style={{ inlineSize: `${state.getThumbPercent(0) * 100}%` }} />
            <SliderThumb className="stoa-slider__thumb stoa-range__thumb" inputRef={input} />
          </>
        )}
      </SliderTrack>
      {hint && (
        <span id={hintId} className="stoa-field__description">
          {hint}
        </span>
      )}
    </AriaSlider>
  );
}
