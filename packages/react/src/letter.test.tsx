// @vitest-environment jsdom
// Letter: a figure named by its label, the letter a quotation in its own
// language with a sentence a line, the grounds as terms and descriptions,
// and a copy as plain text without direction marks.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nProvider, Letter, letterText, type LetterGround } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const LINES = ["Dear client,", "We have reviewed your complaint, case Z-000104.", "The ground is 161-FZ, art. 8, part 3.4."];
const GROUNDS: LetterGround[] = [{ id: "payment_8_3_4", citation: "161-FZ, art. 8, part 3.4", text: "A suspended transfer is confirmed by the client." }];

describe("Letter", () => {
  it("is a figure named by its label, the letter a quotation in its language, a sentence a line", () => {
    render(<Letter label="Reply to the client" lines={LINES} lang="en" />);
    const figure = screen.getByRole("figure", { name: "Reply to the client" });
    const quote = figure.querySelector("blockquote")!;
    expect(quote.getAttribute("lang")).toBe("en");
    expect([...quote.querySelectorAll("p")].map((p) => p.textContent)).toEqual(LINES);
  });

  it("lists the grounds it cites, each citation isolated with what it says", () => {
    render(<Letter label="Reply" lines={LINES} lang="en" grounds={GROUNDS} />);
    expect(screen.getByText("Grounds cited")).toBeTruthy();
    const term = screen.getByRole("term");
    expect(term.textContent).toBe("161-FZ, art. 8, part 3.4");
    expect(term.querySelector("bdi")).toBeTruthy();
    expect(screen.getByRole("definition").textContent).toBe("A suspended transfer is confirmed by the client.");
  });

  it("copies the letter as plain text and says so politely", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<Letter label="Reply" lines={LINES} lang="en" grounds={GROUNDS} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledWith(LINES.join("\n"));
  });

  it("says so when the copy fails", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
    render(<Letter label="Reply" lines={LINES} lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copy failed"));
  });

  it("keeps direction marks out of the copy", () => {
    expect(letterText(["\u2068Z-000104\u2069 \u200Fتم\u200E.", "\u202Babc\u202C"])).toBe("Z-000104 تم.\nabc");
  });

  it("has no Copy button when it is not copyable, and can hide its label", () => {
    render(<Letter label="Reply" hideLabel lines={LINES} lang="en" copyable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("figure", { name: "Reply" }).querySelector("figcaption")?.className).toBe("stoa-visually-hidden");
  });

  it("speaks Russian under a Russian locale", () => {
    render(
      <I18nProvider locale="ru-RU">
        <Letter label="Ответ" lines={["Уважаемый клиент!"]} lang="ru" grounds={GROUNDS} />
      </I18nProvider>,
    );
    const figure = screen.getByRole("figure", { name: "Ответ" });
    expect(within(figure).getByRole("button", { name: "Копировать" })).toBeTruthy();
    expect(within(figure).getByText("Приведённые основания")).toBeTruthy();
  });
});
