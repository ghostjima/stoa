// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  I18nProvider,
  LanguageSwitch,
  ThemeSwitch,
  applyLanguage,
  directionOf,
  readLanguage,
  readThemeChoice,
  useLanguagePreference,
  useThemePreference,
} from "./index";

/** A system colour scheme the test can change, as matchMedia reports it. */
function fakeSystem(initiallyDark: boolean) {
  let dark = initiallyDark;
  const listeners = new Set<() => void>();
  const query = {
    get matches() {
      return dark;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  window.matchMedia = vi.fn(() => query as unknown as MediaQueryList);
  return {
    set(next: boolean) {
      dark = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

const html = document.documentElement;
const param = (name: string) => new URL(window.location.href).searchParams.get(name);
const goTo = (search: string) => window.history.replaceState(null, "", `/${search}`);

beforeEach(() => {
  goTo("");
  localStorage.clear();
  delete html.dataset.theme;
  html.lang = "";
  html.dir = "";
  fakeSystem(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function ThemeHeader({ storageKey }: { storageKey?: string }) {
  const { choice, theme, setChoice } = useThemePreference({ storageKey });
  return (
    <>
      <ThemeSwitch value={choice} onChange={setChoice} />
      <output>{theme}</output>
    </>
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });
const checked = (name: string) => radio(name).getAttribute("aria-checked") === "true";

describe("readThemeChoice", () => {
  it("is system with nothing chosen, the stored theme next, and the URL's above both", () => {
    expect(readThemeChoice()).toBe("system");
    localStorage.setItem("stoa-theme", "dark");
    expect(readThemeChoice()).toBe("dark");
    goTo("?theme=light");
    expect(readThemeChoice()).toBe("light");
    goTo("?theme=system");
    expect(readThemeChoice()).toBe("system");
    goTo("?theme=purple");
    expect(readThemeChoice()).toBe("dark");
  });

  it("takes the application's own parameter and key", () => {
    localStorage.setItem("app:theme", "dark");
    goTo("?look=light");
    expect(readThemeChoice({ storageKey: "app:theme" })).toBe("dark");
    expect(readThemeChoice({ param: "look", storageKey: "app:theme" })).toBe("light");
  });

  it("is system when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readThemeChoice()).toBe("system");
  });
});

describe("ThemeSwitch with useThemePreference", () => {
  it("is a small labelled choice of System, Light and Dark, System chosen by default, with no data-theme", () => {
    render(<ThemeHeader />);
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group.className).toContain("stoa-choice-group--small");
    // The options name themselves: the label is for assistive technology only.
    expect(group.getAttribute("aria-label")).toBe("Theme");
    expect(document.querySelector(".stoa-field__label")).toBeNull();
    expect(["System", "Light", "Dark"].map(checked)).toEqual([true, false, false]);
    expect(html.hasAttribute("data-theme")).toBe(false);
  });

  it("follows a change of the system scheme while System is chosen, without setting data-theme", () => {
    const system = fakeSystem(false);
    render(<ThemeHeader />);
    expect(screen.getByRole("status").textContent).toBe("light");
    system.set(true);
    expect(screen.getByRole("status").textContent).toBe("dark");
    expect(checked("System")).toBe(true);
    expect(html.hasAttribute("data-theme")).toBe(false);
  });

  it("sets data-theme for Dark and keeps it in the URL and in storage", () => {
    render(<ThemeHeader />);
    fireEvent.click(radio("Dark"));
    expect(checked("Dark")).toBe(true);
    expect(html.dataset.theme).toBe("dark");
    expect(param("theme")).toBe("dark");
    expect(localStorage.getItem("stoa-theme")).toBe("dark");
    expect(screen.getByRole("status").textContent).toBe("dark");
  });

  it("removes the attribute, the URL parameter and the stored value when System is chosen", () => {
    localStorage.setItem("app:theme", "light");
    goTo("?theme=light&lang=ar");
    render(<ThemeHeader storageKey="app:theme" />);
    expect(checked("Light")).toBe(true);
    expect(html.dataset.theme).toBe("light");
    fireEvent.click(radio("System"));
    expect(checked("System")).toBe(true);
    expect(html.hasAttribute("data-theme")).toBe(false);
    expect(param("theme")).toBeNull();
    expect(param("lang")).toBe("ar");
    expect(localStorage.getItem("app:theme")).toBeNull();
  });

  it("still switches when storage is blocked, keeping the choice in the URL", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<ThemeHeader />);
    fireEvent.click(radio("Dark"));
    expect(html.dataset.theme).toBe("dark");
    expect(param("theme")).toBe("dark");
  });

  it("moves between the options with the arrow keys, reversed in a right-to-left locale", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <ThemeHeader />
        </div>
      </I18nProvider>,
    );
    expect(screen.getByRole("radiogroup", { name: "المظهر" })).toBeTruthy();
    const system = radio("النظام");
    act(() => system.focus());
    fireEvent.keyDown(system, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(radio("فاتح"));
  });

  it("speaks Russian under a Russian locale", () => {
    render(
      <I18nProvider locale="ru-RU">
        <ThemeSwitch value="dark" onChange={() => {}} />
      </I18nProvider>,
    );
    expect(screen.getByRole("radiogroup", { name: "Тема" })).toBeTruthy();
    expect(["Системная", "Светлая", "Тёмная"].map(checked)).toEqual([false, false, true]);
  });

  it("leaves the document alone with apply off", () => {
    function Hosted() {
      const { choice, setChoice } = useThemePreference({ apply: false });
      return <ThemeSwitch value={choice} onChange={setChoice} />;
    }
    html.dataset.theme = "dark";
    render(<Hosted />);
    expect(html.dataset.theme).toBe("dark");
    fireEvent.click(radio("Light"));
    expect(html.dataset.theme).toBe("dark");
  });
});

describe("the language", () => {
  const LANGUAGES = ["en", "ru", "ar"];

  it("reads the URL first, storage next, and the first language otherwise, only from the list", () => {
    expect(readLanguage(LANGUAGES)).toBe("en");
    localStorage.setItem("stoa-lang", "ru");
    expect(readLanguage(LANGUAGES)).toBe("ru");
    goTo("?lang=ar");
    expect(readLanguage(LANGUAGES)).toBe("ar");
    goTo("?lang=fr");
    expect(readLanguage(LANGUAGES)).toBe("ru");
  });

  it("knows which languages are written right to left", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("ar-u-nu-arab")).toBe("rtl");
    expect(directionOf("he-IL")).toBe("rtl");
    expect(directionOf("ru")).toBe("ltr");
    applyLanguage("ar");
    expect([html.lang, html.dir]).toEqual(["ar", "rtl"]);
  });

  function LanguageHeader() {
    const { language, setLanguage } = useLanguagePreference({ languages: LANGUAGES });
    return <LanguageSwitch languages={LANGUAGES} value={language} onChange={setLanguage} />;
  }

  it("shows the codes in a small labelled choice, marked as Latin letters", () => {
    render(<LanguageHeader />);
    const group = screen.getByRole("radiogroup", { name: "Language" });
    expect(group.className).toContain("stoa-choice-group--small");
    expect(group.getAttribute("aria-label")).toBe("Language");
    expect(document.querySelector(".stoa-field__label")).toBeNull();
    expect(["EN", "RU", "AR"].map(checked)).toEqual([true, false, false]);
    expect(radio("RU").querySelector("span")?.getAttribute("lang")).toBe("en");
    expect([html.lang, html.dir]).toEqual(["en", "ltr"]);
  });

  it("sets <html lang dir> and keeps the language in the URL and in storage", () => {
    render(<LanguageHeader />);
    fireEvent.click(radio("AR"));
    expect([html.lang, html.dir]).toEqual(["ar", "rtl"]);
    expect(param("lang")).toBe("ar");
    expect(localStorage.getItem("stoa-lang")).toBe("ar");
    fireEvent.click(radio("RU"));
    expect([html.lang, html.dir]).toEqual(["ru", "ltr"]);
  });

  it("starts in the language of the URL, before the user does anything", () => {
    goTo("?lang=ar");
    render(<LanguageHeader />);
    expect(checked("AR")).toBe(true);
    expect([html.lang, html.dir]).toEqual(["ar", "rtl"]);
  });

  it("is labelled in the locale's words", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <LanguageSwitch languages={LANGUAGES} value="ar" onChange={() => {}} />
      </I18nProvider>,
    );
    expect(screen.getByRole("radiogroup", { name: "اللغة" })).toBeTruthy();
  });
});

describe("preferences without persistence, for a preview frame", () => {
  it("neither reads nor writes the URL or storage, and starts from the given choice", () => {
    goTo("?theme=dark&lang=ru");
    localStorage.setItem("stoa-theme", "dark");
    localStorage.setItem("stoa-lang", "ru");
    function Frame() {
      const theme = useThemePreference({ apply: false, persist: false, defaultChoice: "light" });
      const language = useLanguagePreference({ languages: ["en", "ru", "ar"], apply: false, persist: false, defaultLanguage: "ar" });
      return (
        <>
          <ThemeSwitch value={theme.choice} onChange={theme.setChoice} />
          <LanguageSwitch languages={["en", "ru", "ar"]} value={language.language} onChange={language.setLanguage} />
          <output>{`${theme.theme} ${language.dir}`}</output>
        </>
      );
    }
    render(<Frame />);
    expect(checked("Light")).toBe(true);
    expect(checked("AR")).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("light rtl");
    fireEvent.click(radio("System"));
    fireEvent.click(radio("EN"));
    expect(checked("System")).toBe(true);
    expect(checked("EN")).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("light ltr");
    // Nothing persisted, and nothing removed.
    expect(window.location.search).toBe("?theme=dark&lang=ru");
    expect(localStorage.getItem("stoa-theme")).toBe("dark");
    expect(localStorage.getItem("stoa-lang")).toBe("ru");
    expect(html.dataset.theme).toBeUndefined();
  });

  it("starts from the default choice when nothing is stored, and persists by default", () => {
    function Header() {
      const { choice, setChoice } = useThemePreference({ defaultChoice: "dark" });
      return <ThemeSwitch value={choice} onChange={setChoice} />;
    }
    render(<Header />);
    expect(checked("Dark")).toBe(true);
    fireEvent.click(radio("Light"));
    expect(param("theme")).toBe("light");
  });
});
