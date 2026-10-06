// Fields in a real browser, against the built stories: what is typed on
// the keyboard, through the browser's own beforeinput and input events.
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

test("NumberField under Arabic-Indic digits takes digits typed in Latin", async ({ page }) => {
  await page.goto(story("controls-form--number-field-steps", "dir:rtl;lang:ar"));
  const field = page.getByRole("textbox", { name: "Kept as typed" });
  await expect(field).toHaveValue("٢٠٬٠٠٠");
  await field.fill("");
  await field.pressSequentially("500.5");
  await expect(field).toHaveValue("٥٠٠٫٥");
  await field.press("Enter");
  await expect(field).toHaveValue("٥٠٠٫٥");
  // The arrow keys still step from the kept value.
  await field.press("ArrowUp");
  await expect(field).toHaveValue("١٠٬٠٠٠");
});

test("NumberField rounds a typed value to the step, unless it keeps typed values", async ({ page }) => {
  await page.goto(story("controls-form--number-field-steps"));
  const rounded = page.getByRole("textbox", { name: "Rounded to 10,000" });
  await rounded.fill("500");
  await rounded.press("Enter");
  await expect(rounded).toHaveValue("0");
  const kept = page.getByRole("textbox", { name: "Kept as typed" });
  await kept.fill("500");
  await kept.press("Enter");
  await expect(kept).toHaveValue("500");
  await expect(kept).not.toHaveAttribute("aria-invalid", "true");
  await kept.press("ArrowUp");
  await expect(kept).toHaveValue("10,000");
});

test("TextField is in the sans face, which joins Arabic letters, and in the monospace face with tabular figures with mono", async ({ page }) => {
  await page.goto(story("controls-form--text-field-faces", "dir:rtl;lang:ar"));
  const issuer = page.getByRole("textbox", { name: "Issuer" });
  const amount = page.getByRole("textbox", { name: "Amount" });
  await expect(issuer).toHaveValue("شركة غازبروم كابيتال");
  await page.evaluate(() => document.fonts.ready);
  const faces = await Promise.all(
    [issuer, amount].map((field) =>
      field.evaluate((el) => {
        const style = getComputedStyle(el);
        return { family: style.fontFamily, numbers: style.fontVariantNumeric };
      }),
    ),
  );
  expect(faces[0]!.family).toMatch(/^"IBM Plex Sans", "IBM Plex Sans Arabic"/);
  expect(faces[1]!.family).toMatch(/^"IBM Plex Mono"/);
  expect(faces[1]!.numbers).toBe("tabular-nums");
  // Joined, a word is drawn narrower than the same letters kept apart by
  // zero-width non-joiners, which draw nothing themselves.
  const widths = await issuer.evaluate((el) => {
    const style = getComputedStyle(el);
    const loaded = document.fonts.check(`${style.fontSize} "IBM Plex Sans Arabic"`, "شركة");
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const word = "كابيتال";
    return { loaded, joined: context.measureText(word).width, apart: context.measureText([...word].join("‌")).width };
  });
  expect(widths.loaded).toBe(true);
  expect(widths.joined).toBeLessThan(widths.apart);
});
