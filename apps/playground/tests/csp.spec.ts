// The built page's Content Security Policy (server/csp.ts), in a browser,
// against `vite preview` of the build (the `build` project in
// playwright.config.ts): the policy the page states, no violation on any
// screen, in any view or language, with the font engine at work, and what
// the policy refuses.
//
// The dev server's endpoints do not exist in a preview, so the three the
// page asks on its own are answered here.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { SCREEN_KEYS, VIEW_PAIRS, showLanguage, showScreen, showViews } from "./frames";

const hashSource = (text: string) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

/** What went wrong on the page since `watch`: the policy's violations as
 * the browser reports them to the document, and errors on the console
 * (the browser writes one for each violation too) or thrown. */
type Seen = { violations: string[]; errors: string[] };

async function watch(page: Page): Promise<Seen> {
  const seen: Seen = { violations: [], errors: [] };
  await page.exposeFunction("reportViolation", (violation: string) => {
    seen.violations.push(violation);
  });
  await page.addInitScript(() => {
    const report = (window as unknown as { reportViolation: (violation: string) => void }).reportViolation;
    document.addEventListener("securitypolicyviolation", (event) => {
      report(`${event.effectiveDirective} ${event.blockedURI}${event.sample ? ` ${event.sample}` : ""}`);
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

/** The dev server's answers the page asks for on load and in its tabs. */
async function answerEndpoints(page: Page) {
  const json = (body: unknown) => ({ contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/commit", (route) => route.fulfill(json({ commit: "0000000", dirty: false })));
  await page.route("**/api/snapshots", (route) => route.fulfill(json({ names: [] })));
}

/** The policy the page states, by directive. */
async function statedPolicy(page: Page): Promise<Record<string, string[]>> {
  const content = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  return Object.fromEntries((content ?? "").split("; ").map((directive) => [directive.split(" ")[0] ?? "", directive.split(" ").slice(1)]));
}

const styleElements = (page: Page) => page.evaluate(() => [...document.querySelectorAll("style")].map((style) => style.textContent ?? ""));

async function expectStylesAllowed(page: Page) {
  const allowed = (await statedPolicy(page))["style-src"] ?? [];
  const styles = await styleElements(page);
  expect(styles.length).toBeGreaterThan(0);
  for (const style of styles) expect(allowed, `the policy has no hash for this style element:\n${style}`).toContain(hashSource(style));
}

const openTab = (page: Page, name: string | RegExp) => page.getByRole("tab", { name }).click();

test("the page states its policy right after the charset, with a hash for every inline script", async ({ page }) => {
  await answerEndpoints(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stoa System", level: 1 })).toBeVisible();
  // In the file as served: after the charset, before every script,
  // stylesheet and link.
  const html = await (await page.request.get("/")).text();
  const at = (pattern: RegExp) => html.search(pattern);
  expect(at(/<meta charset=/)).toBeGreaterThan(-1);
  expect(at(/<meta charset=/)).toBeLessThan(at(/<meta http-equiv="Content-Security-Policy"/));
  expect(at(/<meta http-equiv="Content-Security-Policy"/)).toBeLessThan(at(/<(script|link|style)\b/));
  expect(html.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1);

  // The page has no inline script today; one added later has to appear
  // here with its hash, none missing and none stale.
  const scripts = await page.evaluate(() => [...document.scripts].filter((script) => !script.src).map((script) => script.textContent ?? ""));
  const policy = await statedPolicy(page);
  expect(policy["script-src"]).toEqual(["'self'", ...scripts.map(hashSource)]);
  expect(policy).toEqual({
    "default-src": ["'self'"],
    "script-src": policy["script-src"],
    "style-src": ["'self'", "'sha256-38RhXrc7EdReTKsOm23ZPOCUgniTUUcjky8QOOrQx6o='", "'sha256-gYiS/BvZvRcK27JIXTuwhZ3hs2+VJ1X+2gUlE+farlg='"],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", "https://api.fontsource.org", "https://cdn.jsdelivr.net"],
    "worker-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'none'"],
    "object-src": ["'none'"],
  });
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
});

test("no policy violation and no console error on any screen, in the four views and the three languages", async ({ page }) => {
  const seen = await watch(page);
  await answerEndpoints(page);
  await page.goto("/");
  await expect(page.locator("[data-frame]")).toHaveCount(2);

  // Every screen, in light and dark, left to right and right to left.
  for (const screen of SCREEN_KEYS) {
    await showScreen(page, screen);
    for (const pair of VIEW_PAIRS) await showViews(page, pair);
  }
  // The overlays, which React Aria portals into their frame.
  await showScreen(page, "overlays");
  const first = page.locator('[data-slot="1"]');
  for (const [button, role] of [
    ["Order details", "dialog"],
    ["Filters", "dialog"],
    ["Cancel all orders", "alertdialog"],
  ] as const) {
    await first.getByRole("button", { name: button }).click();
    await expect(page.getByRole(role)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole(role)).toHaveCount(0);
  }
  // The frames in Russian and Arabic, then the chrome in Russian.
  await showLanguage(page, 1, "ru");
  await showLanguage(page, 2, "ar");
  await showScreen(page, "market");
  await showScreen(page, "grid");
  await page.getByRole("radiogroup", { name: "Playground language" }).getByRole("radio", { name: "RU" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.getByRole("radiogroup", { name: "Язык песочницы" }).getByRole("radio", { name: "EN" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // The side panel's tabs: an override, and the checks run in the page.
  await openTab(page, "Tokens");
  await page.locator('[data-token="primitive:color.teal.wash"] input').fill("oklch(0.55 0.2 300 / 0.3)");
  await openTab(page, /^Overrides/);
  await expect(page.locator('[data-override-count="1"]')).toBeVisible();
  await openTab(page, "Checks");
  await openTab(page, "Snapshot");
  await openTab(page, "Stats");

  await expectStylesAllowed(page);
  expect(seen.violations).toEqual([]);
  expect(seen.errors).toEqual([]);
});

// HarfBuzz and the WOFF2 decoder are WebAssembly, in the font worker. The
// page's policy has no 'wasm-unsafe-eval', and they run: a worker takes
// its policy from its own script, not from the page.
test("the font engine's WebAssembly runs in its worker, and a dropped font is loaded from its bytes", async ({ page }) => {
  const seen = await watch(page);
  await answerEndpoints(page);
  await page.goto("/");
  await openTab(page, "Type");
  await expect(page.locator('[data-testid="type-loaded"] [data-font]')).toHaveCount(3, { timeout: 30_000 });
  await page.locator('[data-testid="type-loaded"]').getByRole("button", { name: "IBM Plex Sans", exact: true }).click();
  await expect(page.locator('[data-testid="type-metrics"]')).toContainText("1000 units per em");

  // A WOFF2 dropped on the panel: decoded in the worker, then registered
  // with FontFace from its bytes, which font-src does not see as a request.
  await page.locator('[data-testid="type-font-file"]').setInputFiles("src/type/testdata/NotoSansArabic-digits-subset.woff2");
  await expect(page.locator('[data-testid="type-loaded"] [data-font]')).toHaveCount(4);

  expect(seen.violations).toEqual([]);
  expect(seen.errors).toEqual([]);
});

// The one feature that leaves the page's origin: a family from the
// Fontsource catalogue. Both hosts are answered here, so the test needs no
// network; the policy is checked before a request is made either way.
test("a catalogue font is fetched from the two hosts the policy names, and from no other", async ({ page }) => {
  const seen = await watch(page);
  await answerEndpoints(page);
  const cors = { "access-control-allow-origin": "*" };
  const file = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2";
  await page.route("https://api.fontsource.org/v1/fonts/inter", (route) =>
    route.fulfill({ headers: cors, contentType: "application/json", body: JSON.stringify({ id: "inter", family: "Inter", license: { type: "OFL-1.1" }, variants: { 400: { normal: { latin: { url: { woff2: file } } } } } }) }),
  );
  await page.route("https://api.fontsource.org/v1/variable/inter", (route) => route.fulfill({ headers: cors, contentType: "application/json", body: JSON.stringify({ axes: {} }) }));
  await page.route(file, (route) => route.fulfill({ headers: cors, contentType: "font/woff2", body: readFileSync("src/type/testdata/NotoSansArabic-digits-subset.woff2") }));

  await page.goto("/");
  await openTab(page, "Type");
  await expect(page.locator('[data-testid="type-loaded"] [data-font]')).toHaveCount(3, { timeout: 30_000 });
  await page.getByLabel("Fontsource id").fill("inter");
  await page.getByRole("button", { name: "Load from Fontsource" }).click();
  await expect(page.locator('[data-testid="type-loaded"] [data-font]')).toHaveCount(4);
  expect(seen.violations).toEqual([]);
  expect(seen.errors).toEqual([]);

  // Any other host is refused before a request is made.
  const elsewhere = await page.evaluate(() =>
    fetch("https://connect.invalid/").then(
      () => "sent",
      () => "blocked",
    ),
  );
  expect(elsewhere).toBe("blocked");
  await expect.poll(() => seen.violations).toEqual(["connect-src https://connect.invalid/"]);
});

// React Aria adds a second style element on iOS, when an overlay opens
// (usePreventScroll). Chromium is told it is an iPhone, which is all
// React Aria asks, so the element is added here too.
test("the style element React Aria adds on iOS is one the policy names", async ({ page }) => {
  const seen = await watch(page);
  await answerEndpoints(page);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "platform", { get: () => "iPhone" });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
  await page.goto("/");
  await showScreen(page, "overlays");
  await page.locator('[data-slot="1"]').getByRole("button", { name: "Order details" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const styles = await styleElements(page);
  expect(styles.some((style) => style.includes("overscroll-behavior"))).toBe(true);
  expect(styles.some((style) => style.includes("touch-action"))).toBe(true);
  await expectStylesAllowed(page);
  expect(seen.violations).toEqual([]);
});

test("the policy refuses injected scripts, handlers, eval, styles and anything from another origin", async ({ page }) => {
  const seen = await watch(page);
  await answerEndpoints(page);
  await page.goto("/");
  await expect(page.locator("[data-frame]")).toHaveCount(2);
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

    // eval, the Function constructor and WebAssembly on the page itself.
    // From a timer, as the page's own code would call them: called
    // straight from the test's evaluation, the browser's debugger lets
    // them through.
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
    // The smallest module: the magic number and the version.
    result.webAssembly = await later(() => new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])));

    // A script, a stylesheet and an image from another origin. `.invalid`
    // never resolves; the policy refuses each before any request is made.
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

    // An inline style element and a style attribute set as markup would.
    const style = document.createElement("style");
    style.textContent = "#root { outline: 7px solid red; }";
    document.head.append(style);
    result.inlineStyle = getComputedStyle(document.getElementById("root") ?? document.body).outlineWidth === "7px" ? "applied" : "blocked";
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

    // A plugin.
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
    webAssembly: "CompileError",
    foreignScript: "blocked",
    foreignStylesheet: "blocked",
    foreignImage: "blocked",
    inlineStyle: "blocked",
    styleAttribute: "blocked",
    base: "blocked",
  });
  // A form posted anywhere: a navigation the policy stops.
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "https://form.invalid/";
    document.body.append(form);
    form.submit();
  });
  await expect
    .poll(() => seen.violations.map((violation) => violation.split(" ")[0]).sort())
    .toEqual(["base-uri", "form-action", "img-src", "object-src", "script-src", "script-src", "script-src", "script-src-attr", "script-src-elem", "script-src-elem", "style-src-attr", "style-src-elem", "style-src-elem"]);
  expect(new URL(page.url()).pathname).toBe("/");
});
