// CancellableRequest in a real browser, against the built stories: after
// each step the focus is on the control that replaced the one pressed,
// never on the page's body, left to right and right to left.
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=controls-cancellablerequest--${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

for (const [globals, w] of [
  ["lang:en", { request: "Request redemption", confirm: "Request", cancel: "Cancel request", decline: "Cancel" }],
  ["dir:rtl;lang:ar", { request: "تقديم طلب الاسترداد", confirm: "تقديم الطلب", cancel: "إلغاء الطلب", decline: "إلغاء" }],
] as const) {
  test(`the focus moves to Cancel once the request is confirmed, and back to the request button once it is cancelled (${globals})`, async ({ page }) => {
    await page.goto(story("put-offer", globals));
    const request = page.getByRole("button", { name: w.request, exact: true });
    await request.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: w.decline, exact: true })).toBeFocused();
    await dialog.getByRole("button", { name: w.confirm, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const cancel = page.getByRole("button", { name: w.cancel, exact: true });
    await expect(cancel).toBeFocused();
    // It stays there once the dialog's own focus return has run.
    await page.waitForTimeout(300);
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(request).toBeFocused();
    await page.waitForTimeout(300);
    await expect(request).toBeFocused();
  });

  test(`declining the confirmation with Escape returns the focus to the request button (${globals})`, async ({ page }) => {
    await page.goto(story("put-offer", globals));
    const request = page.getByRole("button", { name: w.request, exact: true });
    await request.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(request).toBeFocused();
    await expect(page.getByRole("button", { name: w.cancel, exact: true })).toHaveCount(0);
  });
}
