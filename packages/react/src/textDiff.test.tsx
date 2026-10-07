// @vitest-environment jsdom
// TextDiff: deletions and insertions as del and ins with words read at
// their start and end, the summary of changed characters, and the list
// of changes; in English, Russian and Arabic.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider, TextDiff, changedPercent, diffChanges, diffStats, diffSummary, diffWords, stoaFormat } from "./index";

afterEach(cleanup);

/** Text with non-breaking spaces as plain ones, and without the isolates
 * and marks that keep values in their own direction. */
const plain = (text: string | null) => (text ?? "").replace(/\u00a0/g, " ").replace(/[\u200e\u2068\u2069]/g, "");

describe("diffChanges", () => {
  it("takes a deletion and the insertion after it as one replacement", () => {
    expect(diffChanges(diffWords("made tomorrow, surely", "made today, surely and soon"))).toEqual([
      { kind: "replaced", deleted: "tomorrow", inserted: "today" },
      { kind: "inserted", deleted: "", inserted: " and soon" },
    ]);
    expect(diffChanges(diffWords("a b", "a"))).toEqual([{ kind: "deleted", deleted: " b", inserted: "" }]);
  });
});

describe("changedPercent and diffSummary", () => {
  it("rounds to one decimal, but never shows a change as 0.0% or a partial one as 100.0%", () => {
    const at = (changed: number) => changedPercent({ deleted: 0, inserted: 0, total: 0, changed }, "en-US");
    expect([at(0), at(0.1940), at(0.0001), at(0.9999), at(1)]).toEqual(["0.0%", "19.4%", "0.1%", "99.9%", "100.0%"]);
  });

  it("says how the share is made: deleted and inserted characters over both texts", () => {
    const stats = diffStats(diffWords("The transfer will be made tomorrow.", "The transfer will be made today."));
    expect(plain(diffSummary(stats, stoaFormat("en-US")))).toBe("19.4% of the characters changed: 8 deleted and 5 inserted, out of 67 in the two texts together.");
    expect(plain(diffSummary(stats, stoaFormat("ru-RU")))).toBe("Изменено 19,4 % символов: удалено 8, вставлено 5, из 67 в обоих текстах вместе.");
    expect(plain(diffSummary(stats, stoaFormat("ar")))).toBe("نسبة الأحرف المتغيرة: 19.4%؛ المحذوفة: 8؛ المضافة: 5؛ مجموع أحرف النصين: 67.");
  });

  it("says when the texts are the same", () => {
    expect(diffSummary(diffStats(diffWords("Same.", "Same.")), stoaFormat("en-US"))).toBe("No changes: the texts are the same.");
  });
});

describe("TextDiff", () => {
  it("marks deletions with del and insertions with ins, each read with words at its start and end", () => {
    render(<TextDiff label="Draft and signed" before="The transfer will be made tomorrow." after="The transfer will be made today." lang="en" />);
    const figure = screen.getByRole("figure", { name: "Draft and signed" });
    const text = figure.querySelector(".stoa-diff__text")!;
    const del = text.querySelector("del")!;
    const ins = text.querySelector("ins")!;
    expect(del.textContent).toBe("deleted: tomorrow end of deletion");
    expect(ins.textContent).toBe("inserted: today end of insertion");
    expect([...del.querySelectorAll(".stoa-visually-hidden")].map((s) => s.textContent)).toEqual(["deleted: ", " end of deletion"]);
    expect(del.querySelector("[lang]")?.getAttribute("lang")).toBe("en");
  });

  it("shows the summary and the list of changes, closed until opened", () => {
    render(<TextDiff label="Edit" before="a b c d" after="a x c" changesOpen={false} />);
    // "b" and " d" deleted (3), "x" inserted (1); "a  c" (4) in each text.
    expect(plain(screen.getByText(/of the characters changed/).textContent)).toBe("33.3% of the characters changed: 3 deleted and 1 inserted, out of 12 in the two texts together.");
    const details = screen.getByText("Changes: 2").closest("details")!;
    expect(details.open).toBe(false);
    const items = [...details.querySelectorAll("li")].map((li) => li.querySelector(".stoa-diff__kind")?.textContent);
    expect(items).toEqual(["Replaced", "Deleted"]);
  });

  it("draws identical texts without marks or a list", () => {
    render(<TextDiff label="Same" before="Same text." after="Same text." />);
    expect(screen.getByText("No changes: the texts are the same.")).toBeTruthy();
    expect(document.querySelector("del, ins, details")).toBeNull();
  });

  it("reads a change of whitespace alone with a word", () => {
    render(<TextDiff label="Spaces" before="a b" after="a  b" />);
    const ins = document.querySelector("ins")!;
    expect(ins.className).toContain("stoa-diff__mark--blank");
    expect(ins.textContent).toContain("spaces or line breaks");
  });

  it("speaks Arabic and Russian, and marks Arabic and Russian text", () => {
    render(
      <I18nProvider locale="ar">
        <TextDiff label="تعديل" before="سيُنفَّذ التحويل غدًا." after="سيُنفَّذ التحويل اليوم." lang="ar" />
      </I18nProvider>,
    );
    expect(document.querySelector("del")?.textContent).toBe("محذوف: غدًا نهاية الحذف");
    expect(document.querySelector("ins")?.textContent).toBe("مضاف: اليوم نهاية الإضافة");
    expect(screen.getByText("التغييرات: 1")).toBeTruthy();
    cleanup();
    render(
      <I18nProvider locale="ru-RU">
        <TextDiff label="Правка" before="Мы рассмотрели вашу жалобу." after="Мы внимательно рассмотрели жалобу." lang="ru" />
      </I18nProvider>,
    );
    expect([...document.querySelectorAll(".stoa-diff__text del, .stoa-diff__text ins")].map((m) => m.textContent)).toEqual([
      "вставлено: внимательно  конец вставки",
      "удалено:  вашу конец удаления",
    ]);
  });
});
