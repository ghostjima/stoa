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

for (const mode of [
  { name: "left to right", globals: "", caption: "Coupon income after tax, one bond" },
  { name: "right to left", globals: "dir:rtl;lang:ar", caption: "دخل القسيمة بعد الضريبة، سند واحد" },
]) {
  test(`at 375 px the steps are stacked, a label beside each value, with nothing wider than the screen (${mode.name})`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(story("data-derivationtable--coupon-after-tax", mode.globals));
    const list = page.getByRole("list", { name: mode.caption });
    await expect(list).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(list.getByRole("listitem")).toHaveCount(5);
    const layout = await list.evaluate((el) => {
      const rtl = getComputedStyle(el).direction === "rtl";
      const rows = [...el.querySelectorAll("li")[0]!.querySelectorAll("dt")].map((dt) => {
        const dd = dt.nextElementSibling!;
        const [t, d] = [dt.getBoundingClientRect(), dd.getBoundingClientRect()];
        // The value sits beside its label, on its inline-end side.
        return { sameRow: Math.abs(t.top - d.top) < 2, after: rtl ? d.right <= t.left : d.left >= t.right };
      });
      return { rows, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(layout.rows).toHaveLength(3);
    for (const row of layout.rows) expect(row).toEqual({ sameRow: true, after: true });
    expect(layout.overflow).toBe(0);
  });
}

test("at 375 px Copy puts the same plain text on the clipboard as the table does", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(story("data-derivationtable--coupon-after-tax"));
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  const wide = await page.evaluate(() => navigator.clipboard.readText());
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(wide);
});
