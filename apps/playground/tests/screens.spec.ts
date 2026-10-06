// The component screens: each one puts its components in both frames,
// the State setting switches what they show, Russian works, the frames'
// own previews (reduced motion, colour vision) reach every screen, and
// nothing scrolls sideways or wraps where it must not.
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  COMPONENT_SCREEN_KEYS,
  SCREEN_KEYS,
  STATES,
  showLanguage,
  showScreen,
  showState,
  sidewaysScrollers,
  type ScreenKey,
  type StateKey,
} from "./frames";

const frames = (page: Page) => [1, 2].map((slot) => page.locator(`[data-slot="${slot}"] [data-frame]`));

/** What each screen must show, in every frame: a selector per component. */
const COMPONENTS: Record<ScreenKey, Record<string, string>> = {
  market: { Ladder: ".stoa-ladder__canvas", Heatmap: ".stoa-heatmap, canvas", TradeTable: ".stoa-table" },
  controls: {
    Toolbar: ".stoa-toolbar[role=toolbar]",
    ButtonGroup: ".stoa-button-group",
    ToolbarSeparator: ".stoa-toolbar__separator",
    "Button primary": ".stoa-button--primary",
    "Button secondary": ".stoa-button--secondary",
    "Button ghost": ".stoa-button--ghost",
    "Button danger": ".stoa-button--danger",
    FilterChipGroup: ".stoa-filter-chips",
    FilterChip: ".stoa-filter-chip",
    Tag: ".stoa-tag",
    Switch: ".stoa-switch",
    Checkbox: ".stoa-checkbox",
    CheckboxGroup: ".stoa-checkbox-group",
    Slider: ".stoa-range",
    Kbd: ".stoa-kbd",
    ShortcutList: ".stoa-shortcuts",
    ThemeSwitch: '[role=radiogroup][aria-label="Theme"]',
    LanguageSwitch: '[role=radiogroup][aria-label="Language"]',
  },
  feedback: {
    PageShell: ".stoa-page-shell",
    AppHeader: ".stoa-app-header",
    ProgressBar: ".stoa-progress[role=progressbar]",
    Callout: ".stoa-callout",
    VisuallyHidden: ".stoa-visually-hidden",
    LiveRegion: ".stoa-live-region[aria-live=polite]",
  },
  overlays: {
    Toolbar: ".stoa-toolbar",
    ReorderableList: ".stoa-reorder [role=grid]",
    StepList: ".stoa-steps",
    LogView: ".stoa-code--log",
    CodeView: ".stoa-code--numbered",
    Kbd: ".stoa-kbd",
    RecordList: ".stoa-record-list[role=listbox]",
    DescriptionList: ".stoa-description-list",
    Tooltip: ".stoa-tooltip-term",
  },
  charts: {
    StatBar: ".stoa-statbar",
    Metric: ".stoa-metric",
    LineChart: ".stoa-chart__line",
    EventStrip: ".stoa-event-strip__plot",
    // The positions table, not the chart's data table behind its disclosure.
    Table: 'table:has(caption:text-is("Open bond positions")) tbody th[scope=row]',
  },
  grid: { DataGrid: "[role=grid][aria-rowcount]" },
};

test("each screen renders its components in both frames", async ({ page }) => {
  await page.goto("/");
  for (const screen of SCREEN_KEYS) {
    await showScreen(page, screen);
    for (const body of frames(page)) {
      for (const [name, selector] of Object.entries(COMPONENTS[screen])) {
        await expect(body.locator(selector).first(), `${screen}: ${name}`).toBeVisible();
      }
    }
  }
});

test("the overlays and toasts of their screens open on request", async ({ page }) => {
  await page.goto("/");
  await showScreen(page, "overlays");
  const first = frames(page)[0]!;
  for (const [button, role] of [
    ["Order details", "dialog"],
    ["Filters", "dialog"],
    ["Keyboard shortcuts", "dialog"],
    ["Cancel all orders", "alertdialog"],
  ] as const) {
    await first.getByRole("button", { name: button }).click();
    await expect(page.getByRole(role)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole(role)).toHaveCount(0);
  }

  await showScreen(page, "feedback");
  await first.getByRole("button", { name: "Report a rejection" }).click();
  await expect(first.locator(".stoa-toast--negative")).toBeVisible();
  // The toast landed in the frame it was raised from, not in the other.
  await expect(frames(page)[1]!.locator(".stoa-toast")).toHaveCount(0);
});

/** What a screen shows in each state that is not live, in every frame. */
const STATE_MARKS: Record<Exclude<ScreenKey, "market">, Record<Exclude<StateKey, "live">, string[]>> = {
  controls: {
    loading: [".stoa-switch [data-disabled]", ".stoa-filter-chip[data-disabled]"],
    empty: [".stoa-filter-chip__count"],
    error: [".stoa-callout--negative[role=alert]", ".stoa-tag--negative"],
  },
  feedback: {
    loading: [".stoa-skeleton", ".stoa-progress--indeterminate"],
    empty: [".stoa-empty-state"],
    error: [".stoa-callout--negative[role=alert]"],
  },
  overlays: {
    loading: [".stoa-skeleton"],
    empty: [".stoa-empty-state", ".stoa-reorder__empty", ".stoa-record-list__empty"],
    error: [".stoa-callout--negative[role=alert]", ".stoa-step--error"],
  },
  charts: {
    loading: [".stoa-skeleton .stoa-skeleton__block"],
    empty: [".stoa-empty-state", ".stoa-table__empty", ".stoa-chart__empty"],
    error: [".stoa-callout--negative[role=alert]", ".stoa-table__empty", ".stoa-chart__empty"],
  },
  grid: {
    loading: ["[role=grid][aria-busy=true]"],
    empty: [".stoa-data-grid .stoa-empty-state"],
    error: [".stoa-callout--negative[role=alert]"],
  },
};

test("today's orders show the picked order's details, and its time in force is explained in a tooltip", async ({ page }) => {
  await page.goto("/");
  await showScreen(page, "overlays");
  const first = frames(page)[0]!;
  const list = first.getByRole("listbox", { name: "Today's orders" });
  const options = list.getByRole("option");
  await expect(options).toHaveCount(5);
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  const second = options.nth(1);
  const id = (await second.locator(".stoa-record-list__label").textContent())!;
  await second.click();
  await expect(second).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowUp");
  await expect(options.first()).toBeFocused();
  // The details follow the pick, not the focus.
  const details = first.locator(".pg-master-detail .stoa-description-list");
  await expect(details).toBeVisible();
  expect(id).toMatch(/^ORD-/);
  const term = first.getByRole("button", { name: "Time in force" });
  await term.focus();
  await expect(page.getByRole("tooltip")).toHaveText(/until the close of today's session/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  // The other frame keeps its own pick.
  await expect(frames(page)[1]!.getByRole("listbox", { name: "Today's orders" }).getByRole("option").first()).toHaveAttribute("aria-selected", "true");
});

test("State switches what every component screen shows, in both frames, and Retry brings the data back", async ({ page }) => {
  await page.goto("/");
  for (const screen of COMPONENT_SCREEN_KEYS) {
    await showScreen(page, screen);
    for (const state of ["loading", "empty", "error"] as const) {
      await showState(page, state);
      for (const body of frames(page)) {
        await expect(body).toHaveAttribute("data-state", state);
        for (const selector of STATE_MARKS[screen][state]) {
          await expect(body.locator(selector).first(), `${screen} ${state}: ${selector}`).toBeVisible();
        }
        // Live data is gone in every state but live: no callout negative
        // outside the error state, no skeleton outside loading.
        if (state !== "error") await expect(body.locator(".stoa-callout--negative[role=alert]")).toHaveCount(0);
        if (state !== "loading") await expect(body.locator(".stoa-skeleton")).toHaveCount(0);
      }
    }
    // The error callout's Retry sets the state back to live, for both.
    await frames(page)[0]!.locator(".stoa-callout--negative").getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("radiogroup", { name: "State" }).getByRole("radio", { name: "Live" })).toHaveAttribute("aria-checked", "true");
    for (const body of frames(page)) await expect(body).toHaveAttribute("data-state", "live");
  }
});

test("the specific states read as they should", async ({ page }) => {
  await page.goto("/");
  const first = frames(page)[0]!;
  await showScreen(page, "controls");
  await showState(page, "loading");
  // A disabled switch says why.
  await expect(first.getByRole("switch", { name: "Live updates" })).toBeDisabled();
  await expect(first.getByText("The feed is still connecting.")).toBeVisible();
  await showState(page, "empty");
  await expect(first.locator(".stoa-filter-chip__count").first()).toHaveText("0");

  await showScreen(page, "charts");
  await showState(page, "empty");
  // The line chart's empty text, then the payments strip's.
  await expect(first.locator(".stoa-chart__empty").first()).toHaveText("No data to show.");
  await expect(first.locator(".stoa-chart__empty").nth(1)).toHaveText("No events to show.");
  await expect(first.locator(".stoa-table__empty")).toHaveText("No open positions.");
  await showState(page, "error");
  await expect(first.locator(".stoa-chart__empty").first()).toHaveText("Not loaded: the service did not answer.");

  await showScreen(page, "grid");
  await showState(page, "live");
  const grid = first.getByRole("grid", { name: "Orders" });
  await expect(grid).toHaveAttribute("aria-rowcount", "301");
  await page.getByRole("radiogroup", { name: "Grid rows" }).getByRole("radio", { name: "50,000" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "50001");
  await expect(frames(page)[1]!.getByRole("grid")).toHaveAttribute("aria-rowcount", "50001");
  // Only the rows in view are in the DOM, whatever the count.
  expect(await grid.locator("[role=row]").count()).toBeLessThan(40);
  await page.getByRole("radiogroup", { name: "Grid rows" }).getByRole("radio", { name: "300" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "301");
  // Grid rows is a setting of the grid's screen only.
  await showScreen(page, "market");
  await expect(page.getByRole("radiogroup", { name: "Grid rows" })).toHaveCount(0);
});

test("a frame's shortcuts run only while the focus is in that frame", async ({ page }) => {
  await page.goto("/");
  await showScreen(page, "controls");
  const [first, second] = frames(page) as [Locator, Locator];
  const mine = (body: Locator) => body.getByRole("button", { name: "Only my orders" });
  await expect(mine(first)).toHaveAttribute("aria-pressed", "false");
  await first.getByRole("button", { name: "New order" }).focus();
  await page.keyboard.press("m");
  await expect(mine(first)).toHaveAttribute("aria-pressed", "true");
  await expect(mine(second)).toHaveAttribute("aria-pressed", "false");
  // With the focus outside both frames, nothing runs.
  await page.locator(".pg-side").getByRole("button", { name: "Pause" }).focus();
  await page.keyboard.press("m");
  await expect(mine(first)).toHaveAttribute("aria-pressed", "true");
  await expect(mine(second)).toHaveAttribute("aria-pressed", "false");
});

test("Russian: the market screen's words, Stoa's words and Russian numbers, and the component screens", async ({ page }) => {
  await page.goto("/");
  const first = frames(page)[0]!;
  const limit = first.getByRole("textbox").first();
  await showLanguage(page, 1, "ru");
  await expect(first.locator(".stoa-panel__title").first()).toHaveText("Стакан");
  await expect(first.getByRole("columnheader", { name: "Время" })).toBeVisible();
  // The typed price keeps its value in the Russian decimal comma.
  await expect(limit).toHaveValue("222,60");
  await expect(first.getByText("Шаг цены 0,01")).toBeVisible();
  // The other frame keeps its own language.
  await expect(frames(page)[1]!).toHaveAttribute("lang", "en");
  // Arabic, then back to English: the value survives the round trip.
  await showLanguage(page, 1, "ar");
  await expect(limit).toHaveValue("٢٢٢٫٦٠");
  await showLanguage(page, 1, "ru");
  await expect(limit).toHaveValue("222,60");

  await showScreen(page, "controls");
  await expect(first.getByRole("toolbar", { name: "Действия с заявками" })).toBeVisible();
  await expect(first.getByRole("button", { name: "Новая заявка" })).toBeVisible();
  await showScreen(page, "grid");
  await expect(first.getByRole("columnheader", { name: /Заявка/ })).toBeVisible();
  await expect(first.locator(".stoa-tag", { hasText: "Строк: 300" })).toBeVisible();
  await showScreen(page, "charts");
  // Russian digits are Latin, with a decimal comma.
  await expect(first.getByRole("table", { name: "Открытые позиции по облигациям" }).locator("tbody tr").first()).toContainText("97,35");
  // Coming back to the market screen in Russian starts its fields in Russian.
  await showScreen(page, "market");
  await expect(first.getByRole("textbox").first()).toHaveValue("222,60");
});

test("reduced motion and the colour-vision preview reach every screen", async ({ page }) => {
  await page.goto("/");
  const slot = page.locator('[data-slot="1"]');
  const body = slot.locator("[data-frame]");
  await slot.getByRole("button", { name: "Reduced motion" }).click();
  await slot.getByRole("radio", { name: "Deutan" }).click();
  for (const screen of SCREEN_KEYS) {
    await showScreen(page, screen);
    await expect(body).toHaveAttribute("data-motion", "reduce");
    await expect(body).toHaveCSS("filter", /url\("?#pg-cvd-deuteranopia"?\)/);
    // A component deep in the screen reads the zeroed duration.
    const deepest = body.locator(".stoa-panel, .stoa-page-shell").first();
    expect(await deepest.evaluate((element) => getComputedStyle(element).getPropertyValue("--stoa-motion-duration-base").trim())).toBe("0ms");
    // The other frame keeps its motion and no filter.
    await expect(page.locator('[data-slot="2"] [data-frame]')).toHaveAttribute("data-cvd", "none");
  }
});

test("the frame headers stay on one line at 1280 px, in every language", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  for (const language of ["en", "ru", "ar"] as const) {
    for (const slot of [1, 2]) {
      await showLanguage(page, slot, language);
      const tops = await page
        .locator(`[data-slot="${slot}"] .pg-frame__picks`)
        .evaluateAll((picks) => picks.map((pick) => Math.round(pick.getBoundingClientRect().top)));
      expect(new Set(tops).size, `slot ${slot} in ${language}: ${tops.join(", ")}`).toBe(1);
    }
  }
});

test("nothing scrolls sideways on any screen, in any state or language", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/");
  for (const language of ["en", "ar"] as const) {
    await showLanguage(page, 1, language);
    await showLanguage(page, 2, language);
    for (const screen of SCREEN_KEYS) {
      await showScreen(page, screen);
      for (const state of screen === "market" ? (["live"] as const) : STATES) {
        await showState(page, state);
        for (const width of [1800, 1280, 1024, 800]) {
          await page.setViewportSize({ width, height: 900 });
          await expect.poll(() => sidewaysScrollers(page), { message: `${screen} ${state} ${language} at ${width} px` }).toEqual([]);
        }
        await page.setViewportSize({ width: 1800, height: 1200 });
      }
    }
  }
});
