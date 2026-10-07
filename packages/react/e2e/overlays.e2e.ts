// Overlays in a real browser, against the built stories.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

for (const theme of ["light", "dark"]) {
  test(`a disabled shortcut's description has enough contrast over a long page, in ${theme}`, async ({ page }) => {
    await page.goto(story("overlays-lists-and-content--shortcuts-over-long-page", `theme:${theme}`));
    const line = page.getByRole("dialog").getByText("Export the view as CSV");
    await expect(line).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    });
    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).include(".stoa-shortcuts").analyze();
    expect(results.violations.map((v) => v.nodes.map((n) => n.target.join(" ")))).toEqual([]);
    // Every line, the disabled one too, was measured rather than left
    // incomplete (axe gives up on a background it cannot work out).
    const measured = results.passes.find((rule) => rule.id === "color-contrast")?.nodes.map((n) => n.target.join(" ")) ?? [];
    expect(measured.some((target) => target.includes("data-disabled"))).toBe(true);
  });
}

for (const mode of [
  { name: "left to right", globals: "" },
  { name: "right to left", globals: "dir:rtl;lang:ar" },
]) {
  test(`at 375 px a toast does not cover a modal AlertDialog's buttons, and comes back when it closes (${mode.name})`, async ({ page }) => {
    // A phone's screen with the browser's own bars shown.
    await page.setViewportSize({ width: 375, height: 600 });
    await page.goto(story("feedback-feedback-and-layout--toast-under-alert-dialog", mode.globals));
    const dialog = page.getByRole("alertdialog").filter({ has: page.getByRole("heading") });
    await expect(dialog).toBeVisible();
    const toast = page.locator(".stoa-toast");
    await expect(toast).toHaveCount(1);
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    });
    // The toast and the dialog's actions share the bottom of a phone's
    // screen: the case this guards.
    const send = dialog.getByRole("button").last();
    // The letter is longer than the screen: the dialog scrolls, and its
    // actions come into view at its end.
    await send.scrollIntoViewIfNeeded();
    const [toastBox, sendBox] = [await toast.boundingBox(), await send.boundingBox()];
    expect(toastBox && sendBox && toastBox.y < sendBox.y + sendBox.height && sendBox.y < toastBox.y + toastBox.height).toBe(true);
    // The topmost element at the button's centre is the button, not the
    // toast, so a tap lands on it.
    const hit = await send.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return top !== null && button.contains(top);
    });
    expect(hit).toBe(true);
    // The toast waits out of reach: no Tab, F6 or pointer gets to it.
    await expect(page.locator(".stoa-toast-region")).toHaveAttribute("inert", "");
    await send.click();
    await expect(dialog).toHaveCount(0);
    // Back in reach once the dialog has closed, still shown.
    await expect(toast).toHaveCount(1);
    await expect(page.locator(".stoa-toast-region")).not.toHaveAttribute("inert", /.*/);
    await toast.getByRole("button").first().click();
    await expect(toast).toHaveCount(0);
  });
}
