// Stoa's dictionaries: every language has every word, in the same shape.
import { describe, expect, it } from "vitest";
import { describeBook, messagesFor, parseBook, stoaFormat, type StoaMessages } from "./index";

const DICTIONARIES: Record<string, StoaMessages> = {
  en: messagesFor("en-US"),
  ar: messagesFor("ar-u-nu-arab"),
  ru: messagesFor("ru-RU"),
};

describe("the dictionaries", () => {
  it("are three different dictionaries", () => {
    expect(new Set(Object.values(DICTIONARIES)).size).toBe(3);
    expect(DICTIONARIES.ru!.price).toBe("Цена");
    expect(messagesFor("ru")).toBe(DICTIONARIES.ru);
    expect(messagesFor("fr-FR")).toBe(DICTIONARIES.en);
  });

  it("have the same keys, in the same order", () => {
    const keys = Object.keys(DICTIONARIES.en!);
    for (const [language, messages] of Object.entries(DICTIONARIES)) {
      expect(Object.keys(messages), language).toEqual(keys);
    }
  });

  it("give every key the same shape: a non-empty word, or a function of as many arguments", () => {
    const en = DICTIONARIES.en! as Record<string, unknown>;
    for (const [language, messages] of Object.entries(DICTIONARIES)) {
      for (const [key, value] of Object.entries(messages as Record<string, unknown>)) {
        const reference = en[key];
        expect(typeof value, `${language}.${key}`).toBe(typeof reference);
        if (typeof value === "string") expect(value.trim().length, `${language}.${key}`).toBeGreaterThan(0);
        if (typeof value === "function") expect(value.length, `${language}.${key}`).toBe((reference as () => string).length);
      }
    }
  });

  it("describe the book in Russian, with the Russian decimal comma", () => {
    const russian = stoaFormat("ru-RU");
    const book = parseBook([1, 1, 99.05, 300, 99.1, 50]);
    expect(describeBook(book, (p) => russian.decimal(p, 2), russian)).toBe(
      "лучшая цена покупки 99,05, объём 300; лучшая цена продажи 99,10, объём 50; спред 0,05.",
    );
  });

  it("name the theme, language and space bar in each language", () => {
    expect([DICTIONARIES.en!.theme, DICTIONARIES.en!.themeLight, DICTIONARIES.en!.themeDark, DICTIONARIES.en!.language]).toEqual([
      "Theme",
      "Light",
      "Dark",
      "Language",
    ]);
    expect(DICTIONARIES.ar!.theme).toBe("المظهر");
    expect(DICTIONARIES.ru!.language).toBe("Язык");
    expect(DICTIONARIES.ru!.keySpace).toBe("Пробел");
    expect(Object.values(DICTIONARIES).map((m) => [m.themeSystem, m.themeLight, m.themeDark])).toEqual([
      ["System", "Light", "Dark"],
      ["النظام", "فاتح", "داكن"],
      ["Системная", "Светлая", "Тёмная"],
    ]);
  });
});
