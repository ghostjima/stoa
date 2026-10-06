// The playground's own chrome: the side panel and the frame headers. The
// frames keep their own views; this only sets data-theme on the document,
// which tokens.css follows. System, the default, sets nothing, so the
// chrome follows the system's scheme; Light or Dark is remembered in this
// browser, and choosing System forgets it.
import { useEffect, useState } from "react";

export type ChromeTheme = "system" | "light" | "dark";

const KEY = "stoa-playground-theme";

function stored(): ChromeTheme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function useChromeTheme(): [ChromeTheme, (theme: ChromeTheme) => void] {
  const [theme, setTheme] = useState<ChromeTheme>(stored);

  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const choose = (next: ChromeTheme) => {
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  };
  return [theme, choose];
}
