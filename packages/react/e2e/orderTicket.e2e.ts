// PriceYieldField and QuantityStepper in a real browser, against the
// built stories: what is typed on the keyboard works out the other value,
// the states between are read and drawn, and both stay usable right to
// left and on a phone.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

const describedBy = (page: Page, name: string) =>
  page
    .getByRole("textbox", { name })
    .evaluate((el) => (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? ""));

/** Serious or critical axe violations inside a selector. */
async function axe(page: Page, selector: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
  });
  const results = await new AxeBuilder({ page }).include(selector).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length}`);
}

test("a price typed and committed with Tab works out the yield, and the notes say which was typed", async ({ page }) => {
  await page.goto(story("controls-order-ticket--price-and-yield"));
  const price = page.getByRole("textbox", { name: "Price, % of face value" });
  const yieldField = page.getByRole("textbox", { name: "Yield, %" });
  await price.fill("100");
  await price.press("Tab");
  // The coupon is 12% of face: at par the yield is 12%.
  await expect(yieldField).toHaveValue("12.00");
  await expect(yieldField).toBeFocused();
  expect(await describedBy(page, "Price, % of face value")).toEqual(["Entered"]);
  expect(await describedBy(page, "Yield, %")).toEqual(["Calculated from the price"]);
  await expect(page.getByRole("status")).toHaveText("Yield, %: 12.00");
  // The other way round, with an arrow key.
  await yieldField.press("ArrowUp");
  await expect(yieldField).toHaveValue("12.01");
  await expect(price).toHaveValue("99.98");
  expect(await describedBy(page, "Yield, %")).toEqual(["Entered"]);
  expect(await describedBy(page, "Price, % of face value")).toEqual(["Calculated from the yield"]);
  // Numbers in the numeric face, with tabular figures.
  expect(await price.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toBe("tabular-nums");
});

for (const mode of [
  { name: "light, left to right", globals: "", price: "Price, % of face value" },
  { name: "dark, right to left", globals: "theme:dark;dir:rtl;lang:ar", price: "السعر، ٪ من القيمة الاسمية" },
]) {
  test(`the engine's reason is shown in words under the typed price, with no serious axe violation (${mode.name})`, async ({ page }) => {
    await page.goto(story("controls-order-ticket--price-and-yield", mode.globals));
    const price = page.getByRole("textbox", { name: mode.price });
    await price.fill("140");
    await price.press("Enter");
    await expect(price).toHaveAttribute("aria-invalid", "true");
    const words = (await describedBy(page, mode.price))[1];
    expect(words).toMatch(mode.globals ? /لا عائد/ : /^No yield at this price/);
    await expect(page.locator(".stoa-field__error")).toBeVisible();
    expect(await axe(page, ".stoa-price-yield")).toEqual([]);
  });
}

test("while a slow engine works, the yield says so, the caller holds its button, and the answer arrives", async ({ page }) => {
  await page.goto(story("controls-order-ticket--slow-engine"));
  const price = page.getByRole("textbox", { name: "Price, % of face value" });
  const offer = page.getByRole("textbox", { name: "Yield to offer, %" });
  const submit = page.getByRole("button", { name: "Review the order" });
  await expect(submit).toBeEnabled();
  await price.fill("100");
  await price.press("Enter");
  await expect(page.getByText("Calculating the yield…")).toBeVisible();
  await expect(submit).toBeDisabled();
  await expect(offer).toHaveValue("");
  expect(await axe(page, ".stoa-price-yield")).toEqual([]);
  await expect(offer).toHaveValue("12.00", { timeout: 5000 });
  await expect(submit).toBeEnabled();
  await expect(page.getByText("Calculated from the price")).toBeVisible();
});

test("right to left, the price comes first at the right, and digits typed in Latin are taken in Arabic-Indic", async ({ page }) => {
  await page.goto(story("controls-order-ticket--price-and-yield", "dir:rtl;lang:ar"));
  const price = page.getByRole("textbox", { name: "السعر، ٪ من القيمة الاسمية" });
  const yieldField = page.getByRole("textbox", { name: "العائد، ٪" });
  const [a, b] = [await price.boundingBox(), await yieldField.boundingBox()];
  expect(a!.x).toBeGreaterThan(b!.x);
  await price.fill("");
  await price.pressSequentially("100");
  await expect(price).toHaveValue("١٠٠");
  await price.press("Enter");
  await expect(yieldField).toHaveValue("١٢٫٠٠");
});

test("the quantity steps with the keys and the buttons, within its limits, and says the bonds in words", async ({ page }) => {
  await page.goto(story("controls-order-ticket--quantity"));
  const input = page.getByRole("textbox", { name: "Quantity, lots" });
  await expect(input).toHaveValue("5");
  await input.focus();
  await page.keyboard.press("ArrowUp");
  await expect(input).toHaveValue("6");
  await page.keyboard.press("End");
  await expect(input).toHaveValue("200");
  await page.keyboard.press("Home");
  await expect(input).toHaveValue("1");
  const fewer = page.getByRole("button", { name: "Decrease Quantity, lots" });
  const more = page.getByRole("button", { name: "Increase Quantity, lots" });
  await expect(fewer).toBeDisabled();
  await more.click();
  await more.click();
  await expect(input).toHaveValue("3");
  await expect(page.locator(".stoa-stepper__note")).toHaveText("A lot is 1 bond. 3 lots, 3 bonds. From 1 to 200 lots.");
  await expect(page.getByRole("status")).toHaveText("3 lots, 3 bonds");
  // Tab goes from the field past the buttons, which the keys stand in for.
  await input.focus();
  await page.keyboard.press("Tab");
  await expect(more).not.toBeFocused();
  // The buttons are at least the minimum target, and as tall as the input.
  const [m, i] = [await more.boundingBox(), await input.boundingBox()];
  expect(m!.width).toBeGreaterThanOrEqual(24);
  expect(Math.abs(m!.height - i!.height)).toBeLessThanOrEqual(1);
});

test("at 375 px the order ticket fits the screen, right to left", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(story("controls-order-ticket--ticket", "dir:rtl;lang:ar"));
  await expect(page.locator(".stoa-price-yield")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const fields = page.locator(".stoa-price-yield__field");
  const [a, b] = [await fields.nth(0).boundingBox(), await fields.nth(1).boundingBox()];
  expect(a && b).toBeTruthy();
  for (const box of [a!, b!]) expect(box.x + box.width).toBeLessThanOrEqual(375);
});
