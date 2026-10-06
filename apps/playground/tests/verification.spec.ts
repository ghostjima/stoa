// The acceptance test of brief 06, the verification panel: an override
// that breaks a text pair shows a new failure in the browser checks, and
// resetting it clears the failure. `smoke.spec.ts` covers the rest of the
// playground; this file is the in-browser checks' own scenario.
import { execSync } from "node:child_process";
import { expect, test, type Locator, type Page } from "@playwright/test";

/** The side panel is tabbed; a control is reachable once its tab is open. */
const openTab = (page: Page, name: string | RegExp) => page.getByRole("tab", { name }).click();

const TOKEN = "semantic.light:color.text";
// text on surface needs 7:1 (AAA); this is close to the surface colour, so
// the pair fails without needing to know the surface's exact value.
const BROKEN_VALUE = "oklch(0.98 0.002 250)";

test("an override that breaks a text pair shows a new failure, and resetting it clears the failure", async ({ page }) => {
  await page.goto("/");
  await openTab(page, "Checks");
  const checks = page.getByTestId("browser-checks");
  await expect(checks).toBeVisible();

  const failedRow = checks.locator('tr[data-check="text-contrast/light/text-on-surface"]');
  await expect(failedRow).toHaveAttribute("data-status", "pass");
  await expect(checks.locator('[data-status="new"]')).toHaveCount(0);

  await openTab(page, "Tokens");
  await page.locator(`[data-token="${TOKEN}"] input`).fill(BROKEN_VALUE);
  await openTab(page, "Checks");

  await expect(failedRow).toHaveAttribute("data-status", "new");
  await expect.poll(() => checks.locator('[data-status="new"]').count()).toBeGreaterThan(0);

  // Selecting the failure highlights the token it reads.
  await failedRow.getByRole("button", { name: "Highlight" }).click();
  await expect(page.locator(`[data-token="${TOKEN}"]`)).toHaveAttribute("data-highlighted", "true");

  // Highlight opens the Tokens tab; the override is reset from its list.
  await expect(page.getByRole("tab", { name: "Tokens" })).toHaveAttribute("aria-selected", "true");
  await openTab(page, /^Overrides/);
  await page.locator(`[data-override="${TOKEN}"]`).getByRole("button", { name: "Reset" }).click();

  await expect(failedRow).toHaveAttribute("data-status", "pass");
  await expect(checks.locator('[data-status="new"]')).toHaveCount(0);
});

test("the new-only filter hides everything but new failures", async ({ page }) => {
  await page.goto("/");
  await openTab(page, "Checks");
  const checks = page.getByTestId("browser-checks");
  await expect(checks).toBeVisible();
  await expect(checks.locator("tbody tr")).not.toHaveCount(0);

  await openTab(page, "Tokens");
  await page.locator(`[data-token="${TOKEN}"] input`).fill(BROKEN_VALUE);
  await openTab(page, "Checks");
  await expect.poll(() => checks.locator('[data-status="new"]').count()).toBeGreaterThan(0);
  const newCount = await checks.locator('[data-status="new"]').count();

  await checks.getByRole("radio", { name: "New only" }).click();
  await expect(checks.locator("tbody tr")).toHaveCount(newCount);
  for (const row of await checks.locator("tbody tr").all()) await expect(row).toHaveAttribute("data-status", "new");
});

test("each frame offers a colour-vision preview", async ({ page }) => {
  await page.goto("/");
  const frame = page.locator('[data-frame="light-ltr"]');
  await expect(frame).toHaveAttribute("data-cvd", "none");

  await page.getByRole("radio", { name: "Deutan" }).first().click();
  await expect(frame).toHaveAttribute("data-cvd", "deuteranopia");
  await expect(frame).toHaveCSS("filter", /url\("?#pg-cvd-deuteranopia"?\)/);
});

test("each frame can preview reduced motion, without touching the other", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('[data-slot="1"]');
  const body = first.locator("[data-frame]");
  const duration = (frame: typeof body) =>
    frame.evaluate((element) => getComputedStyle(element).getPropertyValue("--stoa-motion-duration-fast").trim());
  expect(await duration(body)).not.toBe("0ms");

  await first.getByRole("button", { name: "Reduced motion" }).click();
  await expect(first.getByRole("button", { name: "Reduced motion" })).toHaveAttribute("aria-pressed", "true");
  await expect(body).toHaveAttribute("data-motion", "reduce");
  expect(await duration(body)).toBe("0ms");
  // The buttons inside the frame stop animating their fill.
  await expect(body.getByRole("button", { name: "Send" })).toHaveCSS("transition-duration", "0s");
  // The other frame keeps its motion.
  expect(await duration(page.locator('[data-slot="2"] [data-frame]'))).not.toBe("0ms");
});

/** The cost label's figure in ms, or null while it reads "not yet timed". */
async function costMs(cost: Locator): Promise<number | null> {
  const match = /\d+ checks in ([\d.]+) ms/.exec((await cost.textContent()) ?? "");
  return match ? Number(match[1]) : null;
}

test("logs how long full check runs took, for the acceptance record", async ({ page, browser }) => {
  await page.goto("/");
  await openTab(page, "Checks");
  const checks = page.getByTestId("browser-checks");
  const cost = page.getByTestId("browser-checks-cost");
  await expect(cost).toBeVisible();

  // The mount-time result is computed without being timed; the label reads
  // a figure only once the first debounced run (120 ms) has finished.
  await expect.poll(() => costMs(cost)).toBeGreaterThan(0);
  const samples = [(await costMs(cost)) as number];

  // Further runs, each one debounced re-run of all checks after an edit:
  // break a pair, wait for the panel to show it, read the figure; reset,
  // wait again, read again.
  const failedRow = checks.locator('tr[data-check="text-contrast/light/text-on-surface"]');
  for (let i = 0; i < 5; i++) {
    await openTab(page, "Tokens");
    await page.locator(`[data-token="${TOKEN}"] input`).fill(BROKEN_VALUE);
    await expect(failedRow).toHaveAttribute("data-status", "new");
    samples.push((await costMs(cost)) as number);
    await openTab(page, /^Overrides/);
    await page.locator(`[data-override="${TOKEN}"]`).getByRole("button", { name: "Reset" }).click();
    await expect(failedRow).toHaveAttribute("data-status", "pass");
    samples.push((await costMs(cost)) as number);
  }

  const commit = execSync("git rev-parse HEAD").toString().trim();
  const dirty = execSync("git status --porcelain").toString().trim() !== "";
  const count = /(\d+) checks/.exec((await cost.textContent()) ?? "")?.[1];
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log(
    `brief 06 acceptance: ${count} checks per run, ${samples.length} runs, ms min ${sorted[0]} median ${median} max ${sorted.at(-1)}` +
      ` (all: ${samples.join(", ")}) on ${browser.browserType().name()} ${browser.version()},` +
      ` commit ${commit}${dirty ? " (working tree dirty)" : ""}`,
  );
  for (const ms of samples) expect(ms).toBeGreaterThan(0);
});

test("a token control's list of rules reading it reaches assistive technology", async ({ page }) => {
  await page.goto("/");
  await openTab(page, "Tokens");
  const input = page.locator(`[data-token="${TOKEN}"] input`);
  // The list is drawn only while the field is edited; the description is
  // there either way.
  await expect(input).toHaveAccessibleDescription(/text-contrast \(light\): text on surface/);
});

test("editing a token's field shows the checks reading it beside the side panel", async ({ page }) => {
  await page.goto("/");
  await openTab(page, "Tokens");
  const tooltip = page.getByTestId("rules-tooltip");
  await expect(tooltip).toHaveCount(0);

  const input = page.locator(`[data-token="${TOKEN}"] input`);
  await input.click();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("text-contrast (light): text on surface");
  // Beside the side panel, not over it.
  const side = await page.locator(".pg-side").boundingBox();
  const tip = await tooltip.boundingBox();
  expect(tip!.x).toBeGreaterThanOrEqual(side!.x + side!.width);

  // Moving to the next field moves the tooltip with it; leaving the
  // fields closes it.
  await page.keyboard.press("Tab");
  await expect(tooltip).toHaveCount(1);
  await expect(tooltip).toContainText("Checks reading text-muted");
  await page.locator("h1").click();
  await expect(tooltip).toHaveCount(0);
});
