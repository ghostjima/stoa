import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
