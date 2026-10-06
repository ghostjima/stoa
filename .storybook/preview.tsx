import type { Preview } from "@storybook/react-vite";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-mono/400.css";
// Arabic-Indic digits for the numeric face: IBM Plex Mono has none, and
// IBM Plex Sans Arabic's are proportional; Noto Sans Arabic's are tabular.
import "@fontsource/noto-sans-arabic/400.css";
import "../packages/tokens/dist/tokens.css";
import "../packages/react/src/styles.css";
import "./preview.css";
import { I18nProvider } from "../packages/react/src/index";

// Theme, density and direction are switched on the root element, as an
// application would do it; the language through React Aria's provider,
// which Stoa's own words and digits follow.
const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: { title: "Theme", items: ["light", "dark"], dynamicTitle: true },
    },
    density: {
      description: "Density",
      toolbar: { title: "Density", items: ["compact", "regular", "comfortable"], dynamicTitle: true },
    },
    dir: {
      description: "Direction",
      toolbar: { title: "Direction", items: ["ltr", "rtl"], dynamicTitle: true },
    },
    lang: {
      description: "Language of Stoa's words, and its digits",
      toolbar: { title: "Language", items: ["en", "ru", "ar"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light", density: "regular", dir: "ltr", lang: "en" },
  decorators: [
    (Story, ctx) => {
      const root = document.documentElement;
      root.dataset.theme = ctx.globals.theme;
      root.dataset.density = ctx.globals.density;
      root.dir = ctx.globals.dir;
      root.lang = ctx.globals.lang;
      // Arabic states its numbering system: "ar" alone formats with Latin
      // digits in current ICU data.
      return (
        <I18nProvider locale={ctx.globals.lang === "ar" ? "ar-u-nu-arab" : ctx.globals.lang === "ru" ? "ru-RU" : "en-US"}>
          <Story />
        </I18nProvider>
      );
    },
  ],
  parameters: { layout: "padded" },
};
export default preview;
