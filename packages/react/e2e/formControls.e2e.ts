// TextArea and RadioGroup in a real browser, against the built stories:
// a textarea's height follows its text up to its most rows, the browser
// holds it to its limit, and a radio group is one tab stop whose arrow
// keys follow the reading direction.
import { expect, test, type Locator } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The textarea's line height, padding and border, and its box. */
const metrics = (field: Locator) =>
  field.evaluate((el) => {
    const style = getComputedStyle(el);
    const px = (value: string) => parseFloat(value) || 0;
    return {
      line: px(style.lineHeight),
      frame: px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth),
      height: el.getBoundingClientRect().height,
      scrolls: el.scrollHeight > el.clientHeight + 1,
      overflow: style.overflowY,
    };
  });

for (const mode of [
  { name: "left to right", globals: "", label: "Concerns" },
  { name: "right to left", globals: "dir:rtl;lang:ar", label: "المخاوف" },
]) {
  test(`a textarea grows a line at a time from its rows to its most rows, then scrolls (${mode.name})`, async ({ page }) => {
    await page.goto(story("controls-textarea--default", mode.globals));
    const field = page.getByRole("textbox", { name: mode.label });
    await page.evaluate(() => document.fonts.ready);
    await field.fill("");
    const empty = await metrics(field);
    // Three rows while short.
    expect(Math.abs(empty.height - (3 * empty.line + empty.frame))).toBeLessThanOrEqual(1);
    expect(empty.scrolls).toBe(false);
    await field.fill(["1", "2", "3", "4", "5"].join("\n"));
    const five = await metrics(field);
    expect(Math.abs(five.height - (5 * five.line + five.frame))).toBeLessThanOrEqual(1);
    expect(five.overflow).toBe("hidden");
    // Six at most; the rest scrolls.
    await field.fill(["1", "2", "3", "4", "5", "6", "7", "8", "9"].join("\n"));
    const nine = await metrics(field);
    expect(Math.abs(nine.height - (6 * nine.line + nine.frame))).toBeLessThanOrEqual(1);
    expect(nine.scrolls).toBe(true);
    expect(nine.overflow).toBe("auto");
    // And back down when the text shrinks.
    await field.fill("1\n2");
    const two = await metrics(field);
    expect(Math.abs(two.height - (3 * two.line + two.frame))).toBeLessThanOrEqual(1);
  });
}

test("a textarea refits when its width changes the wrapping", async ({ page }) => {
  await page.goto(story("controls-textarea--default"));
  const field = page.getByRole("textbox", { name: "Concerns" });
  await page.evaluate(() => document.fonts.ready);
  await field.fill("word ".repeat(30).trim());
  const wide = await metrics(field);
  await page.setViewportSize({ width: 375, height: 800 });
  await expect.poll(async () => (await metrics(field)).height).toBeGreaterThan(wide.height);
});

test("a textarea in another language than the page keeps its language and runs in its direction, the label in the page's", async ({ page }) => {
  await page.goto(story("controls-textarea--other-language", "dir:rtl;lang:ar"));
  const field = page.getByRole("textbox", { name: "نص الرسالة" });
  await expect(field).toHaveAttribute("lang", "ru");
  expect(await field.evaluate((el) => getComputedStyle(el).direction)).toBe("ltr");
  expect(await page.getByText("نص الرسالة").evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
  // The page's language is Arabic; the text's is Russian.
  expect(await field.evaluate((el) => (el.closest("[lang]:not(textarea)") as HTMLElement | null)?.lang)).toBe("ar");
});

test("a textarea with a limit takes no more than its limit, and says so", async ({ page }) => {
  await page.goto(story("controls-textarea--character-count"));
  const field = page.getByRole("textbox", { name: "Note to the client" });
  const count = page.locator(".stoa-textarea__count");
  const initial = (await field.inputValue()).length;
  await expect(count.locator("[aria-hidden='true']")).toHaveText(`${initial}/120`);
  await field.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(el.value.length, el.value.length));
  await field.pressSequentially("x".repeat(40));
  await expect(field).toHaveValue(/x+$/);
  expect((await field.inputValue()).length).toBe(120);
  await expect(count.locator("[aria-hidden='true']")).toHaveText("120/120");
  await expect(count).toHaveAttribute("data-full", "true");
  await expect(page.getByRole("status")).toHaveText("0 characters left");
  // The count is read as part of the field's description, after it.
  const described = await field.evaluate((el) =>
    (el.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent),
  );
  expect(described).toEqual(["Up to 120 characters, sent as a text message.", "Characters: 120 of 120"]);
});

test("a radio group with nothing chosen is one tab stop, on its first option; the arrows choose and skip a disabled option", async ({ page }) => {
  await page.goto(story("controls-radiogroup--invalid-and-disabled-option"));
  const group = page.getByRole("radiogroup", { name: "Stream" });
  await expect(group).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Tab");
  const first = page.getByRole("radio", { name: "General complaint" });
  await expect(first).toBeFocused();
  await expect(first).not.toBeChecked();
  await page.keyboard.press("ArrowDown");
  const money = page.getByRole("radio", { name: "Money claim up to 500,000 RUB" });
  await expect(money).toBeFocused();
  await expect(money).toBeChecked();
  // Chosen: the error goes.
  await expect(group).not.toHaveAttribute("aria-invalid", "true");
  // The next option is disabled: the arrow wraps round to the first.
  await page.keyboard.press("ArrowDown");
  await expect(first).toBeChecked();
  // The focus ring is drawn on the circle.
  const ring = await first.evaluate((el) => getComputedStyle(el.closest(".stoa-radio__button")!.querySelector(".stoa-radio__circle")!).outlineStyle);
  expect(ring).toBe("solid");
  // Tab leaves the group.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio")).not.toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement?.getAttribute("type"))).not.toBe("radio");
  // A pointer on a disabled option chooses nothing.
  await page.getByText("Operation blocked").click({ force: true });
  await expect(page.getByRole("radio", { name: "Operation blocked" })).not.toBeChecked();
});

test("right to left, a horizontal radio group runs from the right and the left arrow moves forward", async ({ page }) => {
  await page.goto(story("controls-radiogroup--horizontal", "dir:rtl;lang:ar"));
  const maturity = page.getByRole("radio", { name: "الاستحقاق" });
  const offer = page.getByRole("radio", { name: "عرض إعادة الشراء" });
  await expect(offer).toBeChecked();
  const [a, b] = [await maturity.locator("xpath=..").boundingBox(), await offer.locator("xpath=..").boundingBox()];
  expect(a && b && a.x > b.x).toBe(true);
  expect(a && b && Math.abs(a.y - b.y) < 2).toBe(true);
  await offer.focus();
  await page.keyboard.press("ArrowRight");
  await expect(maturity).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(offer).toBeChecked();
});

for (const mode of [
  { name: "left to right", globals: "", label: "Approve" },
  { name: "right to left", globals: "dir:rtl;lang:ar", label: "موافقة" },
]) {
  test(`an option's description lines up with its label, past the circle (${mode.name})`, async ({ page }) => {
    await page.goto(story("controls-radiogroup--with-descriptions", mode.globals));
    const option = page.locator(".stoa-radio").first();
    // Where the words start and end: the boxes' text, not their padding.
    const words = (selector: string) =>
      option.locator(selector).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const box = range.getBoundingClientRect();
        return { left: box.left, right: box.right };
      });
    const [label, note] = [await words(".stoa-radio__label"), await words(".stoa-radio__note")];
    if (mode.globals) expect(Math.abs(label.right - note.right)).toBeLessThanOrEqual(1);
    else expect(Math.abs(label.left - note.left)).toBeLessThanOrEqual(1);
    // Each option is at least the minimum target's height.
    const button = await option.locator(".stoa-radio__button").boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(24);
  });
}

test("at 375 px a horizontal radio group wraps rather than scrolling the page sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(story("controls-radiogroup--horizontal", "dir:rtl;lang:ar"));
  await expect(page.getByRole("radiogroup")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
