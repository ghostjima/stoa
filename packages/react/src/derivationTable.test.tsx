// @vitest-environment jsdom
// DerivationTable: a table named by its caption, a row per step headed by
// its name, the formula kept left to right, the source with its revision,
// and a copy as plain text.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DerivationTable, I18nProvider, derivationText, messagesFor, type DerivationStep } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const STEPS: DerivationStep[] = [
  { id: "coupon", label: "Coupon", formula: "1000 × 7.5% × 182 / 365", value: "37.40 RUB", source: { name: "Offering terms, clause 9.3", revision: "2025-03-14", href: "https://example.org/terms" } },
  { id: "tax", label: "Tax at 13%", formula: "37.40 × 13%", value: "4.86 RUB", source: { name: "Tax Code, art. 224" } },
  { id: "net", label: "Coupon after tax", value: "32.54 RUB" },
];

describe("DerivationTable", () => {
  it("is a table named by its caption, each step a row headed by its name", () => {
    render(<DerivationTable caption="Coupon after tax" steps={STEPS} />);
    const table = screen.getByRole("table", { name: "Coupon after tax" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Step", "Formula", "Value", "Source"]);
    expect(within(table).getAllByRole("rowheader").map((h) => h.textContent)).toEqual(["Coupon", "Tax at 13%", "Coupon after tax"]);
  });

  it("keeps each formula one left-to-right run, and shows the source with its revision and link", () => {
    render(<DerivationTable caption="Coupon after tax" steps={STEPS} />);
    const formula = screen.getByText("1000 × 7.5% × 182 / 365");
    expect([formula.tagName, formula.getAttribute("dir")]).toEqual(["BDI", "ltr"]);
    const link = screen.getByRole("link", { name: "Offering terms, clause 9.3" });
    expect(link.getAttribute("href")).toBe("https://example.org/terms");
    expect(screen.getByText("revision 2025-03-14")).toBeTruthy();
  });

  it("copies the derivation as plain text and says so politely", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<DerivationTable caption="Coupon after tax" steps={STEPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledWith(
      [
        "Coupon after tax",
        "Coupon: 1000 × 7.5% × 182 / 365 = 37.40 RUB (Offering terms, clause 9.3, revision 2025-03-14)",
        "Tax at 13%: 37.40 × 13% = 4.86 RUB (Tax Code, art. 224)",
        "Coupon after tax: 32.54 RUB",
      ].join("\n"),
    );
  });

  it("says so when the copy fails", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
    render(<DerivationTable caption="Coupon after tax" steps={STEPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copy failed"));
  });

  it("has no Copy button when it is not copyable", () => {
    render(<DerivationTable caption="Coupon after tax" steps={STEPS} copyable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("speaks Russian under a Russian locale, also in the copy", () => {
    render(
      <I18nProvider locale="ru-RU">
        <DerivationTable caption="Купон после налога" steps={[{ id: "a", label: "Купон", value: "37,40 ₽", source: { name: "НК РФ, ст. 214.1", revision: "01.12.2025" } }]} />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Шаг", "Формула", "Значение", "Источник"]);
    expect(screen.getByRole("button", { name: "Копировать" })).toBeTruthy();
    expect(derivationText("Купон после налога", [{ id: "a", label: "Купон", value: "37,40 ₽", source: { name: "НК РФ, ст. 214.1", revision: "01.12.2025" } }], messagesFor("ru-RU"))).toBe(
      "Купон после налога\nКупон: 37,40 ₽ (НК РФ, ст. 214.1, редакция от 01.12.2025)",
    );
  });
});
