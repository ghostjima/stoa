// SourceNote in a real browser, against the built stories: right to left
// the tag starts the line at the right and Latin runs keep their order; in
// a narrow column the sentence wraps under the tag, which stays at the
// top of the first line; notes in a row sit closer than the note and the
// content after it.
import { expect, test } from "@playwright/test";

const story = (id: string) => `/iframe.html?id=data-sourcenote--${id}&viewMode=story`;

test("right to left, the tag starts the line at the right, the sentence follows it, and SIM and cbr.ru keep their order", async ({ page }) => {
  await page.goto(story("arabic"));
  const note = page.locator(".stoa-source-note").first();
  await expect(note).toBeVisible();
  const layout = await note.evaluate((p) => {
    const tag = p.querySelector(".stoa-tag")!.getBoundingClientRect();
    const text = p.querySelector(".stoa-source-note__text")!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const first = range.getClientRects()[0]!;
    const style = getComputedStyle(p);
    const contentRight = p.getBoundingClientRect().right - parseFloat(style.paddingRight);
    // Where "cbr" and "ru" fall inside the link's own text.
    const link = p.parentElement!.querySelectorAll(".stoa-source-note")[1]!.querySelector("a")!.firstChild as Text;
    const at = (word: string) => {
      const r = document.createRange();
      const from = link.data.indexOf(word);
      r.setStart(link, from);
      r.setEnd(link, from + word.length);
      return r.getBoundingClientRect().left;
    };
    return { tagRight: tag.right, contentRight, tagLeft: tag.left, sentenceRight: first.right, cbr: at("cbr"), ru: at("ru") };
  });
  expect(Math.abs(layout.tagRight - layout.contentRight)).toBeLessThan(1);
  expect(layout.sentenceRight).toBeLessThanOrEqual(layout.tagLeft);
  expect(layout.cbr).toBeLessThan(layout.ru);
  await expect(note.locator(".stoa-tag")).toHaveText("SIM");
  await expect(note).toContainText("المصدر:");
});

test("in a narrow column the sentence wraps under the tag, which stays at the top of the first line, and notes in a row sit closer", async ({ page }) => {
  await page.goto(story("stacked"));
  const notes = page.locator(".stoa-source-note");
  await expect(notes).toHaveCount(2);
  const layout = await notes.first().evaluate((p) => {
    const box = p.getBoundingClientRect();
    const tag = p.querySelector(".stoa-tag")!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(p.querySelector(".stoa-source-note__text")!);
    const lines = [...range.getClientRects()];
    const tops = [...new Set(lines.map((r) => Math.round(r.top)))];
    const next = p.nextElementSibling!.getBoundingClientRect();
    const after = p.nextElementSibling!.nextElementSibling!.getBoundingClientRect();
    const probe = (name: string) => {
      const el = document.createElement("div");
      el.style.inlineSize = `var(${name})`;
      document.body.append(el);
      const width = el.getBoundingClientRect().width;
      el.remove();
      return width;
    };
    return {
      lineCount: tops.length,
      tagTop: tag.top - box.top,
      tagLeft: tag.left - box.left,
      wrappedLeft: Math.min(...lines.filter((r) => Math.round(r.top) > tops[0]!).map((r) => r.left)) - box.left,
      gapBetweenNotes: next.top - box.bottom,
      gapAfterNotes: after.top - next.bottom,
      space1: probe("--stoa-space-1"),
      space3: probe("--stoa-space-3"),
    };
  });
  expect(layout.lineCount).toBeGreaterThan(1);
  expect(Math.abs(layout.tagTop)).toBeLessThan(1);
  expect(Math.abs(layout.tagLeft)).toBeLessThan(1);
  // The second line starts at the note's start edge, under the tag.
  expect(Math.abs(layout.wrappedLeft)).toBeLessThan(1);
  expect(Math.round(layout.gapBetweenNotes)).toBe(Math.round(layout.space1));
  expect(Math.round(layout.gapAfterNotes)).toBe(Math.round(layout.space3));
});
