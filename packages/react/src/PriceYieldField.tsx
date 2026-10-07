import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Label, NumberField as AriaNumberField, Text } from "react-aria-components";
import { NumberInput } from "./Controls";
import { FieldErrorMessage } from "./Form";
import { LiveRegion } from "./LiveRegion";
import { useStoaFormat, type PriceYieldSide } from "./locale";

export type { PriceYieldSide } from "./locale";

/** A bond order's price and yield, one typed and the other worked out
 * from it. */
export type PriceYieldValue = {
  /** Price in percent of face value; null while unknown. */
  price: number | null;
  /** Yield in percent; null while unknown. */
  yield: number | null;
  /** The field last typed in; the other is worked out from it. */
  source: PriceYieldSide;
};

/** What the caller's engine gives back: the other value, or why there is
 * none, in words for the person at the order ticket ("No yield: the
 * price is above the redemption value."). */
export type PriceYieldResult = number | { error: string };

/** Where the computation of the other value stands: "ready" (worked out,
 * or nothing to work out), "pending" (the engine has not answered yet) or
 * "error" (the engine gave a reason, or failed). */
export type PriceYieldStatus = "ready" | "pending" | "error";

export type PriceYieldFieldProps = {
  /** Names the pair ("Limit price"), shown above the two fields. */
  label: string;
  /** Keep the label for assistive technology only, where a visible
   * heading names the pair. */
  hideLabel?: boolean;
  /** A line under the pair, read as the group's description ("Accrued
   * interest is added to the price"). */
  description?: ReactNode;
  value: PriceYieldValue;
  /** Called when a field is typed in, with that field as the source and
   * the other value null until it is worked out; then, once the engine
   * answers, with the other value too. */
  onChange: (value: PriceYieldValue) => void;
  /** The engine: the yield, in percent, at a price in percent of face.
   * May answer at once or later (a worker, a wasm module). */
  yieldFromPrice: (price: number) => PriceYieldResult | Promise<PriceYieldResult>;
  /** The engine: the price, in percent of face, at a yield in percent. */
  priceFromYield: (yieldPercent: number) => PriceYieldResult | Promise<PriceYieldResult>;
  /** The fields' own labels; the locale's "Price, % of face value" and
   * "Yield, %" by default. Name the yield ("Yield to offer, %") when the
   * engine works out a particular one. */
  priceLabel?: string;
  yieldLabel?: string;
  /** Decimals shown, and kept: a typed value and a worked-out one are
   * rounded to them (2 by default for both). */
  priceDecimals?: number;
  yieldDecimals?: number;
  /** The arrow keys' stride, 0.01 by default for both. */
  priceStep?: number;
  yieldStep?: number;
  isDisabled?: boolean;
  /** Told each time the computation's status changes, so the caller can
   * hold its Submit while one is pending or failed. */
  onStatusChange?: (status: PriceYieldStatus) => void;
};

const other = (side: PriceYieldSide): PriceYieldSide => (side === "price" ? "yield" : "price");
const round = (value: number, decimals: number) => {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
};
const isPromise = <T,>(value: T | Promise<T>): value is Promise<T> =>
  typeof value === "object" && value !== null && typeof (value as Promise<T>).then === "function";

type State = { status: PriceYieldStatus; error: string | null; announcement: string };

/** One of the two fields: a React Aria NumberField in the locale's digits,
 * with the unit drawn after it and a line under it that says where its
 * value came from. */
function SideField({
  side,
  label,
  value,
  decimals,
  step,
  note,
  isSource,
  isPending,
  error,
  isDisabled,
  onCommit,
}: {
  side: PriceYieldSide;
  label: string;
  value: number | null;
  decimals: number;
  step: number;
  note: string;
  isSource: boolean;
  isPending: boolean;
  error: string | null;
  isDisabled?: boolean;
  onCommit: (side: PriceYieldSide, value: number | null) => void;
}) {
  return (
    <AriaNumberField
      className={`stoa-number stoa-price-yield__field${isSource ? " stoa-price-yield__field--source" : ""}${isPending ? " stoa-price-yield__field--pending" : ""}`}
      value={value ?? Number.NaN}
      onChange={(next) => onCommit(side, Number.isFinite(next) ? next : null)}
      formatOptions={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      step={step}
      isDisabled={isDisabled}
      isInvalid={error !== null}
      validationBehavior="aria"
    >
      <Label className="stoa-field__label">{label}</Label>
      <NumberInput unit="%" />
      {note && (
        <Text slot="description" className="stoa-field__description stoa-price-yield__note">
          {note}
        </Text>
      )}
      <FieldErrorMessage>{error ?? undefined}</FieldErrorMessage>
    </AriaNumberField>
  );
}

/** A bond order's price and yield as two linked numeric fields: typing in
 * one (on Enter, on leaving the field, or on an arrow-key step) works out
 * the other through the caller's engine. The field typed in is the
 * source, said in words under it ("Entered"), and the other says what it
 * was worked out from; while the engine works, the other field says so,
 * and an answer that arrives after a newer edit is
 * dropped. A reason the engine gives for having no answer is shown under
 * the source field, which is marked invalid. A worked-out value is
 * announced politely. Both fields are in the locale's digits, in the
 * numeric face, with the unit drawn after them; under a locale with its
 * own digits, digits typed in Latin are taken as NumberField takes them. */
export function PriceYieldField({
  label,
  hideLabel = false,
  description,
  value,
  onChange,
  yieldFromPrice,
  priceFromYield,
  priceLabel,
  yieldLabel,
  priceDecimals = 2,
  yieldDecimals = 2,
  priceStep = 0.01,
  yieldStep = 0.01,
  isDisabled,
  onStatusChange,
}: PriceYieldFieldProps) {
  const { messages, decimal } = useStoaFormat();
  const legendId = useId();
  const descriptionId = useId();
  const [state, setState] = useState<State>({ status: "ready", error: null, announcement: "" });
  const labels: Record<PriceYieldSide, string> = {
    price: priceLabel ?? messages.priceYieldPrice,
    yield: yieldLabel ?? messages.priceYieldYield,
  };
  const decimals: Record<PriceYieldSide, number> = { price: priceDecimals, yield: yieldDecimals };

  // The latest props, for an answer that arrives after a render.
  const latest = useRef({ onChange, onStatusChange, yieldFromPrice, priceFromYield, labels, decimals, value, messages, decimal });
  useLayoutEffect(() => {
    latest.current = { onChange, onStatusChange, yieldFromPrice, priceFromYield, labels, decimals, value, messages, decimal };
  });
  // Each edit takes a number; an answer to an older one is dropped.
  const edit = useRef(0);
  const lastStatus = useRef<PriceYieldStatus>("ready");

  const report = (next: State) => {
    setState(next);
    if (next.status !== lastStatus.current) {
      lastStatus.current = next.status;
      latest.current.onStatusChange?.(next.status);
    }
  };

  const commit = (side: PriceYieldSide, typed: number | null) => {
    const current = latest.current;
    const target = other(side);
    // Leaving a worked-out field without changing what it shows is not
    // an edit: React Aria reports the rounded value it shows.
    const shown = current.value[side];
    if (typed !== null && shown !== null && round(shown, current.decimals[side]) === round(typed, current.decimals[side])) return;
    if (typed === null && shown === null) return;
    const id = ++edit.current;
    const own = typed === null ? null : round(typed, current.decimals[side]);
    const pair = (computed: number | null): PriceYieldValue =>
      side === "price" ? { price: own, yield: computed, source: side } : { price: computed, yield: own, source: side };
    if (own === null) {
      current.onChange(pair(null));
      report({ status: "ready", error: null, announcement: "" });
      return;
    }
    const settle = (result: PriceYieldResult) => {
      if (id !== edit.current) return;
      const now = latest.current;
      if (typeof result === "number" && Number.isFinite(result)) {
        const computed = round(result, now.decimals[target]);
        now.onChange(pair(computed));
        report({
          status: "ready",
          error: null,
          announcement: `${now.labels[target]}: ${now.decimal(computed, now.decimals[target])}`,
        });
      } else {
        const reason = typeof result === "object" && result !== null && typeof result.error === "string" && result.error.trim() !== "" ? result.error : null;
        now.onChange(pair(null));
        report({ status: "error", error: reason ?? now.messages.priceYieldFailed(target), announcement: "" });
      }
    };
    let answer: PriceYieldResult | Promise<PriceYieldResult>;
    try {
      answer = side === "price" ? current.yieldFromPrice(own) : current.priceFromYield(own);
    } catch {
      // An exception's text is not words for a person: the locale's say
      // the value could not be worked out.
      settle({ error: "" });
      return;
    }
    if (isPromise(answer)) {
      current.onChange(pair(null));
      report({ status: "pending", error: null, announcement: "" });
      answer.then(settle, () => settle({ error: "" }));
    } else {
      settle(answer);
    }
  };

  const source = value.source;
  const target = other(source);
  const notes: Record<PriceYieldSide, string> = { price: "", yield: "" };
  if (value[source] !== null) notes[source] = messages.priceYieldEntered;
  if (state.status === "pending") notes[target] = messages.priceYieldPending(target);
  else if (state.status === "error") notes[target] = messages.priceYieldNone;
  else if (value[target] !== null && value[source] !== null) notes[target] = messages.priceYieldFrom(source);
  const hasDescription = description !== undefined && description !== null && description !== false && description !== "";

  return (
    <fieldset
      className="stoa-price-yield"
      aria-labelledby={legendId}
      aria-describedby={hasDescription ? descriptionId : undefined}
      disabled={isDisabled}
    >
      <legend id={legendId} className={hideLabel ? "stoa-visually-hidden" : "stoa-price-yield__label"}>
        {label}
      </legend>
      <div className="stoa-price-yield__fields">
        {(["price", "yield"] as const).map((side) => (
          <SideField
            key={side}
            side={side}
            label={labels[side]}
            value={value[side]}
            decimals={decimals[side]}
            step={side === "price" ? priceStep : yieldStep}
            note={notes[side]}
            isSource={side === source && value[side] !== null}
            isPending={side === target && state.status === "pending"}
            error={side === source && state.status === "error" ? state.error : null}
            isDisabled={isDisabled}
            onCommit={commit}
          />
        ))}
      </div>
      {hasDescription && (
        <p id={descriptionId} className="stoa-field__description stoa-price-yield__description">
          {description}
        </p>
      )}
      <LiveRegion>{state.announcement}</LiveRegion>
    </fieldset>
  );
}
