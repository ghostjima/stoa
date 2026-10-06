// The acceptance test of brief 04: the app loads, one colour override
// reaches every view and can be reset, and the dev server's build
// endpoint really builds and tests the token package.
import { expect, test, type Page } from "@playwright/test";
import { INITIAL_VIEWS, OTHER_VIEWS, VIEW_PAIRS, showViews } from "./frames";

/** The side panel is tabbed; a control is reachable once its tab is open. */
const openTab = (page: Page, name: string | RegExp) => page.getByRole("tab", { name }).click();

/** A primitive both themes reference (`--stoa-color-up-wash` in each), so
 * one edit has to show up in every view. */
const TOKEN = "primitive:color.teal.wash";
const BASE_VALUE = "oklch(0.62 0.13 170 / 0.18)";
const EDITED_VALUE = "oklch(0.55 0.2 300 / 0.3)";

const washVariable = (page: Page, frame: string) =>
  page
    .locator(`[data-frame="${frame}"]`)
    .evaluate((element) => getComputedStyle(element).getPropertyValue("--stoa-color-up-wash").trim());

test("loads two frames of the same dense screen, which show all four views between them", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stoa playground", level: 1 })).toBeVisible();
  await expect(page.locator("[data-frame]")).toHaveCount(2);

  for (const pair of VIEW_PAIRS) {
    await showViews(page, pair);
    for (const frame of pair) {
      const body = page.locator(`[data-frame="${frame}"]`);
      await expect(body).toHaveAttribute("data-theme", frame.startsWith("dark") ? "dark" : "light");
      await expect(body).toHaveAttribute("dir", frame.endsWith("rtl") ? "rtl" : "ltr");
      // The canvases are sized by layout, so a drawn ladder means the frame
      // is at a real width, not collapsed.
      const box = await body.locator(".stoa-ladder__canvas").boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(150);
      // The stream is running: the tape fills after the first frame.
      await expect(body.locator(".stoa-table tbody tr").first()).toBeVisible();
    }
  }

  await openTab(page, /^Overrides/);
  await expect(page.locator('[data-override-count="0"]')).toBeVisible();
});

test("one colour override reaches every view, and reset undoes it", async ({ page }) => {
  await page.goto("/");
  const shown = INITIAL_VIEWS;
  const other = OTHER_VIEWS;
  for (const frame of shown) expect(await washVariable(page, frame)).toBe(BASE_VALUE);

  await openTab(page, "Tokens");
  await page.locator(`[data-token="${TOKEN}"] input`).fill(EDITED_VALUE);

  for (const frame of shown) {
    await expect
      .poll(() => washVariable(page, frame), { message: `${frame} takes the override` })
      .toBe(EDITED_VALUE);
  }
  // A view picked after the edit shows it too.
  await showViews(page, other);
  for (const frame of other) expect(await washVariable(page, frame)).toBe(EDITED_VALUE);
  await showViews(page, shown);

  // The override is marked on the control and listed with its derived value.
  await expect(page.locator(`[data-token="${TOKEN}"]`)).toHaveAttribute("data-overridden", "true");
  await expect(page.locator(`[data-token="${TOKEN}"]`)).toContainText("Override detected");
  const row = page.locator(`[data-override="${TOKEN}"]`);
  await openTab(page, /^Overrides/);
  await expect(row).toContainText(BASE_VALUE);
  await expect(row).toContainText(EDITED_VALUE);
  await expect(page.locator('[data-override-count="1"]')).toBeVisible();

  await row.getByRole("button", { name: "Reset" }).click();

  await expect(page.locator('[data-override-count="0"]')).toBeVisible();
  for (const frame of shown) await expect.poll(() => washVariable(page, frame)).toBe(BASE_VALUE);
  await expect(page.locator(`[data-token="${TOKEN}"]`)).not.toHaveAttribute("data-overridden", "true");
});

test("a length token is typed into its heading as well as dragged, and radius.full comes last", async ({ page }) => {
  await page.goto("/");
  await openTab(page, "Tokens");
  await page.getByRole("tab", { name: "Shape" }).click();
  const control = page.locator('[data-token="primitive:space.1"]');
  const field = control.getByRole("textbox", { name: "space.1 in px" });
  await field.fill("6");
  await field.press("Enter");
  await expect(control).toHaveAttribute("data-overridden", "true");
  await expect(control.getByRole("slider")).toHaveAttribute("aria-valuetext", "6px");
  // Beyond the slider's range is allowed: the field is the way past it.
  await field.fill("40");
  await field.press("Enter");
  await expect(field).toHaveValue("40");

  const shape = page.locator('section[aria-label="Space, radius and focus"] [data-token]');
  await expect(shape.last()).toHaveAttribute("data-token", "primitive:radius.full");
  await expect(shape.last().getByRole("slider")).toHaveCount(0);
});

test("the replay slider scrubs the heatmap back, and its end is live again", async ({ page }) => {
  await page.goto("/");
  const frame = page.locator('[data-slot="1"]');
  const slider = frame.getByRole("slider", { name: "Replay time" });
  // The slider is a native range input: its bounds and value are attributes.
  const live = async () => Number(await slider.getAttribute("max"));
  const value = async () => Number(await slider.inputValue());
  // Wait for the stream to have moved, so the history is not one frame.
  await expect.poll(live).toBeGreaterThan(2);

  await slider.focus();
  // A frame well inside the history: the oldest frame itself (Home) falls
  // out of the history with the next stream frame and is then held at the
  // new oldest one, by design, so it would not stay put.
  await page.keyboard.press("Home");
  for (let step = 0; step < 40; step++) await page.keyboard.press("ArrowRight");
  const replayed = await value();
  const liveThen = await live();
  expect(replayed).toBeLessThan(liveThen);
  // A replayed time stays put while the stream moves on.
  await expect.poll(live).toBeGreaterThan(liveThen + 3);
  expect(await value()).toBe(replayed);

  await page.keyboard.press("End");
  // The value and the live end read together, in one call: read one after
  // the other, the stream can move between the two reads on a slow machine.
  await expect.poll(() => slider.evaluate((el: HTMLInputElement) => el.value === el.max)).toBe(true);
});

test("a frame switches its screen to Arabic words and digits, and back", async ({ page }) => {
  await page.goto("/");
  const frame = page.locator('[data-slot="2"]');
  const body = frame.locator("[data-frame]");
  const limit = body.getByRole("textbox").first();
  await expect(limit).toHaveValue("222.60");

  await frame.getByRole("radiogroup", { name: "Preview 2: language" }).getByRole("radio", { name: "AR" }).click();
  await expect(body).toHaveAttribute("lang", "ar");
  await expect(body.getByRole("columnheader", { name: "الوقت" })).toBeVisible();
  await expect(body.locator(".stoa-panel__title").first()).toHaveText("دفتر الأوامر");
  await expect(limit).toHaveValue("٢٢٢٫٦٠");
  // Digits in the tape are Arabic-Indic, not Latin.
  await expect(body.locator(".stoa-table tbody td").first()).toHaveText(/^[٠-٩:٫]+$/);
  // The other frame keeps its own language.
  await expect(page.locator('[data-slot="1"] [data-frame]')).toHaveAttribute("lang", "en");
  // Arabic words are wider than English ones; nothing spills out of the frame.
  expect(await frame.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);

  await frame.getByRole("radiogroup", { name: "Preview 2: language" }).getByRole("radio", { name: "EN" }).click();
  await expect(limit).toHaveValue("222.60");
  await expect(body.getByRole("columnheader", { name: "Time" })).toBeVisible();
});

test("the build endpoint builds and tests the unmodified base", async ({ page }) => {
  await page.goto("/");
  await openTab(page, "Checks");
  await page.getByRole("button", { name: "Build and test" }).click();

  const results = page.getByTestId("build-results");
  await expect(results).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("build-status")).toContainText("passed");
  await expect(page.getByTestId("test-status")).toContainText("passed");
  await expect(page.getByTestId("test-output")).toContainText("pass");
  // The values the previews are using are the values the build emitted.
  await expect(page.getByTestId("agreement-status")).toContainText("agrees on");

  // The verdict is about the files it was taken on: an edit retires it
  // rather than leaving a "passed" beside tokens that have since changed.
  await openTab(page, "Tokens");
  await page.locator(`[data-token="${TOKEN}"] input`).fill(EDITED_VALUE);
  await openTab(page, "Checks");
  await expect(results).toBeHidden();
});

test("nothing scrolls sideways, in any side panel tab or frame", async ({ page }) => {
  for (const width of [1440, 1280, 1024, 800]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const tab of ["Tokens", /^Overrides/, "Checks", "Type", "Snapshot", "Stats"]) {
      await openTab(page, tab);
      // Every collapsible group open, so a wide table cannot hide in one.
      await page.evaluate(() => document.querySelectorAll("details").forEach((details) => (details.open = true)));
      const sideways = await page.evaluate(() => {
        const page = document.documentElement;
        const found = page.scrollWidth > page.clientWidth ? [`page ${page.scrollWidth} > ${page.clientWidth}`] : [];
        for (const element of document.querySelectorAll<HTMLElement>(".pg-app *")) {
          // Visually hidden text (Stoa's and React Aria's live regions) is a
          // 1 px box that clips by design.
          if (element.closest(".stoa-visually-hidden") || element.clientWidth <= 1) continue;
          if (getComputedStyle(element).overflowX === "visible") continue;
          if (element.scrollWidth > element.clientWidth + 1) {
            found.push(`${element.tagName.toLowerCase()}.${element.className} ${element.scrollWidth} > ${element.clientWidth}`);
          }
        }
        return found;
      });
      expect(sideways, `at ${width} px, tab ${String(tab)}`).toEqual([]);
    }
  }
});

test("the header's switch sets the playground's own theme and remembers it", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const switcher = page.getByRole("radiogroup", { name: "Playground theme" });
  // System is the default: no data-theme, the chrome follows the scheme.
  await expect(switcher.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
  expect(await html.getAttribute("data-theme")).toBeNull();
  await switcher.getByRole("radio", { name: "Dark" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radiogroup", { name: "Playground theme" }).getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  // The frames keep their own views: the first frame is still light.
  await expect(page.locator('[data-slot="1"] [data-frame]')).toHaveAttribute("data-theme", "light");
  await page.getByRole("radiogroup", { name: "Playground theme" }).getByRole("radio", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  // System forgets the choice.
  await page.getByRole("radiogroup", { name: "Playground theme" }).getByRole("radio", { name: "System" }).click();
  expect(await html.getAttribute("data-theme")).toBeNull();
  await page.reload();
  await expect(page.getByRole("radiogroup", { name: "Playground theme" }).getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
});

test("saving refuses to write over the committed baseline", async ({ page }) => {
  await page.goto("/");
  await openTab(page, "Snapshot");
  await page.getByRole("textbox", { name: "Snapshot name" }).fill("stoa-default");
  await page.getByRole("button", { name: "Save snapshot" }).click();

  // Refused with no way to force it: the file is the base of every override.
  await expect(page.getByText("is never written over")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Replace/ })).toHaveCount(0);
});
