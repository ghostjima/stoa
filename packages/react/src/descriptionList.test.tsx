// @vitest-environment jsdom
// DescriptionList: terms and values as a dl, both layouts, numbers, an
// empty list, and right to left.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DescriptionList, I18nProvider } from "./index";

afterEach(cleanup);

const BOND = [
  { term: "ISIN", description: "RU000A1234" },
  { term: "Coupon", description: "7.5%", numeric: true },
  { term: "Maturity", description: "4 Sep 2026" },
];

describe("DescriptionList", () => {
  it("is a description list: each term with its value, in order", () => {
    const { container } = render(<DescriptionList items={BOND} />);
    const list = container.querySelector("dl")!;
    expect(list.className).toBe("stoa-description-list stoa-description-list--columns");
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["ISIN", "Coupon", "Maturity"]);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["RU000A1234", "7.5%", "4 Sep 2026"]);
    // Each pair is a div in the dl, as HTML allows; the dt comes first.
    for (const item of list.children) expect([...item.children].map((c) => c.tagName)).toEqual(["DT", "DD"]);
  });

  it("draws a number in the numeric face, and nothing else", () => {
    render(<DescriptionList items={BOND} />);
    expect(screen.getByText("7.5%").className).toContain("stoa-description-list__value--numeric");
    expect(screen.getByText("RU000A1234").className).toBe("stoa-description-list__value");
  });

  it("stacks each value under its term in the stacked layout", () => {
    const { container } = render(<DescriptionList items={BOND} layout="stacked" />);
    expect(container.querySelector("dl")!.className).toContain("stoa-description-list--stacked");
  });

  it("is not interactive: no tab stop, no role but the list's own", () => {
    const { container } = render(<DescriptionList items={BOND} />);
    expect(container.querySelectorAll("[tabindex], button, a, input")).toHaveLength(0);
  });

  it("draws nothing when it has no items", () => {
    const { container } = render(<DescriptionList items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("keeps an Arabic record in order in a right-to-left page", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <DescriptionList
            items={[
              { term: "الرمز", description: "RU000A1234" },
              { term: "القسيمة", description: "٧٫٥٪", numeric: true },
            ]}
          />
        </div>
      </I18nProvider>,
    );
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["الرمز", "القسيمة"]);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["RU000A1234", "٧٫٥٪"]);
  });

  it("gives each value the direction of its own text, in either direction of the page", () => {
    for (const dir of ["ltr", "rtl"] as const) {
      render(
        <div dir={dir}>
          <DescriptionList
            items={[
              { term: "Maturity", description: "4 Sep 2027" },
              { term: "المُصدر", description: "شركة Gazprom Capital" },
            ]}
          />
        </div>,
      );
      for (const value of screen.getAllByRole("definition")) expect(value.getAttribute("dir"), dir).toBe("auto");
      cleanup();
    }
  });
});
