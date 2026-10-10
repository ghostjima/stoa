// The built Storybook's Content Security Policy
// (scripts/storybook-csp.mjs), in a browser: the policy each of its two
// pages states, the script hashes against the inline scripts as the
// browser reads them, no violation in any story or in Storybook's own
// interface, and what the policy refuses.
//
// The policy is written by `pnpm build-storybook`; a build made with
// `storybook build` alone has none, and the first test says so.
import { createHash } from "node:crypto";
import { expect, test, type Frame, type Page } from "@playwright/test";

type Entry = { id: string; type: string };

const hashSource = (text: string) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

/** Storybook's own interface and the page the stories run in. */
const PAGES = [
  { name: "the manager", path: "/index.html", frames: "'self'" },
  { name: "the preview", path: "/iframe.html", frames: "'none'" },
] as const;

/** What went wrong since `watch`, in the page and in every frame in it:
 * the policy's violations as the browser reports them to each document,
 * and errors on the console (the browser writes one for each violation
 * too) or thrown. */
type Seen = { violations: string[]; errors: string[] };

async function watch(page: Page): Promise<Seen> {
  const seen: Seen = { violations: [], errors: [] };
  await page.exposeFunction("reportViolation", (violation: string) => {
    seen.violations.push(violation);
  });
  await page.addInitScript(() => {
    const report = (window as unknown as { reportViolation: (violation: string) => void }).reportViolation;
    document.addEventListener("securitypolicyviolation", (event) => {
      report(`${location.pathname} ${event.effectiveDirective} ${event.blockedURI}${event.sample ? ` ${event.sample}` : ""}`);
    });
  });
  page.on("console", (message) => {
    if (message.type() === "error") seen.errors.push(message.text());
  });
  page.on("pageerror", (error) => {
    seen.errors.push(error.message);
  });
  return seen;
}

async function storyIds(page: Page) {
  const response = await page.request.get("/index.json");
  expect(response.ok(), "index.json of the built Storybook").toBe(true);
  const index = (await response.json()) as { entries: Record<string, Entry> };
  return Object.values(index.entries)
    .filter((e) => e.type === "story")
    .map((e) => e.id);
}

/** The policy a document states, by directive. */
async function statedPolicy(document: Page | Frame): Promise<Record<string, string[]>> {
  const content = await document.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content", { timeout: 5_000 });
  return Object.fromEntries((content ?? "").split("; ").map((directive) => [directive.split(" ")[0] ?? "", directive.split(" ").slice(1)]));
}

for (const { name, path, frames } of PAGES) {
  test(`${name} states its policy first in the head, and the script hashes are the hashes of its inline scripts`, async ({ page }) => {
    const html = await (await page.request.get(path)).text();
    expect(html, "no policy in the page: build with `pnpm build-storybook`, which writes it").toContain('http-equiv="Content-Security-Policy"');
    // In the file as served: the charset, then the policy, then anything
    // that loads or runs.
    const at = (pattern: RegExp) => html.search(pattern);
    expect(at(/<meta charset=/)).toBeGreaterThan(-1);
    expect(at(/<meta charset=/)).toBeLessThan(at(/<meta http-equiv="Content-Security-Policy"/));
    expect(at(/<meta http-equiv="Content-Security-Policy"/)).toBeLessThan(at(/<(script|link|style)\b/));
    expect(html.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1);
    expect(Buffer.byteLength(html.slice(0, at(/<meta charset=/)))).toBeLessThan(1000);

    await page.goto(path);
    const scripts = await page.evaluate(() => [...document.scripts].filter((script) => !script.src).map((script) => script.textContent ?? ""));
    expect(scripts.length).toBeGreaterThan(0);
    const policy = await statedPolicy(page);
    // Every hash in script-src is an inline script of the page and every
    // inline script has its hash: none missing, none stale.
    expect(policy["script-src"]).toEqual(["'self'", ...scripts.map(hashSource)]);
    expect(policy).toEqual({
      "default-src": ["'self'"],
      "script-src": policy["script-src"],
      "style-src-elem": ["'self'", "'unsafe-inline'"],
      "style-src-attr": ["'none'"],
      "img-src": ["'self'", "data:"],
      "font-src": ["'self'"],
      "connect-src": ["'self'"],
      "frame-src": [frames],
      "worker-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'none'"],
      "object-src": ["'none'"],
    });
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });
}

// Every story once, as the build's own index.json lists them, so a new
// story is swept without being named here. The policy does not depend on
// the theme, the direction or the language; the second test takes every
// tenth story through dark, right to left and Arabic all the same.
test("no policy violation and no console error in any story", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const seen = await watch(page);
  const ids = await storyIds(page);
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expect(page.locator("#storybook-root > *").first()).toBeAttached();
    expect(await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay")), id).toBe(false);
    await page.evaluate(() => document.fonts.ready);
    expect(seen.violations, id).toEqual([]);
    expect(seen.errors, id).toEqual([]);
  }
});

test("no policy violation in dark, right to left and Arabic", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const seen = await watch(page);
  const ids = (await storyIds(page)).filter((_, index) => index % 10 === 0);
  for (const id of ids) {
    await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:dark;dir:rtl;lang:ar`);
    await expect(page.locator("#storybook-root > *").first()).toBeAttached();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.evaluate(() => document.fonts.ready);
    expect(seen.violations, id).toEqual([]);
    expect(seen.errors, id).toEqual([]);
  }
});

// Storybook's own interface with a story open in it: the toolbar's
// theme, density, direction and language, its background and viewport
// tools, the panels under the story, the search and the settings pages.
test("no policy violation in Storybook's interface, around a story", async ({ page }) => {
  const seen = await watch(page);
  const ids = await storyIds(page);
  await page.goto(`/?path=/story/${ids[0]}`);
  const preview = page.frameLocator("#storybook-preview-iframe");
  await expect(preview.locator("#storybook-root > *").first()).toBeAttached();

  // The toolbar's own switches, each a menu: the last option of each.
  for (const [label, attribute, value] of [
    ["Colour theme", "data-theme", "dark"],
    ["Density", "data-density", "comfortable"],
    ["Direction", "dir", "rtl"],
    ["Language of Stoa's words", "lang", "ar"],
  ] as const) {
    await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    await page.getByRole("option", { name: value, exact: true }).or(page.getByRole("menuitem", { name: value, exact: true })).or(page.getByRole("button", { name: value, exact: true })).first().click();
    await expect(preview.locator("html")).toHaveAttribute(attribute, value);
  }
  // Storybook's background and viewport tools, which style the preview.
  for (const label of ["Preview background", "Viewport size"]) {
    await page.getByRole("button", { name: label }).click();
    await page.getByRole("option").or(page.getByRole("menuitem")).last().click();
    await page.keyboard.press("Escape");
  }
  // The panels under the story, another story from the sidebar's search,
  // and the settings pages.
  for (const tab of ["Actions", "Interactions", "Controls"]) await page.getByRole("tab", { name: tab, exact: true }).click();
  await page.goto(`/?path=/story/${ids[ids.length - 1]}`);
  await expect(preview.locator("#storybook-root > *").first()).toBeAttached();
  for (const settings of ["about", "shortcuts"]) {
    await page.goto(`/?path=/settings/${settings}`);
    await expect(page.locator("#root")).not.toBeEmpty();
  }

  expect(seen.violations).toEqual([]);
  expect(seen.errors).toEqual([]);
});

for (const { name, path } of PAGES) {
  test(`${name} refuses injected scripts, handlers, eval, style attributes and anything from another origin`, async ({ page }) => {
    const seen = await watch(page);
    const ids = await storyIds(page);
    await page.goto(path === "/iframe.html" ? `/iframe.html?id=${ids[0]}&viewMode=story` : `/?path=/story/${ids[0]}`);
    await expect((path === "/iframe.html" ? page : page.frameLocator("#storybook-preview-iframe")).locator("#storybook-root > *").first()).toBeAttached();
    expect(seen.violations).toEqual([]);

    const outcome = await page.evaluate(async () => {
      const marks = window as unknown as { injectedScript?: boolean; injectedHandler?: boolean };
      const result: Record<string, unknown> = {};

      // An inline script element, as markup injected into the page would add.
      const inline = document.createElement("script");
      inline.textContent = "window.injectedScript = true;";
      document.head.append(inline);
      result.inlineScript = marks.injectedScript === true ? "ran" : "blocked";

      // An inline event handler.
      const button = document.createElement("button");
      button.setAttribute("onclick", "window.injectedHandler = true;");
      document.body.append(button);
      button.click();
      button.remove();
      result.inlineHandler = marks.injectedHandler === true ? "ran" : "blocked";

      // eval and the Function constructor. From a timer, as the page's
      // own code would call them: called straight from the test's
      // evaluation, the browser's debugger lets them through.
      const attempt = (run: () => unknown) => {
        try {
          run();
          return "ran";
        } catch (error) {
          return error instanceof Error ? error.name : "thrown";
        }
      };
      const later = (run: () => unknown) => new Promise<string>((resolve) => setTimeout(() => resolve(attempt(run)), 0));
      result.eval = await later(() => (0, eval)("1 + 1"));
      result.functionConstructor = await later(() => new Function("return 1")());

      // A script, a stylesheet and an image from another origin, and a
      // request to one. `.invalid` never resolves; the policy refuses
      // each before any request is made.
      const loaded = (el: HTMLElement) =>
        new Promise<string>((resolve) => {
          el.addEventListener("load", () => resolve("loaded"));
          el.addEventListener("error", () => resolve("blocked"));
          document.head.append(el);
        });
      const script = document.createElement("script");
      script.src = "https://script.invalid/x.js";
      result.foreignScript = await loaded(script);
      const sheet = document.createElement("link");
      sheet.rel = "stylesheet";
      sheet.href = "https://style.invalid/x.css";
      result.foreignStylesheet = await loaded(sheet);
      const image = document.createElement("img");
      image.src = "https://image.invalid/x.png";
      result.foreignImage = await loaded(image);
      result.foreignRequest = await fetch("https://connect.invalid/").then(
        () => "sent",
        () => "blocked",
      );

      // A style attribute set as markup would set it. (A style element
      // is allowed in the built Storybook: see scripts/storybook-csp.mjs.)
      const box = document.createElement("div");
      box.setAttribute("style", "outline: 7px solid red;");
      document.body.append(box);
      result.styleAttribute = getComputedStyle(box).outlineWidth === "7px" ? "applied" : "blocked";
      box.remove();

      // A base element that would move the page's relative URLs.
      const base = document.createElement("base");
      base.href = "https://base.invalid/";
      document.head.append(base);
      result.base = document.baseURI.startsWith("https://base.invalid") ? "applied" : "blocked";
      base.remove();

      // A worker from one of the build's own files, a frame of another
      // origin and a plugin.
      result.worker = await new Promise<string>((resolve) => {
        const worker = new Worker("./sb-manager/runtime.js", { type: "module" });
        worker.addEventListener("error", () => resolve("blocked"));
        setTimeout(() => resolve("started"), 2_000);
      });
      const frame = document.createElement("iframe");
      frame.src = "https://frame.invalid/";
      document.body.append(frame);
      const object = document.createElement("object");
      object.data = "https://object.invalid/x.swf";
      document.body.append(object);
      return result;
    });

    expect(outcome).toEqual({
      inlineScript: "blocked",
      inlineHandler: "blocked",
      eval: "EvalError",
      functionConstructor: "EvalError",
      foreignScript: "blocked",
      foreignStylesheet: "blocked",
      foreignImage: "blocked",
      foreignRequest: "blocked",
      styleAttribute: "blocked",
      base: "blocked",
      worker: "blocked",
    });
    await expect
      .poll(() => [...new Set(seen.violations.map((violation) => violation.split(" ")[1]))].sort())
      .toEqual(["base-uri", "connect-src", "frame-src", "img-src", "object-src", "script-src", "script-src-attr", "script-src-elem", "style-src-attr", "style-src-elem", "worker-src"]);
  });
}
