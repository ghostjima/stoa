// DerivationTable and Countdown in a real browser, against the built
// stories: a formula keeps its left-to-right order in a right-to-left
// table, Copy puts plain text on the clipboard, and a deadline's state is
// a symbol in its colour on a surface plate, beside its words.
import { expect, test } from "@playwright/test";

const story = (id: string, globals = "") => `/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

test("right to left, the steps start at the right and each formula still reads left to right", async ({ page }) => {
  await page.goto(story("data-derivationtable--coupon-after-tax", "dir:rtl;lang:ar"));
  const table = page.getByRole("table", { name: "دخل القسيمة بعد الضريبة، سند واحد" });
  await expect(table).toBeVisible();
  const layout = await table.evaluate((el) => {
    const rect = (node: Element) => node.getBoundingClientRect();
    const row = el.querySelector("tbody tr")!;
    const [step, formula] = [row.querySelector("th")!, row.querySelectorAll("td")[0]!];
    // Where "1000" and "365" fall inside the formula's own text.
    const text = formula.querySelector("bdi")!.firstChild as Text;
    const range = document.createRange();
    const at = (word: string) => {
      const from = text.data.indexOf(word);
      range.setStart(text, from);
      range.setEnd(text, from + word.length);
      return range.getBoundingClientRect().left;
    };
    return { stepRight: rect(step).right > rect(formula).right, first: at("1000"), last: at("365") };
  });
  expect(layout.stepRight).toBe(true);
  expect(layout.first).toBeLessThan(layout.last);
});

test("Copy puts the derivation on the clipboard as plain text, and says so", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(story("data-derivationtable--coupon-after-tax"));
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n")[0]).toBe("Coupon income after tax, one bond");
  expect(text).toContain("Tax at 13%: 24.87 × 13% = 3.23 RUB (Tax Code, art. 224, revision 2025-12-01)");
  expect(text).not.toMatch(/[‎‏⁦-⁩]/);
});

test("a deadline's state is a symbol in its colour on a surface plate, and its words never wrap", async ({ page }) => {
  await page.goto(story("data-countdown--states"));
  await expect(page.locator(".stoa-countdown")).toHaveCount(5);
  const rows = await page.locator(".stoa-countdown").evaluateAll((els) =>
    els.map((el) => {
      const symbol = el.querySelector(".stoa-countdown__symbol");
      const text = el.querySelector(".stoa-countdown__text")!;
      const range = document.createRange();
      range.selectNodeContents(text);
      return {
        state: el.getAttribute("data-state"),
        symbol: symbol?.textContent ?? null,
        colour: symbol ? getComputedStyle(symbol).color : null,
        plate: symbol ? getComputedStyle(symbol).backgroundColor : null,
        lines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size,
      };
    }),
  );
  const probe = await page.evaluate(() => {
    const span = document.createElement("span");
    document.body.append(span);
    const read = (name: string) => {
      span.style.color = `var(${name})`;
      return getComputedStyle(span).color;
    };
    const out = { warning: read("--stoa-color-warning"), down: read("--stoa-color-down"), surface: read("--stoa-color-surface") };
    span.remove();
    return out;
  });
  expect(rows.map((r) => [r.state, r.symbol])).toEqual([
    ["normal", null],
    ["warning", "!"],
    ["warning", "!"],
    ["warning", "!"],
    ["overdue", "✗"],
  ]);
  for (const r of rows) {
    if (r.state === "warning") expect([r.colour, r.plate]).toEqual([probe.warning, probe.surface]);
    if (r.state === "overdue") expect([r.colour, r.plate]).toEqual([probe.down, probe.surface]);
    expect(r.lines).toBe(1);
  }
});
