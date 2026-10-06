import { describe, expect, it } from "vitest";
import { CHROME_LANGUAGES, CHROME_LOCALES, CHROME_TEXT, isChromeLanguage } from "./chromeText";
import { DATA_STATES, SCREENS } from "./screens/model";

type Word = string | ((...args: unknown[]) => string);

/** Every leaf of a dictionary with its dotted path. */
function leaves(value: unknown, path = ""): [string, Word][] {
  if (typeof value === "string" || typeof value === "function") return [[path, value as Word]];
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  }
  throw new Error(`${path}: not a word`);
}

/** The shape of a dictionary: every key path, with the kind of its value
 * and, for a function, how many arguments it takes. */
const shape = (value: unknown) =>
  leaves(value)
    .map(([path, word]) => `${path}:${typeof word}${typeof word === "function" ? word.length : ""}`)
    .sort();

/** Sample arguments that cannot be mistaken for anything else in a
 * sentence; numbers, so a count picks a plural form like a real one. */
const SAMPLES = [101, 202, 303, 404, 505, 606, 707];

describe("the chrome's words", () => {
  it("has every key in both languages, with the same kinds of value", () => {
    const english = shape(CHROME_TEXT.en);
    for (const language of CHROME_LANGUAGES) expect(shape(CHROME_TEXT[language]), language).toEqual(english);
  });

  it("has no empty word, and every sentence uses each of its arguments", () => {
    for (const language of CHROME_LANGUAGES) {
      for (const [path, word] of leaves(CHROME_TEXT[language])) {
        if (typeof word === "string") {
          expect(word.trim(), `${language} ${path}`).not.toBe("");
          continue;
        }
        const args = SAMPLES.slice(0, word.length);
        const out = word(...args);
        expect(out.trim(), `${language} ${path}`).not.toBe("");
        for (const arg of args) expect(out, `${language} ${path}`).toContain(String(arg));
      }
    }
  });

  it("counts in the plural forms of each language", () => {
    expect(CHROME_TEXT.en.overrides.count(1)).toBe("1 override");
    expect(CHROME_TEXT.en.overrides.count(2)).toBe("2 overrides");
    expect(CHROME_TEXT.ru.overrides.count(1)).toBe("1 переопределение");
    expect(CHROME_TEXT.ru.overrides.count(3)).toBe("3 переопределения");
    expect(CHROME_TEXT.ru.overrides.count(5)).toBe("5 переопределений");
    expect(CHROME_TEXT.ru.overrides.count(21)).toBe("21 переопределение");
    expect(CHROME_TEXT.ru.checks.newCount(1)).toBe("1 новый сбой");
    expect(CHROME_TEXT.ru.checks.newCount(2)).toBe("2 новых сбоя");
    expect(CHROME_TEXT.ru.checks.newCount(11)).toBe("11 новых сбоев");
    expect(CHROME_TEXT.ru.verify.timed(164, "0,42")).toBe("164 проверки за 0,42 мс");
    expect(CHROME_TEXT.ru.verify.disagree(1)).toBe("расходится 1 переменная");
    expect(CHROME_TEXT.ru.verify.disagree(5)).toBe("расходятся 5 переменных");
  });

  it("names the system Stoa in both languages and translates only the second word", () => {
    expect(CHROME_TEXT.en.header.title).toBe("Stoa System");
    expect(CHROME_TEXT.ru.header.title).toBe("Stoa Система");
    for (const language of CHROME_LANGUAGES) {
      const { subtitle } = CHROME_TEXT[language].header;
      expect(subtitle[0], `${language}: ${subtitle}`).toBe(subtitle[0]!.toLocaleUpperCase(language));
      expect(subtitle, language).not.toMatch(/[.:]$/);
    }
  });

  it("labels every screen and state with a capital and no full stop", () => {
    for (const language of CHROME_LANGUAGES) {
      const { screens, states } = CHROME_TEXT[language].session;
      const labels = [...SCREENS.map((id) => screens[id]), ...DATA_STATES.map((id) => states[id])];
      for (const label of labels) {
        expect(label[0], `${language}: ${label}`).toBe(label[0]!.toLocaleUpperCase(language));
        expect(label, language).not.toMatch(/\.$/);
      }
    }
  });

  it("keeps a locale for each language and refuses any other code", () => {
    for (const language of CHROME_LANGUAGES) expect(new Intl.Locale(CHROME_LOCALES[language]).language).toBe(language);
    expect(isChromeLanguage("ru")).toBe(true);
    expect(isChromeLanguage("ar")).toBe(false);
  });
});
