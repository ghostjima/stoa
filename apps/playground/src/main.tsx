import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider, applyLanguage, readLanguage, useLanguagePreference } from "@ghostjima/stoa-react";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-mono/400.css";
// Arabic-Indic digits for the numeric face: IBM Plex Mono has none, and
// IBM Plex Sans Arabic's are proportional; Noto Sans Arabic's are tabular.
import "@fontsource/noto-sans-arabic/400.css";
import "@ghostjima/stoa-tokens/tokens.css";
import "@ghostjima/stoa-react/styles.css";
import "./app.css";
import { App } from "./App";
import { ChromeTextContext } from "./chromeLanguage";
import { CHROME_LANGUAGES, CHROME_LANGUAGE_STORE, CHROME_LOCALES, CHROME_TEXT, isChromeLanguage, type ChromeLanguage } from "./chromeText";

// The chrome's language before the first paint: <html lang> and the
// document's title, from ?lang= or the last visit, English by default.
// The preview frames set their own lang on their own containers.
const initial = readLanguage(CHROME_LANGUAGES, CHROME_LANGUAGE_STORE);
applyLanguage(initial);
document.title = CHROME_TEXT[isChromeLanguage(initial) ? initial : "en"].header.title;

/** The chrome's language. The provider sets the locale for Stoa's own
 * words and React Aria in the chrome; the context carries the
 * playground's words. */
function Root() {
  const preference = useLanguagePreference({ languages: CHROME_LANGUAGES, ...CHROME_LANGUAGE_STORE });
  const language: ChromeLanguage = isChromeLanguage(preference.language) ? preference.language : "en";
  const text = CHROME_TEXT[language];
  useEffect(() => {
    document.title = text.header.title;
  }, [text]);
  return (
    <I18nProvider locale={CHROME_LOCALES[language]}>
      <ChromeTextContext.Provider value={text}>
        <App language={language} onLanguage={preference.setLanguage} />
      </ChromeTextContext.Provider>
    </I18nProvider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");
createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
