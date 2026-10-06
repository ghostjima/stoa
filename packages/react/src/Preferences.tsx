// The theme and the language of an application, and the switches for them.
//
// A choice lives in a URL parameter, so a reload or a shared link keeps
// it, and in localStorage, so the next visit does too; the URL wins.
// Storage can be blocked (a private window, a sandbox), so every access is
// wrapped and a blocked store just remembers nothing. A hook given
// `persist: false` keeps its choice in its own state only, for a preview
// frame that must not change the page's URL or the next visit.
//
// Before first paint: call `applyTheme(readThemeChoice())` and
// `applyLanguage(readLanguage(languages))` before rendering (in main.tsx,
// before createRoot), so a dark page does not flash light and an Arabic
// one does not flash left to right. The hooks read the same values and
// apply each change in a layout effect, before the browser paints it.
import { useEffect, useLayoutEffect, useState } from "react";
import { ChoiceGroup } from "./Controls";
import { useStoaFormat } from "./locale";

export type Theme = "light" | "dark";
/** "system" is no choice: no data-theme on <html>, and tokens.css follows
 * the system's prefers-color-scheme. */
export type ThemeChoice = "system" | Theme;

export type PreferenceStore = {
  /** The URL parameter that carries the choice. */
  param?: string;
  /** The localStorage key that keeps it. Give each application its own. */
  storageKey?: string;
};

const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_STORE = { param: "theme", storageKey: "stoa-theme" };
const LANGUAGE_STORE = { param: "lang", storageKey: "stoa-lang" };

/** The store's names, with the defaults for any left out or undefined
 * (a spread would let an undefined `storageKey` replace the default). */
function withDefaults(defaults: Required<PreferenceStore>, store: PreferenceStore): Required<PreferenceStore> {
  return { param: store.param ?? defaults.param, storageKey: store.storageKey ?? defaults.storageKey };
}

const hasWindow = () => typeof window !== "undefined";

function readParam(name: string): string | null {
  return hasWindow() ? new URLSearchParams(window.location.search).get(name) : null;
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Puts `value` in the URL and in storage, or takes it out of both for
 * null. replaceState: a change of setting is not a step to go back
 * through. */
function writeChoice({ param, storageKey }: Required<PreferenceStore>, value: string | null) {
  if (!hasWindow()) return;
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(param);
  else url.searchParams.set(param, value);
  window.history.replaceState(window.history.state, "", url);
  try {
    if (value === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, value);
  } catch {
    // Not kept for the next visit; the URL still carries it.
  }
}

const isThemeChoice = (value: string | null): value is ThemeChoice => value === "system" || value === "light" || value === "dark";

/** The theme chosen in the URL, else in storage, else "system". */
export function readThemeChoice(store: PreferenceStore = {}): ThemeChoice {
  return storedTheme(withDefaults(THEME_STORE, store)) ?? "system";
}

function storedTheme({ param, storageKey }: Required<PreferenceStore>): ThemeChoice | null {
  const asked = readParam(param);
  if (isThemeChoice(asked)) return asked;
  const stored = readStored(storageKey);
  return isThemeChoice(stored) ? stored : null;
}

/** The system's colour scheme now. */
export function systemTheme(): Theme {
  return hasWindow() && typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Sets data-theme for a chosen theme, and removes it for "system". */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement) {
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
}

export type ThemePreference = {
  /** What the user chose; "system" until a theme is chosen. */
  choice: ThemeChoice;
  /** The theme drawn now: the choice, or the system's while it is
   * "system", following the system as it changes. */
  theme: Theme;
  /** Choosing "system" clears the URL parameter and the stored value. */
  setChoice: (choice: ThemeChoice) => void;
};

/** Whether a preference hook touches the document, the URL and storage. */
export type PreferenceOptions = {
  /** Set the choice on <html>. Off for a host that sets it itself
   * (Storybook's toolbar, for example) or for a frame inside a page. */
  apply?: boolean;
  /** Read the choice from the URL and storage, and keep each change
   * there. Off for a choice that lives only as long as the component, a
   * preview frame's for example: nothing is read, written or removed. */
  persist?: boolean;
};

/** The theme preference, applied to <html data-theme>. With `apply`
 * false the document is left alone; with `persist` false the URL and
 * storage are too. */
export function useThemePreference({
  apply = true,
  persist = true,
  defaultChoice = "system",
  ...store
}: PreferenceStore &
  PreferenceOptions & {
    /** The choice when none is stored, or always without `persist`. */
    defaultChoice?: ThemeChoice;
  } = {}): ThemePreference {
  const resolved = withDefaults(THEME_STORE, store);
  const [choice, setChoiceState] = useState<ThemeChoice>(() => (persist ? storedTheme(resolved) : null) ?? defaultChoice);
  const [system, setSystem] = useState<Theme>(systemTheme);
  useEffect(() => {
    if (!hasWindow() || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(DARK_QUERY);
    const follow = () => setSystem(query.matches ? "dark" : "light");
    follow();
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, []);
  useLayoutEffect(() => {
    if (apply) applyTheme(choice);
  }, [apply, choice]);
  return {
    choice,
    theme: choice === "system" ? system : choice,
    setChoice: (next) => {
      if (persist) writeChoice(resolved, next === "system" ? null : next);
      setChoiceState(next);
    },
  };
}

const RTL_LANGUAGES = new Set(["ar", "arc", "ckb", "dv", "fa", "he", "ps", "sd", "ug", "ur", "yi"]);

/** The writing direction of a language tag: right to left for Arabic,
 * Hebrew, Persian, Urdu and the other right-to-left scripts' languages. */
export function directionOf(language: string): "ltr" | "rtl" {
  return RTL_LANGUAGES.has(language.split("-")[0]?.toLowerCase() ?? "") ? "rtl" : "ltr";
}

/** The language chosen in the URL, else in storage, if it is one of
 * `languages`; else the first of them. */
export function readLanguage(languages: string[], store: PreferenceStore = {}): string {
  return storedLanguage(languages, withDefaults(LANGUAGE_STORE, store)) ?? languages[0] ?? "en";
}

function storedLanguage(languages: string[], { param, storageKey }: Required<PreferenceStore>): string | null {
  const asked = readParam(param);
  if (asked && languages.includes(asked)) return asked;
  const stored = readStored(storageKey);
  return stored && languages.includes(stored) ? stored : null;
}

/** Sets <html lang> and <html dir> for a language. */
export function applyLanguage(language: string, root: HTMLElement = document.documentElement) {
  root.lang = language;
  root.dir = directionOf(language);
}

export type LanguagePreference = {
  language: string;
  dir: "ltr" | "rtl";
  setLanguage: (language: string) => void;
};

/** The language preference, applied to <html lang dir>. The language is a
 * code from `languages` ("en", "ru", "ar"); the application maps it to the
 * locale it gives I18nProvider ("ar-u-nu-arab" for Arabic-Indic digits).
 * With `apply` false the document is left alone; with `persist` false the
 * URL and storage are too. */
export function useLanguagePreference({
  languages,
  apply = true,
  persist = true,
  defaultLanguage,
  ...store
}: PreferenceStore &
  PreferenceOptions & {
    languages: string[];
    /** The language when none is stored, or always without `persist`;
     * the first of `languages` by default. */
    defaultLanguage?: string;
  }): LanguagePreference {
  const resolved = withDefaults(LANGUAGE_STORE, store);
  const [language, setLanguageState] = useState(
    () => (persist ? storedLanguage(languages, resolved) : null) ?? defaultLanguage ?? languages[0] ?? "en",
  );
  useLayoutEffect(() => {
    if (apply) applyLanguage(language);
  }, [apply, language]);
  return {
    language,
    dir: directionOf(language),
    setLanguage: (next) => {
      if (persist) writeChoice(resolved, next);
      setLanguageState(next);
    },
  };
}

export type ThemeSwitchProps = {
  value: ThemeChoice;
  onChange: (choice: ThemeChoice) => void;
  /** Defaults to Stoa's word for "Theme" in the locale. Read by
   * assistive technology only: the options name themselves. */
  label?: string;
};

/** System, Light or Dark, in Stoa's words for the locale: a small
 * ChoiceGroup for a header, its label hidden. Wire it to
 * useThemePreference. */
export function ThemeSwitch({ value, onChange, label }: ThemeSwitchProps) {
  const { messages } = useStoaFormat();
  return (
    <ChoiceGroup<ThemeChoice>
      label={label ?? messages.theme}
      hideLabel
      size="small"
      value={value}
      onChange={onChange}
      choices={[
        { id: "system", label: messages.themeSystem },
        { id: "light", label: messages.themeLight },
        { id: "dark", label: messages.themeDark },
      ]}
    />
  );
}

export type LanguageSwitchProps = {
  /** Language codes, in the order shown ("en", "ru", "ar"). */
  languages: string[];
  value: string;
  onChange: (language: string) => void;
  /** Defaults to Stoa's word for "Language" in the locale. Read by
   * assistive technology only: the options name themselves. */
  label?: string;
};

/** The application's languages by code (EN, RU, AR), the same in every
 * interface: a small ChoiceGroup for a header, its label hidden. The
 * codes are Latin letters, marked as English so a screen reader set to
 * Arabic or Russian spells them out. Wire it to useLanguagePreference. */
export function LanguageSwitch({ languages, value, onChange, label }: LanguageSwitchProps) {
  const { messages } = useStoaFormat();
  return (
    <ChoiceGroup<string>
      label={label ?? messages.language}
      hideLabel
      size="small"
      value={value}
      onChange={onChange}
      choices={languages.map((code) => ({ id: code, label: <span lang="en">{code.toUpperCase()}</span> }))}
    />
  );
}
