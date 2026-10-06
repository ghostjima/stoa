// Language, direction and theme before the first paint, and the font the
// page shows first, preloaded for its language only.
//
// An application describes its preferences once, in a FirstPaintConfig,
// and uses that one object in two places: `firstPaintScript(config)` is
// inlined into the head of index.html, where it runs before anything is
// drawn, and `useAppPreferences(config)` (Preferences.tsx) reads and
// changes the same choices at run time. Both read a choice the same way:
// the URL parameter first, then the stored value, then the default.
//
// This module imports nothing from React, so a build script (a Vite
// config, for example) can import it from "@ghostjima/stoa-react/first-paint".

/** Where a choice is kept: the URL parameter that carries it and the
 * localStorage key that remembers it. */
export type PreferenceStore = {
  /** The URL parameter that carries the choice. */
  param?: string;
  /** The localStorage key that keeps it. Give each application its own. */
  storageKey?: string;
};

export type FirstPaintThemeChoice = "system" | "light" | "dark";

export type FirstPaintConfig = {
  /** The application's language codes ("ru", "en"); the first is the
   * default unless `defaultLanguage` says otherwise. */
  languages: string[];
  defaultLanguage?: string;
  /** Where the language is kept; "lang" and "stoa-lang" by default. */
  language?: PreferenceStore;
  /** Where the theme is kept ("theme" and "stoa-theme" by default) and
   * the choice when none is kept; false for an application without a
   * theme switch. */
  theme?: (PreferenceStore & { defaultChoice?: FirstPaintThemeChoice }) | false;
  /** Font files to preload, by language: the face the page shows first
   * in that language, as WOFF2 URLs the page can reach as they are
   * written (a file in the public folder, for example). Only the chosen
   * language's are preloaded: a preload that is not used costs the
   * download. For URLs that only the bundler knows (`?url` imports), call
   * `preloadFonts` from the application's entry module instead. */
  fonts?: Record<string, string[]>;
};

const RTL_LANGUAGES = ["ar", "arc", "ckb", "dv", "fa", "he", "ps", "sd", "ug", "ur", "yi"];

/** The writing direction of a language tag: right to left for Arabic,
 * Hebrew, Persian, Urdu and the other right-to-left scripts' languages. */
export function directionOf(language: string): "ltr" | "rtl" {
  return RTL_LANGUAGES.includes(language.split("-")[0]?.toLowerCase() ?? "") ? "rtl" : "ltr";
}

export const LANGUAGE_STORE: Required<PreferenceStore> = { param: "lang", storageKey: "stoa-lang" };
export const THEME_STORE: Required<PreferenceStore> = { param: "theme", storageKey: "stoa-theme" };

/** The store's names, with the defaults for any left out or undefined. */
export function withDefaults(defaults: Required<PreferenceStore>, store: PreferenceStore = {}): Required<PreferenceStore> {
  return { param: store.param ?? defaults.param, storageKey: store.storageKey ?? defaults.storageKey };
}

/** The settings the inline script needs, in a form JSON can carry. */
function scriptSettings(config: FirstPaintConfig) {
  const language = withDefaults(LANGUAGE_STORE, config.language);
  const theme = config.theme === false ? null : withDefaults(THEME_STORE, config.theme ?? {});
  return {
    languages: config.languages,
    defaultLanguage: config.defaultLanguage ?? config.languages[0] ?? "en",
    languageParam: language.param,
    languageKey: language.storageKey,
    themeParam: theme?.param ?? null,
    themeKey: theme?.storageKey ?? null,
    defaultTheme: (config.theme === false ? undefined : config.theme?.defaultChoice) ?? "system",
    rtl: RTL_LANGUAGES,
    fonts: config.fonts ?? {},
  };
}

/** JSON that can sit inside a script element: no "</script>" can end it
 * early, and the two line separators JavaScript once refused are
 * escaped. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/**
 * The script to inline at the top of index.html's head, without a
 * `<script>` element around it. Before the first paint it sets `lang` and
 * `dir` on the root element from the URL parameter or the stored language,
 * `data-theme` from the URL parameter or the stored theme (none for
 * "system", so tokens.css follows the system), and preloads the chosen
 * language's fonts. It reads choices exactly as `useAppPreferences` does,
 * which applies them again once the application runs. Plain ES5 with no
 * dependencies; blocked storage just remembers nothing.
 */
export function firstPaintScript(config: FirstPaintConfig): string {
  return `(function () {
  var c = ${scriptJson(scriptSettings(config))};
  var root = document.documentElement;
  var query;
  try {
    query = new URLSearchParams(location.search);
  } catch (e) {
    query = { get: function () { return null; } };
  }
  var stored = function (key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  };
  var pick = function (param, key, allowed) {
    var asked = query.get(param);
    if (allowed.indexOf(asked) >= 0) return asked;
    var kept = stored(key);
    return allowed.indexOf(kept) >= 0 ? kept : null;
  };
  var lang = pick(c.languageParam, c.languageKey, c.languages) || c.defaultLanguage;
  root.lang = lang;
  root.dir = c.rtl.indexOf(lang.split("-")[0].toLowerCase()) >= 0 ? "rtl" : "ltr";
  if (c.themeKey) {
    var theme = pick(c.themeParam, c.themeKey, ["system", "light", "dark"]) || c.defaultTheme;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }
  var fonts = c.fonts[lang] || [];
  for (var i = 0; i < fonts.length; i++) {
    var link = document.createElement("link");
    link.setAttribute("rel", "preload");
    link.setAttribute("as", "font");
    link.setAttribute("type", "font/woff2");
    link.setAttribute("crossorigin", "anonymous");
    link.setAttribute("href", fonts[i]);
    document.head.appendChild(link);
  }
})();`;
}

/**
 * Preloads the fonts listed for `language` (by default the root element's
 * `lang`, which the inline script has set by then), once each: for an
 * application whose font URLs come from its bundler. Call it at the top of
 * the entry module, before rendering.
 */
export function preloadFonts(fonts: Record<string, string[]>, language: string = document.documentElement.lang): void {
  const head = document.head;
  for (const href of fonts[language] ?? []) {
    const already = [...head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="font"]')].some((link) => link.getAttribute("href") === href);
    if (already) continue;
    const link = document.createElement("link");
    for (const [name, value] of [["rel", "preload"], ["as", "font"], ["type", "font/woff2"], ["crossorigin", "anonymous"], ["href", href]]) {
      link.setAttribute(name!, value!);
    }
    head.append(link);
  }
}
