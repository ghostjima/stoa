// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider, Metric, TradeTable, describeBook, parseBook, stoaFormat } from "./index";

afterEach(cleanup);

const ARABIC = "ar-u-nu-arab";

describe("stoaFormat", () => {
  it("writes numbers in the locale's digits when the tag asks for them", () => {
    expect(stoaFormat(ARABIC).decimal(1234.5, 2)).toBe("١٬٢٣٤٫٥٠");
    expect(stoaFormat(ARABIC).integer(1200)).toBe("١٬٢٠٠");
    expect(stoaFormat("en-US").decimal(1234.5, 2)).toBe("1,234.50");
  });

  it("rewrites the digits and the decimal point of a preformatted time", () => {
    expect(stoaFormat(ARABIC).digits("14:30:17.200")).toBe("١٤:٣٠:١٧٫٢٠٠");
    expect(stoaFormat("en-US").digits("14:30:17.200")).toBe("14:30:17.200");
  });

  it("rewrites only numbers in preformatted text: a full stop after a word, or between parts of a date, stays", () => {
    const russian = stoaFormat("ru-RU");
    expect(russian.digits("4 сент. 2026 г.")).toBe("4 сент. 2026 г.");
    expect(russian.digits("1.5 ч.")).toBe("1,5 ч.");
    expect(russian.digits("04.09.2026")).toBe("04.09.2026");
    const arabic = stoaFormat(ARABIC);
    expect(arabic.digits("v1.2.3")).toBe("v١.٢.٣");
    expect(arabic.digits("Done. 2.5 s.")).toBe("Done. ٢٫٥ s.");
  });

  it("describes the book in the locale's words and digits", () => {
    const book = parseBook([1, 1, 99.05, 300, 99.1, 50]);
    expect(describeBook(book, undefined, stoaFormat("en-US"))).toBe("best bid 99.05 for 300, best ask 99.10 for 50, spread 0.05.");
    const arabic = stoaFormat(ARABIC);
    const sentence = describeBook(book, (p) => arabic.decimal(p, 2), arabic);
    expect(sentence).toBe("أفضل سعر شراء ٩٩٫٠٥ بكمية ٣٠٠، أفضل سعر بيع ٩٩٫١٠ بكمية ٥٠، الفارق ٠٫٠٥.");
  });
});

describe("TradeTable under a locale", () => {
  it("takes its headers, side words and digits from the provider", () => {
    render(
      <I18nProvider locale={ARABIC}>
        <TradeTable caption="Trades" trades={[{ id: "1", time: "10:00:01.500", side: "sell", price: 99.05, size: 1200 }]} />
      </I18nProvider>,
    );
    expect(screen.getByRole("columnheader", { name: "السعر" })).toBeTruthy();
    expect(screen.getByText("بيع").className).toBe("stoa-down");
    expect(screen.getByText("١٬٢٠٠")).toBeTruthy();
    expect(screen.getByText("١٠:٠٠:٠١٫٥٠٠")).toBeTruthy();
  });
});

describe("Metric with preformatted text", () => {
  it("keeps the full stops of a Russian date", () => {
    render(
      <I18nProvider locale="ru-RU">
        <Metric label="Погашение" value="4 сент. 2026 г." />
      </I18nProvider>,
    );
    expect(screen.getByText("4 сент. 2026 г.").className).toBe("stoa-metric__number");
  });
});
