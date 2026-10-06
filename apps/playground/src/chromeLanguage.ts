// The chrome's words on hand anywhere under the app, without passing them
// through every panel. Outside a provider (a unit test that renders one
// panel) the words are English, the playground's default.
import { createContext, useContext } from "react";
import { CHROME_TEXT, type ChromeText } from "./chromeText";

export const ChromeTextContext = createContext<ChromeText>(CHROME_TEXT.en);

export const useChromeText = (): ChromeText => useContext(ChromeTextContext);
