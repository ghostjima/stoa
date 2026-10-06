// axe-core over the whole page, both frames in their initial views (light
// left to right, dark right to left): every screen in every language, the
// component screens in every data state, and an open dialog and toast.
// No serious or critical violation is allowed; the moderate and minor
// ones are logged for the record.
import axe from "axe-core";
import { expect, test, type Page } from "@playwright/test";
import { COMPONENT_SCREEN_KEYS, SCREEN_KEYS, showLanguage, showScreen, showState, type LanguageKey } from "./frames";

type Violation = { id: string; impact: string | null; nodes: { target: unknown[] }[] };

async function audit(page: Page, label: string): Promise<Violation[]> {
  await page.addScriptTag({ content: axe.source });
  // Let the frames settle: animations, live regions set after mount.
  await page.waitForTimeout(300);
  const violations = await page.evaluate(async () => {
    const result = await (window as unknown as { axe: typeof axe }).axe.run(document, { resultTypes: ["violations"] });
    return result.violations.map((v) => ({ id: v.id, impact: v.impact ?? null, nodes: v.nodes.map((n) => ({ target: n.target as unknown[] })) }));
  });
  const other = violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
  console.log(`axe ${label}: ${violations.length - other.length} serious or critical; other: ${other.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`).join(", ") || "none"}`);
  return violations;
}

const serious = (violations: Violation[]) =>
  violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => JSON.stringify(n.target)).join(" ")}`);

const LANGUAGES: LanguageKey[] = ["en", "ru", "ar"];

test("no serious or critical violation on any screen, in either initial view, in any language", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/");
  for (const language of LANGUAGES) {
    await showLanguage(page, 1, language);
    await showLanguage(page, 2, language);
    for (const screen of SCREEN_KEYS) {
      await showScreen(page, screen);
      expect(serious(await audit(page, `${screen} live ${language}`)), `${screen} in ${language}`).toEqual([]);
    }
  }
});

test("no serious or critical violation in any data state", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/");
  for (const language of LANGUAGES) {
    await showLanguage(page, 1, language);
    await showLanguage(page, 2, language);
    for (const screen of COMPONENT_SCREEN_KEYS) {
      await showScreen(page, screen);
      for (const state of ["loading", "empty", "error"] as const) {
        await showState(page, state);
        expect(serious(await audit(page, `${screen} ${state} ${language}`)), `${screen} ${state} in ${language}`).toEqual([]);
      }
      await showState(page, "live");
    }
  }
});

test("no serious or critical violation with a dialog or a toast open in the dark frame", async ({ page }) => {
  await page.goto("/");
  await showScreen(page, "overlays");
  const frame = page.locator('[data-slot="2"] [data-frame]');
  await frame.getByRole("button", { name: "Order details" }).click();
  await expect(frame.getByRole("dialog")).toBeVisible();
  expect(serious(await audit(page, "overlays dialog en"))).toEqual([]);
  await page.keyboard.press("Escape");
  await showScreen(page, "feedback");
  await frame.getByRole("button", { name: "Report a rejection" }).click();
  await expect(frame.locator(".stoa-toast")).toBeVisible();
  expect(serious(await audit(page, "feedback toast en"))).toEqual([]);
});
