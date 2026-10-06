import { describe, expect, it } from "vitest";
import { LANGUAGES, SCREEN_TEXT, localeFor, retypeDigits } from "./screenText";

describe("the frame's locale", () => {
  it("states the frame's direction through the script, and Arabic digits", () => {
    expect(localeFor("en", "ltr")).toBe("en-US");
    expect(localeFor("ru", "ltr")).toBe("ru-RU");
    expect(localeFor("ar", "rtl")).toBe("ar-u-nu-arab");
    const directionOf = (tag: string) => {
      const locale = new Intl.Locale(tag).maximize() as Intl.Locale & { getTextInfo?: () => { direction: string } };
      return locale.getTextInfo?.().direction;
    };
    for (const { id: language } of LANGUAGES) {
      for (const dir of ["ltr", "rtl"] as const) {
        const direction = directionOf(localeFor(language, dir));
        // Engines without Intl.Locale text info cannot say; where they can,
        // the direction is the frame's.
        if (direction !== undefined) expect(direction, `${language} ${dir}`).toBe(dir);
      }
    }
    expect(new Intl.NumberFormat(localeFor("ar", "ltr")).format(12.5)).toBe("١٢٫٥");
    expect(new Intl.NumberFormat(localeFor("en", "rtl")).format(12.5)).toBe("12.5");
    // Russian keeps its own digits and comma in either direction.
    expect(new Intl.NumberFormat(localeFor("ru", "ltr")).format(12.5)).toBe("12,5");
    expect(new Intl.NumberFormat(localeFor("ru", "rtl")).format(12.5)).toBe("12,5");
  });
});

describe("retyping a field between languages", () => {
  it("moves the digits and the decimal separator and keeps the rest", () => {
    expect(retypeDigits("222.60", "en", "ar")).toBe("٢٢٢٫٦٠");
    expect(retypeDigits("٢٢٢٫٦٠", "ar", "en")).toBe("222.60");
    expect(retypeDigits("12 lots", "en", "ar")).toBe("١٢ lots");
    expect(retypeDigits("222.60", "en", "ru")).toBe("222,60");
    expect(retypeDigits("222,60", "ru", "en")).toBe("222.60");
    expect(retypeDigits("222,60", "ru", "ar")).toBe("٢٢٢٫٦٠");
    expect(retypeDigits("٢٢٢٫٦٠", "ar", "ru")).toBe("222,60");
    expect(retypeDigits("222.60", "en", "en")).toBe("222.60");
  });

  it("comes back to what was typed after a round of every language", () => {
    let text = "1234.5";
    for (const [from, to] of [["en", "ru"], ["ru", "ar"], ["ar", "en"]] as const) text = retypeDigits(text, from, to);
    expect(text).toBe("1234.5");
  });
});

describe("the screen's words", () => {
  it("has every word in every language", () => {
    const keys = Object.keys(SCREEN_TEXT.en).sort();
    for (const { id } of LANGUAGES) expect(Object.keys(SCREEN_TEXT[id]).sort(), id).toEqual(keys);
  });
});
