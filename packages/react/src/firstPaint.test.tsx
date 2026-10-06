// @vitest-environment jsdom
// The inline first-paint script: what it sets on the root element, and
// that it reads every choice exactly as the running application does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { firstPaintScript, preloadFonts, readLanguage, readThemeChoice, useAppPreferences, type FirstPaintConfig } from "./index";

const CONFIG: FirstPaintConfig = {
  languages: ["ru", "en", "ar"],
  language: { storageKey: "tyche.lang" },
  theme: { storageKey: "tyche.theme" },
  fonts: { ar: ["/fonts/plex-arabic-400.woff2"], ru: ["/fonts/plex-cyrillic-400.woff2"] },
};

function reset(search = "") {
  const root = document.documentElement;
  root.removeAttribute("lang");
  root.removeAttribute("dir");
  root.removeAttribute("data-theme");
  document.head.querySelectorAll("link").forEach((link) => link.remove());
  localStorage.clear();
  window.history.replaceState(null, "", `/${search}`);
}

/** Runs the script as a browser runs an inline one: as a classic script,
 * in the page's global scope. */
function runScript(config: FirstPaintConfig) {
  const script = document.createElement("script");
  script.textContent = firstPaintScript(config);
  // jsdom does not run scripts by default; the text is evaluated the same
  // way, in the global scope.
  new Function(script.textContent)();
}

afterEach(() => {
  cleanup();
  reset();
});

describe("firstPaintScript", () => {
  it("sets the default language and its direction, and no theme, on a first visit", () => {
    reset();
    runScript(CONFIG);
    const root = document.documentElement;
    expect([root.lang, root.dir, root.getAttribute("data-theme")]).toEqual(["ru", "ltr", null]);
  });

  it("takes the URL over storage, sets right to left for Arabic and the chosen theme", () => {
    reset("?lang=ar&theme=dark");
    localStorage.setItem("tyche.lang", "en");
    localStorage.setItem("tyche.theme", "light");
    runScript(CONFIG);
    const root = document.documentElement;
    expect([root.lang, root.dir, root.getAttribute("data-theme")]).toEqual(["ar", "rtl", "dark"]);
  });

  it("ignores values that are not among the choices, in the URL and in storage", () => {
    reset("?lang=de&theme=sepia");
    localStorage.setItem("tyche.lang", "fr");
    localStorage.setItem("tyche.theme", "light");
    runScript(CONFIG);
    expect([document.documentElement.lang, document.documentElement.getAttribute("data-theme")]).toEqual(["ru", "light"]);
  });

  it("reads every case exactly as readLanguage and readThemeChoice do", () => {
    const cases: [string, string | null, string | null][] = [
      ["", null, null],
      ["?lang=en", null, null],
      ["", "ar", "dark"],
      ["?lang=xx&theme=system", "en", "dark"],
      ["?theme=light", "ru", null],
      ["?lang=ar", "en", "system"],
    ];
    for (const [search, lang, theme] of cases) {
      reset(search);
      if (lang) localStorage.setItem("tyche.lang", lang);
      if (theme) localStorage.setItem("tyche.theme", theme);
      runScript(CONFIG);
      const language = readLanguage(CONFIG.languages, { storageKey: "tyche.lang" });
      const choice = readThemeChoice({ storageKey: "tyche.theme" });
      expect(document.documentElement.lang, search).toBe(language);
      expect(document.documentElement.getAttribute("data-theme") ?? "system", search).toBe(choice);
    }
  });

  it("preloads the chosen language's fonts only, as WOFF2 fetched without credentials", () => {
    reset("?lang=ar");
    runScript(CONFIG);
    const links = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"]')];
    expect(links.map((l) => ["href", "as", "type", "crossorigin"].map((name) => l.getAttribute(name)))).toEqual([["/fonts/plex-arabic-400.woff2", "font", "font/woff2", "anonymous"]]);
    reset("?lang=en");
    runScript(CONFIG);
    expect(document.head.querySelectorAll("link")).toHaveLength(0);
  });

  it("works with storage blocked, and leaves the theme alone without a theme switch", () => {
    reset("?theme=dark");
    const original = Object.getOwnPropertyDescriptor(window, "localStorage")!;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      runScript({ languages: ["en", "ru"], theme: false });
      expect([document.documentElement.lang, document.documentElement.getAttribute("data-theme")]).toEqual(["en", null]);
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });

  it("cannot be ended early by the text it carries", () => {
    const text = firstPaintScript({ languages: ["en"], fonts: { en: ["/x</script><script>alert(1)</script>.woff2"] } });
    expect(text).not.toContain("</script>");
    reset();
    runScript({ languages: ["en"], fonts: { en: ["/x</script>.woff2"] } });
    expect(document.head.querySelector("link")?.getAttribute("href")).toBe("/x</script>.woff2");
  });

  it("is plain ES5, which any browser runs before the application's own code", () => {
    const text = firstPaintScript(CONFIG);
    expect(text).not.toMatch(/=>|\b(let|const|class)\b|`/);
  });

  it("is importable without React, from its own entry", () => {
    const source = readFileSync(join(__dirname, "firstPaint.ts"), "utf8");
    expect(source).not.toMatch(/from "react/);
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
    expect(pkg.exports["./first-paint"]).toEqual({ types: "./dist/firstPaint.d.ts", default: "./dist/firstPaint.js" });
  });
});

describe("preloadFonts", () => {
  it("preloads the root element's language's fonts once each", () => {
    reset();
    document.documentElement.lang = "ar";
    preloadFonts({ ar: ["/a.woff2", "/b.woff2"], en: ["/c.woff2"] });
    preloadFonts({ ar: ["/a.woff2"] });
    expect([...document.head.querySelectorAll("link")].map((l) => l.getAttribute("href"))).toEqual(["/a.woff2", "/b.woff2"]);
  });
});

describe("useAppPreferences", () => {
  it("starts from what the script set and keeps a change where the script will read it", () => {
    reset("?lang=en");
    runScript(CONFIG);
    let prefs: ReturnType<typeof useAppPreferences> | null = null;
    function Probe() {
      prefs = useAppPreferences(CONFIG);
      return null;
    }
    render(<Probe />);
    expect(prefs!.language.language).toBe("en");
    expect(prefs!.theme.choice).toBe("system");
    act(() => {
      prefs!.language.setLanguage("ar");
      prefs!.theme.setChoice("dark");
    });
    expect([document.documentElement.lang, document.documentElement.dir, document.documentElement.getAttribute("data-theme")]).toEqual(["ar", "rtl", "dark"]);
    expect([localStorage.getItem("tyche.lang"), localStorage.getItem("tyche.theme")]).toEqual(["ar", "dark"]);
    // The next visit's first paint reads the same choice.
    reset();
    localStorage.setItem("tyche.lang", "ar");
    localStorage.setItem("tyche.theme", "dark");
    runScript(CONFIG);
    expect([document.documentElement.lang, document.documentElement.getAttribute("data-theme")]).toEqual(["ar", "dark"]);
  });

  it("keeps no theme for an application without a theme switch", () => {
    reset("?theme=dark");
    let prefs: ReturnType<typeof useAppPreferences> | null = null;
    function Probe() {
      prefs = useAppPreferences({ languages: ["en"], theme: false });
      return null;
    }
    render(<Probe />);
    expect(prefs!.theme.choice).toBe("system");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});
