// @vitest-environment jsdom
// SourceNote: a paragraph with "Source:" for assistive technology, the
// source's tag in its kind's tone and in its own direction, the sentence,
// and an optional link, in the locale's words.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider, SourceNote } from "./index";

afterEach(cleanup);

describe("SourceNote", () => {
  it("reads Source:, the tag and the sentence in that order, with the word drawn nowhere", () => {
    const { container } = render(
      <SourceNote tag="SIM" kind="sim">
        Synthetic data: fictional issuers and prices.
      </SourceNote>,
    );
    const note = container.querySelector("p")!;
    expect(note.className).toBe("stoa-source-note");
    expect(note.getAttribute("data-source")).toBe("sim");
    expect(note.textContent).toBe("Source: SIM Synthetic data: fictional issuers and prices.");
    expect(screen.getByText("Source:").className).toBe("stoa-visually-hidden");
  });

  it("keeps the tag in its own direction, in the tone of its kind", () => {
    const { container, rerender } = render(
      <SourceNote tag="SIM" kind="sim">
        Synthetic data.
      </SourceNote>,
    );
    const tag = () => container.querySelector(".stoa-tag")!;
    // The visually hidden word is outside the tag: the tag is the name alone.
    expect(tag().textContent).toBe("SIM");
    expect(tag().firstElementChild!.tagName).toBe("BDI");
    expect(tag().className).toContain("stoa-tag--info");
    rerender(
      <SourceNote tag="Bank of Russia" kind="official">
        Figures as of 5 October 2026.
      </SourceNote>,
    );
    expect(tag().className).toContain("stoa-tag--neutral");
    expect(container.querySelector("p")!.getAttribute("data-source")).toBe("official");
  });

  it("puts the link after the sentence, its label in its own direction, and keeps links the sentence has", () => {
    render(
      <SourceNote tag="Bank of Russia" kind="official" link={{ href: "https://www.cbr.ru/", label: "cbr.ru" }}>
        Key rate and curve as of 5 October 2026; the terms of use: <a href="https://www.cbr.ru/user_agreement/">user agreement</a>.
      </SourceNote>,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["user agreement", "cbr.ru"]);
    const link = screen.getByRole("link", { name: "cbr.ru" });
    expect([link.getAttribute("href"), link.getAttribute("dir")]).toEqual(["https://www.cbr.ru/", "auto"]);
    expect(link.parentElement!.className).toBe("stoa-source-note__text");
  });

  it("says Source: in Russian and Arabic", () => {
    for (const [locale, word] of [
      ["ru-RU", "Источник:"],
      ["ar-u-nu-arab", "المصدر:"],
    ] as const) {
      render(
        <I18nProvider locale={locale}>
          <SourceNote tag="SIM" kind="sim">
            …
          </SourceNote>
        </I18nProvider>,
      );
      expect(screen.getByText(word).className).toBe("stoa-visually-hidden");
      cleanup();
    }
  });
});
