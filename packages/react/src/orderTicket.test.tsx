// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, PriceYieldField, QuantityStepper, type PriceYieldResult, type PriceYieldStatus, type PriceYieldValue } from "./index";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const describedBy = (element: Element) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

/** A toy engine: the yield is 200 minus the price, and back. */
const SYNC = {
  yieldFromPrice: (price: number): PriceYieldResult => (price > 150 ? { error: "No yield above 150." } : 200 - price),
  priceFromYield: (y: number): PriceYieldResult => 200 - y,
};

type Engine = {
  yieldFromPrice: (price: number) => PriceYieldResult | Promise<PriceYieldResult>;
  priceFromYield: (y: number) => PriceYieldResult | Promise<PriceYieldResult>;
};

function Ticket({
  engine = SYNC,
  initial = { price: 98.5, yield: 101.5, source: "price" },
  onChange,
  onStatusChange,
}: {
  engine?: Engine;
  initial?: PriceYieldValue;
  onChange?: (v: PriceYieldValue) => void;
  onStatusChange?: (s: PriceYieldStatus) => void;
}) {
  const [value, setValue] = useState<PriceYieldValue>(initial);
  return (
    <PriceYieldField
      label="Limit price"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      onStatusChange={onStatusChange}
      {...engine}
    />
  );
}

const type = (input: HTMLElement, text: string) => {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
};

describe("PriceYieldField", () => {
  it("is a group named by its label, with a price and a yield field in the locale's words and digits", () => {
    render(<Ticket />);
    expect(screen.getByRole("group", { name: "Limit price" })).toBeTruthy();
    const price = screen.getByRole("textbox", { name: "Price, % of face value" }) as HTMLInputElement;
    const yieldField = screen.getByRole("textbox", { name: "Yield, %" }) as HTMLInputElement;
    expect(price.value).toBe("98.50");
    expect(yieldField.value).toBe("101.50");
    expect(price.className).toContain("stoa-field__input--mono");
    // Where each value came from, read as each field's description.
    expect(describedBy(price)).toEqual(["Entered"]);
    expect(describedBy(yieldField)).toEqual(["Calculated from the price"]);
  });

  it("works out the yield from a typed price, and the price from a typed yield, marking the source", () => {
    const onChange = vi.fn();
    render(<Ticket onChange={onChange} />);
    const price = screen.getByRole("textbox", { name: "Price, % of face value" });
    const yieldField = screen.getByRole("textbox", { name: "Yield, %" }) as HTMLInputElement;
    type(price, "97.25");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ price: 97.25, yield: 102.75, source: "price" });
    expect(yieldField.value).toBe("102.75");
    type(yieldField, "120");
    expect(onChange).toHaveBeenLastCalledWith({ price: 80, yield: 120, source: "yield" });
    expect(describedBy(yieldField)).toEqual(["Entered"]);
    expect(describedBy(screen.getByRole("textbox", { name: "Price, % of face value" }))).toEqual(["Calculated from the yield"]);
    expect(yieldField.closest(".stoa-price-yield__field")?.className).toContain("stoa-price-yield__field--source");
  });

  it("announces a worked-out value politely", () => {
    vi.useFakeTimers();
    render(<Ticket />);
    type(screen.getByRole("textbox", { name: "Price, % of face value" }), "99");
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole("status").textContent).toBe("Yield, %: 101.00");
  });

  it("rounds the typed and the worked-out values to their decimals", () => {
    const onChange = vi.fn();
    render(<Ticket onChange={onChange} engine={{ yieldFromPrice: () => 14.23456, priceFromYield: () => 1 }} />);
    type(screen.getByRole("textbox", { name: "Price, % of face value" }), "97.123");
    expect(onChange).toHaveBeenLastCalledWith({ price: 97.12, yield: 14.23, source: "price" });
  });

  it("does not treat leaving a worked-out field unchanged as an edit", () => {
    const onChange = vi.fn();
    const engine = { yieldFromPrice: vi.fn(() => 14.23456), priceFromYield: vi.fn(() => 1) };
    render(<Ticket onChange={onChange} engine={engine} initial={{ price: 97.12, yield: 14.23456, source: "price" }} />);
    const yieldField = screen.getByRole("textbox", { name: "Yield, %" });
    act(() => yieldField.focus());
    fireEvent.blur(yieldField);
    fireEvent.keyDown(yieldField, { key: "Enter" });
    expect(engine.priceFromYield).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the engine's reason under the typed field, which is marked invalid, and says the other was not worked out", () => {
    const status = vi.fn();
    const onChange = vi.fn();
    render(<Ticket onChange={onChange} onStatusChange={status} />);
    const price = screen.getByRole("textbox", { name: "Price, % of face value" });
    type(price, "160");
    expect(price.getAttribute("aria-invalid")).toBe("true");
    expect(describedBy(price)).toEqual(["Entered", "No yield above 150."]);
    expect(describedBy(screen.getByRole("textbox", { name: "Yield, %" }))).toEqual(["Not calculated"]);
    expect(onChange).toHaveBeenLastCalledWith({ price: 160, yield: null, source: "price" });
    expect(status).toHaveBeenLastCalledWith("error");
    // Put right: the error goes.
    type(price, "100");
    expect(price.getAttribute("aria-invalid")).toBeNull();
    expect(status).toHaveBeenLastCalledWith("ready");
  });

  it("says in the locale's words that the value could not be worked out when the engine throws, never the exception's text", () => {
    render(
      <Ticket
        engine={{
          yieldFromPrice: () => {
            throw new Error("wasm trap: unreachable");
          },
          priceFromYield: () => 1,
        }}
      />,
    );
    const price = screen.getByRole("textbox", { name: "Price, % of face value" });
    type(price, "99");
    expect(describedBy(price)).toEqual(["Entered", "The yield could not be calculated."]);
    expect(document.body.textContent).not.toContain("wasm");
  });

  it("while an engine that answers later works, says so, reports pending, and drops an answer overtaken by a newer edit", async () => {
    vi.useFakeTimers();
    const later = (value: number, ms: number) => new Promise<PriceYieldResult>((resolve) => setTimeout(() => resolve(value), ms));
    const engine = { yieldFromPrice: (p: number) => later(p === 90 ? 10 : 20, p === 90 ? 2000 : 500), priceFromYield: () => later(1, 10) };
    const status = vi.fn();
    const onChange = vi.fn();
    render(<Ticket engine={engine} onChange={onChange} onStatusChange={status} />);
    const price = screen.getByRole("textbox", { name: "Price, % of face value" });
    const yieldField = screen.getByRole("textbox", { name: "Yield, %" }) as HTMLInputElement;
    type(price, "90");
    expect(status).toHaveBeenLastCalledWith("pending");
    expect(onChange).toHaveBeenLastCalledWith({ price: 90, yield: null, source: "price" });
    expect(describedBy(yieldField)).toEqual(["Calculating the yield…"]);
    expect(yieldField.closest(".stoa-price-yield__field")?.className).toContain("stoa-price-yield__field--pending");
    // A newer price before the first answer.
    type(price, "95");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(onChange).toHaveBeenLastCalledWith({ price: 95, yield: 20, source: "price" });
    expect(status).toHaveBeenLastCalledWith("ready");
    // The older answer arrives late and is dropped.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(onChange).toHaveBeenLastCalledWith({ price: 95, yield: 20, source: "price" });
    expect(yieldField.value).toBe("20.00");
  });

  it("an emptied field empties the other and asks the engine nothing", () => {
    const engine = { yieldFromPrice: vi.fn(() => 1), priceFromYield: vi.fn(() => 1) };
    const onChange = vi.fn();
    render(<Ticket engine={engine} onChange={onChange} />);
    const price = screen.getByRole("textbox", { name: "Price, % of face value" });
    fireEvent.change(price, { target: { value: "" } });
    fireEvent.keyDown(price, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith({ price: null, yield: null, source: "price" });
    expect(engine.yieldFromPrice).not.toHaveBeenCalled();
  });

  it("speaks Russian and writes Arabic-Indic digits under those locales", () => {
    const { unmount } = render(
      <I18nProvider locale="ru-RU">
        <Ticket />
      </I18nProvider>,
    );
    const price = screen.getByRole("textbox", { name: "Цена, % от номинала" }) as HTMLInputElement;
    expect(price.value).toBe("98,50");
    expect(describedBy(screen.getByRole("textbox", { name: "Доходность, %" }))).toEqual(["Рассчитана по цене"]);
    unmount();
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <Ticket />
      </I18nProvider>,
    );
    const arabic = screen.getByRole("textbox", { name: "السعر، ٪ من القيمة الاسمية" }) as HTMLInputElement;
    expect(arabic.value).toBe("٩٨٫٥٠");
    // Latin digits typed on a Latin layout are taken.
    fireEvent.change(arabic, { target: { value: "97.5" } });
    fireEvent.keyDown(arabic, { key: "Enter" });
    expect((screen.getByRole("textbox", { name: "العائد، ٪" }) as HTMLInputElement).value).toBe("١٠٢٫٥٠");
  });

  it("takes the caller's field labels, and hides the group's label on request", () => {
    render(
      <PriceYieldField
        label="Limit price"
        hideLabel
        yieldLabel="Yield to offer, %"
        value={{ price: null, yield: null, source: "price" }}
        onChange={() => {}}
        {...SYNC}
      />,
    );
    expect(screen.getByText("Limit price").className).toBe("stoa-visually-hidden");
    expect(screen.getByRole("textbox", { name: "Yield to offer, %" })).toBeTruthy();
    // Nothing typed yet: no notes.
    expect(describedBy(screen.getByRole("textbox", { name: "Price, % of face value" }))).toEqual([]);
  });
});

function Stepper(props: { initial?: number; lotSize?: number; max?: number; onChange?: (n: number) => void }) {
  const [lots, setLots] = useState(props.initial ?? 5);
  return (
    <QuantityStepper
      label="Quantity, lots"
      value={lots}
      onChange={(n) => {
        setLots(n);
        props.onChange?.(n);
      }}
      lotSize={props.lotSize ?? 10}
      max={props.max}
    />
  );
}

describe("QuantityStepper", () => {
  it("says the lot's size, the order's size in lots and bonds, and the limits, as the field's description", () => {
    render(<Stepper max={200} />);
    const input = screen.getByRole("textbox", { name: "Quantity, lots" });
    expect(describedBy(input)).toEqual(["A lot is 10 bonds. 5 lots, 50 bonds. From 1 to 200 lots."]);
  });

  it("steps with − and +, named in the locale's words with the field's label, which Tab skips", () => {
    const onChange = vi.fn();
    render(<Stepper onChange={onChange} />);
    const more = screen.getByRole("button", { name: "Increase Quantity, lots" });
    const fewer = screen.getByRole("button", { name: "Decrease Quantity, lots" });
    expect(more.getAttribute("tabindex")).toBe("-1");
    fireEvent.pointerDown(more, { pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(more, { pointerType: "mouse", button: 0 });
    fireEvent.click(more);
    expect(onChange).toHaveBeenLastCalledWith(6);
    fireEvent.pointerDown(fewer, { pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(fewer, { pointerType: "mouse", button: 0 });
    fireEvent.click(fewer);
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it("steps with the arrow keys and stops at the limits, the − button disabled at the lower one", () => {
    const onChange = vi.fn();
    render(<Stepper initial={2} max={3} onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Quantity, lots" }) as HTMLInputElement;
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole("button", { name: /Decrease/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(input, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("3");
  });

  it("announces the size in lots and bonds after a change, not when it appears", () => {
    vi.useFakeTimers();
    render(<Stepper />);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole("status").textContent).toBe("");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Quantity, lots" }), { key: "ArrowUp" });
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole("status").textContent).toBe("6 lots, 60 bonds");
  });

  it("puts lots and bonds in the forms their counts ask for, in Russian", () => {
    const { rerender } = render(
      <I18nProvider locale="ru-RU">
        <QuantityStepper label="Количество, лоты" value={1} onChange={() => {}} lotSize={1} max={200} />
      </I18nProvider>,
    );
    const input = () => screen.getByRole("textbox", { name: "Количество, лоты" });
    expect(describedBy(input())).toEqual(["В лоте 1 облигация. 1 лот, 1 облигация. Лотов: от 1 до 200."]);
    rerender(
      <I18nProvider locale="ru-RU">
        <QuantityStepper label="Количество, лоты" value={3} onChange={() => {}} lotSize={10} />
      </I18nProvider>,
    );
    expect(describedBy(input())).toEqual(["В лоте 10 облигаций. 3 лота, 30 облигаций."]);
  });

  it("is marked invalid with the caller's message", () => {
    render(<QuantityStepper label="Quantity, lots" value={150} onChange={() => {}} lotSize={1} isInvalid errorMessage="The book holds 120 lots." />);
    const input = screen.getByRole("textbox", { name: "Quantity, lots" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(describedBy(input)).toEqual(["A lot is 1 bond. 150 lots, 150 bonds.", "The book holds 120 lots."]);
  });
});
