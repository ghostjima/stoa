// The preview has two frames, each showing one of four views. A test that
// has to see every view shows them two at a time.
import { expect, type Page } from "@playwright/test";

export const VIEW_LABELS: Record<string, string> = {
  "light-ltr": "Light, left to right",
  "light-rtl": "Light, right to left",
  "dark-ltr": "Dark, left to right",
  "dark-rtl": "Dark, right to left",
};

/** The views on load, then the other two: between them, all four. */
export const INITIAL_VIEWS: [string, string] = ["light-ltr", "dark-rtl"];
export const OTHER_VIEWS: [string, string] = ["light-rtl", "dark-ltr"];
export const VIEW_PAIRS = [INITIAL_VIEWS, OTHER_VIEWS];

/** Picks a view for one frame from its header's drop-down list. */
export async function showView(page: Page, slot: number, view: string) {
  const frame = page.locator(`[data-slot="${slot}"]`);
  await frame.locator(".stoa-select__button").click();
  await page.getByRole("option", { name: VIEW_LABELS[view] }).click();
  await expect(frame.locator(`[data-frame="${view}"]`)).toBeVisible();
}

export async function showViews(page: Page, [first, second]: [string, string]) {
  await showView(page, 1, first);
  await showView(page, 2, second);
}

/** The screens of the side panel's Screen setting, by their labels. */
export const SCREEN_LABELS = {
  market: "Market",
  controls: "Controls",
  feedback: "Feedback",
  overlays: "Overlays and lists",
  charts: "Charts and tables",
  grid: "Data grid",
} as const;
export type ScreenKey = keyof typeof SCREEN_LABELS;
export const SCREEN_KEYS = Object.keys(SCREEN_LABELS) as ScreenKey[];
export const COMPONENT_SCREEN_KEYS = SCREEN_KEYS.filter((key) => key !== "market");

/** Shows a screen in both frames, from the side panel. */
export async function showScreen(page: Page, screen: ScreenKey) {
  // The select's button is named by its label and its value.
  await page.locator(".pg-side").getByRole("button", { name: /Screen/ }).click();
  await page.getByRole("option", { name: SCREEN_LABELS[screen], exact: true }).click();
  await expect(page.locator(`[data-frame][data-screen="${screen}"]`)).toHaveCount(2);
}

export const STATES = ["live", "loading", "empty", "error"] as const;
export type StateKey = (typeof STATES)[number];

/** Sets the data state both frames' component screens show. */
export async function showState(page: Page, state: StateKey) {
  const label = state[0]!.toUpperCase() + state.slice(1);
  await page.getByRole("radiogroup", { name: "State" }).getByRole("radio", { name: label }).click();
}

export type LanguageKey = "en" | "ru" | "ar";

/** Sets one frame's language from its header. */
export async function showLanguage(page: Page, slot: number, language: LanguageKey) {
  const frame = page.locator(`[data-slot="${slot}"]`);
  await frame.getByRole("radiogroup", { name: `Preview ${slot}: language` }).getByRole("radio", { name: language.toUpperCase() }).click();
  await expect(frame.locator("[data-frame]")).toHaveAttribute("lang", language);
}

/** Every box inside the playground that scrolls sideways, as text; empty
 * when nothing does. Visually hidden text clips by design and is skipped. */
export function sidewaysScrollers(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const found = root.scrollWidth > root.clientWidth ? [`page ${root.scrollWidth} > ${root.clientWidth}`] : [];
    for (const element of document.querySelectorAll<HTMLElement>(".stoa-page-shell__scroll, .stoa-page-shell__scroll *")) {
      if (element.closest(".stoa-visually-hidden") || element.clientWidth <= 1) continue;
      if (getComputedStyle(element).overflowX === "visible") continue;
      if (element.scrollWidth > element.clientWidth + 1) {
        const frame = element.closest("[data-frame]")?.getAttribute("data-frame") ?? "chrome";
        found.push(`${frame}: ${element.tagName.toLowerCase()}.${element.className} ${element.scrollWidth} > ${element.clientWidth}`);
      }
    }
    return found;
  });
}
