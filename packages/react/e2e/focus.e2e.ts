// Where focus goes after an action removes the control that had it, in a
// real browser against the built stories: never to the page's body.
import { expect, test, type Page } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

/** The focused element's tag and accessible text, or "BODY". */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "BODY";
    return `${el.tagName}:${el.getAttribute("aria-label") ?? el.textContent?.trim() ?? ""}`;
  });

test("a dismissed callout leaves focus on the tab stop that takes its place", async ({ page }) => {
  await page.goto(story("feedback-feedback-and-layout--callout-dismissible"));
  await page.getByRole("button", { name: "Dismiss" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
  await expect.poll(() => focused(page)).toBe("BUTTON:Show the callout again");
});

test("an application's own action that removes the focused control leaves focus on the next tab stop where it was", async ({ page }) => {
  await page.goto(story("feedback-feedback-and-layout--focus-after-removal"));
  await page.getByRole("button", { name: "Approve" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("group", { name: "Selection" })).toHaveCount(0);
  await expect.poll(() => focused(page)).toBe("BUTTON:Export");
});

for (const globals of ["lang:en", "dir:rtl;lang:ar"]) {
  test(`removing an item of a reorderable list moves focus to its neighbour, then to the list (${globals})`, async ({ page }) => {
    await page.goto(story("overlays-lists-and-content--reorderable", globals));
    const items = page.locator(".stoa-reorder__item");
    await expect(items).toHaveCount(4);
    /** Removes the item at `index` from the keyboard: Remove is its
     * row's last button, reached with the arrow that points to the end. */
    const remove = async (index: number) => {
      await items.nth(index).locator(".stoa-reorder__content").click();
      const toEnd = globals.includes("rtl") ? "ArrowLeft" : "ArrowRight";
      for (let i = 0; i < 4; i++) {
        if (await page.evaluate(() => document.activeElement?.classList.contains("stoa-reorder__remove"))) break;
        await page.keyboard.press(toEnd);
      }
      await expect(page.locator(".stoa-reorder__remove:focus")).toHaveCount(1);
      await page.keyboard.press("Enter");
    };
    const focusedItem = () => page.evaluate(() => document.activeElement?.closest(".stoa-reorder__item")?.textContent ?? document.activeElement?.getAttribute("role") ?? "BODY");
    // The second item: focus goes to the item that takes its place.
    await remove(1);
    await expect(items).toHaveCount(3);
    await expect.poll(focusedItem).toContain("Check limits");
    // The last item: focus goes to the one before it.
    await remove(2);
    await expect(items).toHaveCount(2);
    await expect.poll(focusedItem).toContain("Check limits");
    await remove(1);
    await expect(items).toHaveCount(1);
    await expect.poll(focusedItem).toContain("Fetch prices");
    // The only item: focus goes to the list.
    await remove(0);
    await expect(items).toHaveCount(0);
    await expect.poll(focusedItem).toBe("grid");
  });
}

test("a confirmation opened without a trigger leaves focus where its opener was, once the opener is gone", async ({ page }) => {
  await page.goto(story("overlays-lists-and-content--alert-without-trigger"));
  await page.getByRole("button", { name: "Run step 3" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Send the reply?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Send" }).press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => focused(page)).toBe("BUTTON:Start over");
});

for (const [name, id, open, role] of [
  ["Dialog", "overlays-lists-and-content--dialog-closed", "Rename run", "dialog"],
  ["AlertDialog", "overlays-lists-and-content--alert-answer", "Ask for permission", "alertdialog"],
] as const) {
  test(`${name} returns focus to its trigger`, async ({ page }) => {
    await page.goto(story(id));
    await page.getByRole("button", { name: open }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole(role)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole(role)).toHaveCount(0);
    await expect.poll(() => focused(page)).toBe(`BUTTON:${open}`);
  });
}

for (const [name, id, open] of [
  ["Dialog", "overlays-lists-and-content--dialog-open", "Rename run"],
  ["Sheet", "overlays-lists-and-content--sheet-end", "Filters"],
] as const) {
  test(`a ${name} open from the start returns focus to its trigger, not to the page's body`, async ({ page }) => {
    await page.goto(story(id));
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => focused(page)).toBe(`BUTTON:${open}`);
  });
}

test("closing the last toast from the keyboard returns focus to where it was before the toasts", async ({ page }) => {
  await page.goto(story("feedback-feedback-and-layout--toast-with-undo"));
  const cancel = page.getByRole("button", { name: "Cancel order 1042" });
  await cancel.focus();
  await page.keyboard.press("Enter");
  const undo = page.getByRole("button", { name: "Undo" });
  await expect(undo).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(undo).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(undo).toHaveCount(0);
  await expect.poll(() => focused(page)).toBe("BUTTON:Cancel order 1042");
});
