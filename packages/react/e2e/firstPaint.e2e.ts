// The first-paint script in a real browser: a page that inlines it has its
// language, direction and theme in place in its first animation frame,
// before anything else runs, and preloads the chosen language's fonts.
// The page is served by the test itself, from a made-up origin.
import { expect, test } from "@playwright/test";
import { firstPaintScript, type FirstPaintConfig } from "../src/firstPaint";

const CONFIG: FirstPaintConfig = {
  languages: ["ru", "en", "ar"],
  language: { storageKey: "app.lang" },
  theme: { storageKey: "app.theme" },
  fonts: { ar: ["/fonts/arabic.woff2"] },
};

const ORIGIN = "http://first-paint.test";

const page = (script: string) => `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <script>${script}</script>
    <script>
      requestAnimationFrame(function () {
        var root = document.documentElement;
        window.firstFrame = {
          lang: root.lang,
          dir: root.dir,
          theme: root.getAttribute("data-theme"),
          preloads: [].map.call(document.querySelectorAll('link[rel="preload"]'), function (l) { return l.getAttribute("href"); }),
        };
      });
    </script>
  </head>
  <body><p>Page</p></body>
</html>`;

test.beforeEach(async ({ page: p }) => {
  await p.route(`${ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/fonts/")) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ contentType: "text/html", body: page(firstPaintScript(CONFIG)) });
  });
});

test("the first frame is already in the language, direction and theme from the URL", async ({ page: p }) => {
  await p.goto(`${ORIGIN}/?lang=ar&theme=dark`);
  await expect.poll(() => p.evaluate(() => (window as unknown as { firstFrame?: unknown }).firstFrame)).toEqual({
    lang: "ar",
    dir: "rtl",
    theme: "dark",
    preloads: ["/fonts/arabic.woff2"],
  });
});

test("the next visit's first frame takes the stored choice", async ({ page: p }) => {
  await p.goto(`${ORIGIN}/`);
  await p.evaluate(() => {
    localStorage.setItem("app.lang", "en");
    localStorage.setItem("app.theme", "light");
  });
  await p.goto(`${ORIGIN}/`);
  await expect.poll(() => p.evaluate(() => (window as unknown as { firstFrame?: unknown }).firstFrame)).toEqual({
    lang: "en",
    dir: "ltr",
    theme: "light",
    preloads: [],
  });
});
