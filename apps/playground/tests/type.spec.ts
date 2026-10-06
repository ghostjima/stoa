// The acceptance test of brief 07, in a browser: the worker really reads
// fonts, the numeric verdicts are the ones the engine reports, the roles
// reach every view, and the canvas check answers for this browser.
import { expect, test, type Page } from "@playwright/test";
import { VIEW_PAIRS, showViews } from "./frames";

/** The side panel is tabbed; a control is reachable once its tab is open. */
const openTab = (page: Page, name: string | RegExp) => page.getByRole("tab", { name }).click();

const FIXTURES = {
  /** Committed subsets: a variable TTF with proportional Latin digits, and
   * a WOFF2 that has to be decoded before it can be measured. */
  latin: "src/type/testdata/Inter-digits-subset.ttf",
  arabic: "src/type/testdata/NotoSansArabic-digits-subset.woff2",
};

const openTypePanel = async (page: Page) => {
  await page.goto("/");
  await openTab(page, "Type");
  await expect(page.getByRole("heading", { name: "Type", level: 2 })).toBeVisible();
  // The shipped families are read out of the bundle on open, which is also
  // the proof that the worker started and HarfBuzz initialised.
  await expect(page.locator('[data-testid="type-loaded"] [data-font]')).toHaveCount(3, { timeout: 30_000 });
};

const selectFont = async (page: Page, family: string) => {
  await page.locator('[data-testid="type-loaded"]').getByRole("button", { name: family, exact: true }).click();
  await expect(page.locator('[data-testid="type-report"]')).toBeVisible();
};

const digitRow = (page: Page, set: string, feature: string) =>
  page.locator(`[data-digits="${set}-${feature}"]`);

test("reads the shipped families through the worker", async ({ page }) => {
  await openTypePanel(page);
  await selectFont(page, "IBM Plex Sans");

  await expect(page.locator('[data-testid="type-metrics"]')).toContainText("1000 units per em");
  await expect(page.locator('[data-testid="type-metrics"]')).toContainText("x-height 516");
  // The Fontsource build keeps the licence URL and drops the licence text.
  await expect(page.locator('[data-testid="type-licence"]')).toContainText("only a licence URL");
  await expect(page.locator('[data-testid="type-licence"]')).toContainText("scripts.sil.org/OFL");
  // A web subset, and the panel says so against the full release.
  await expect(page.locator('[data-testid="type-feature-count"]')).toContainText("of the 21 GSUB features");

  // Latin digits are there and tabular; Arabic-Indic digits are not in this
  // file, and ten equal .notdef advances are not reported as tabular.
  await expect(digitRow(page, "latin", "none")).toContainText("tabular");
  await expect(digitRow(page, "arabic-indic", "none")).toContainText("absent");
  await expect(digitRow(page, "arabic-indic", "none")).toContainText("not in this file");
});

test("reproduces the IBM Plex Sans Arabic digit finding", async ({ page }) => {
  await openTypePanel(page);
  await selectFont(page, "IBM Plex Sans Arabic");

  // The brief's headline: proportional Arabic-Indic digits, and tnum does
  // not make them tabular.
  for (const feature of ["none", "tnum"]) {
    const row = digitRow(page, "arabic-indic", feature);
    await expect(row).toContainText("proportional");
    await expect(row).toContainText("9 distinct, 263 to 630");
  }
  await expect(page.locator('[data-testid="type-digit-summaries"]')).toContainText(
    "Arabic-Indic with tnum: proportional, 9 distinct advances from 263 to 630 units",
  );
  // In a run one digit takes a narrower contextual form, so the run has ten
  // advances where the glyphs have nine; the panel says so rather than
  // reporting one number for both.
  await expect(page.locator('[data-testid="type-digit-summaries"]')).toContainText(
    "shaped as one run the ten advances are different again, 10 distinct from 263 to 630 units",
  );
});

test("decodes a dropped WOFF2 before measuring it", async ({ page }) => {
  await openTypePanel(page);
  await page.locator('[data-testid="type-font-file"]').setInputFiles(FIXTURES.arabic);
  await expect(page.locator('[data-testid="type-report"]')).toContainText("Noto Sans Arabic", { timeout: 30_000 });

  // Measured on the decoded sfnt, not on the compressed file.
  await expect(page.locator('[data-testid="type-report"]')).toContainText("woff2");
  await expect(page.locator('[data-testid="type-report"]')).toContainText("decoded to");
  await expect(digitRow(page, "arabic-indic", "none")).toContainText("tabular");
  await expect(digitRow(page, "arabic-indic", "none")).toContainText("1 distinct, 572 to 572");
  await expect(digitRow(page, "latin", "none")).toContainText("absent");
});

test("shows the axes and named instances of a variable file", async ({ page }) => {
  await openTypePanel(page);
  await page.locator('[data-testid="type-font-file"]').setInputFiles(FIXTURES.latin);
  await expect(page.locator('[data-testid="type-report"]')).toContainText("Inter Variable", { timeout: 30_000 });

  const axes = page.locator('[data-testid="type-axes"]');
  await expect(axes).toContainText("opsz");
  await expect(axes).toContainText("wght");
  await expect(axes).toContainText("100 to 900");
  await expect(page.locator('[data-testid="type-instances"]')).toContainText("SemiBold (opsz 14, wght 600)");
  // The features the subset kept, named by the font itself.
  await expect(page.locator('[data-testid="type-features"]')).toContainText("Open digits");
  await expect(digitRow(page, "latin", "none")).toContainText("proportional");
  await expect(digitRow(page, "latin", "tnum")).toContainText("tabular");
});

test("puts a specimen of every role in every view, at the frame's density", async ({ page }) => {
  await openTypePanel(page);
  for (const pair of [...VIEW_PAIRS].reverse()) {
    await showViews(page, pair);
    for (const frame of pair) {
      const specimens = page.locator(`[data-frame="${frame}"] [data-testid="type-specimens"]`);
      await expect(specimens.locator("tbody tr")).toHaveCount(6);
      await expect(specimens.locator('[data-specimen="numeric"]')).toBeVisible();
    }
  }

  // The size a specimen is drawn at is the size the panel says, and the
  // direction is the frame's.
  const cell = page.locator('[data-frame="dark-rtl"] [data-specimen="body"]');
  await expect(cell).toHaveCSS("font-size", "14px");
  const rtlDirection = await cell.evaluate((element) => getComputedStyle(element).direction);
  expect(rtlDirection).toBe("rtl");

  // Working roles follow density; reading roles do not.
  await page.getByRole("radio", { name: "compact", exact: true }).click();
  await expect(page.locator('[data-testid="type-size-label"]')).toHaveText("11px");
  await expect(page.locator('[data-testid="type-size-body"]')).toHaveText("14px");
  await expect(page.locator('[data-frame="light-ltr"] [data-specimen="label"]')).toHaveCSS("font-size", "11px");

  await page.getByRole("radio", { name: "comfortable", exact: true }).click();
  await expect(page.locator('[data-testid="type-size-label"]')).toHaveText("13px");
  await expect(page.locator('[data-testid="type-size-body"]')).toHaveText("14px");
});

test("the reading scale moves the reading roles only", async ({ page }) => {
  await openTypePanel(page);
  await expect(page.locator('[data-testid="type-size-display"]')).toHaveText("27px");

  const ratio = page.getByRole("slider", { name: "Reading scale ratio" });
  await ratio.focus();
  // The slider is in steps of 0.001 over 1.125 to 1.333; End is the top.
  await page.keyboard.press("End");
  await expect(page.locator('[data-testid="type-size-display"]')).toHaveText("33px");
  await expect(page.locator('[data-testid="type-size-numeric"]')).toHaveText("13px");
  await expect(page.locator('[data-frame="dark-rtl"] [data-specimen="display"]')).toHaveCSS("font-size", "33px");
});

test("computes size-adjust for an Arabic pairing from the two x-heights", async ({ page }) => {
  await openTypePanel(page);
  await page.locator('[data-role="body"] > summary').click();
  await page.getByLabel("Body Arabic pairing").getByRole("radio", { name: "IBM Plex Sans Arabic" }).click();

  // Both faces state x-height 516 over 1000 units, so the pairing needs no
  // adjustment, and the panel says where the number came from.
  await expect(page.locator('[data-testid="type-size-adjust-body"]')).toContainText("size-adjust 100%");
  await expect(page.locator('[data-testid="type-size-adjust-body"]')).toContainText("from the two x-heights");

  // The pairing is in the stack the frames use.
  const family = await page
    .locator('[data-frame="dark-rtl"] [data-specimen="body"]')
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(family).toContain("IBM Plex Sans Arabic");
});

test("a snapshot carries the font references and the roles, and no font bytes", async ({ page }) => {
  await openTypePanel(page);
  await page.locator('[data-testid="type-font-file"]').setInputFiles(FIXTURES.latin);
  await expect(page.locator('[data-testid="type-report"]')).toContainText("Inter Variable", { timeout: 30_000 });

  // The save is answered here rather than by the dev server, so the test
  // reads the payload without leaving a snapshot file behind.
  let payload: string | null = null;
  await page.route("**/api/save", async (route) => {
    payload = route.request().postData();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ path: "apps/playground/snapshots/test.json", commit: "0".repeat(40), dirty: true }),
    });
  });
  await openTab(page, "Snapshot");
  await page.getByRole("button", { name: "Save snapshot" }).click();
  await expect.poll(() => payload !== null).toBe(true);

  const body = JSON.parse(payload ?? "{}") as {
    panels?: { type?: { roles?: Record<string, unknown>; fonts?: { family: string; sfntBytes: number }[] } };
  };
  const type = body.panels?.type;
  expect(Object.keys(type?.roles ?? {})).toEqual(["display", "heading", "body", "label", "numeric", "code"]);
  expect(type?.fonts?.map((font) => font.family)).toContain("Inter Variable");
  // References: a byte count, not the bytes, and nothing base64 anywhere.
  expect(type?.fonts?.every((font) => typeof font.sfntBytes === "number")).toBe(true);
  expect(payload ?? "").not.toMatch(/base64|d09GMg/);
  expect((payload ?? "").length).toBeLessThan(80_000);
});

test("measures the canvas routes for a proportional numeric face", async ({ page }) => {
  await openTypePanel(page);
  await page.locator('[data-testid="type-font-file"]').setInputFiles(FIXTURES.latin);
  await expect(page.locator('[data-testid="type-report"]')).toContainText("Inter Variable", { timeout: 30_000 });

  // Point the numeric role at the loaded face, which is proportional until
  // tnum is asked for, and at the frames' mono variable so Ladder uses it.
  await page.locator('[data-role="numeric"] > summary').click();
  await page.getByLabel("Numeric family").getByRole("radio", { name: "Inter Variable (loaded)" }).click();
  await page.getByRole("radio", { name: "The numeric role's face" }).click();

  await page.getByRole("button", { name: "Measure the canvas" }).click();
  const report = page.locator('[data-testid="type-canvas-report"]');
  await expect(report).toBeVisible();

  // The face as loaded draws proportional digits on canvas; the face
  // registered with the feature draws them at one advance.
  await expect(report.locator('[data-route="plain"]')).toContainText("not tabular");
  await expect(report.locator('[data-route="descriptor"]')).toContainText("tabular");
  await expect(page.locator('[data-testid="type-canvas-verdict"]')).toContainText("reached canvas");
  // Ladder draws with the frames' mono variable, which now names that face.
  await expect(page.locator('[data-testid="type-canvas-ladder"]')).toContainText("Ladder draws with");
});
