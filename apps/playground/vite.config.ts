import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { contentSecurityPolicy } from "./server/csp.ts";
import { tokenServer } from "./server/tokenServer.ts";

// `vite build` exists only as a check that the app compiles, and that it
// runs under a strict Content Security Policy (server/csp.ts, written into
// the built page only): the playground is a development tool and its
// endpoints live in the dev server.
export default defineConfig({
  plugins: [react(), tokenServer(), contentSecurityPolicy()],
  server: { port: 5186 },
  // A font is always a file of its own. Left to the default, the two
  // smallest subsets would be written into the stylesheet as data: URLs,
  // and the built page's policy would have to allow fonts from `data:`.
  build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
  // The font worker imports harfbuzzjs, which initialises its WASM with a
  // top-level await; the default `iife` worker format cannot carry one.
  worker: { format: "es" },
  // Only the worker imports these, so the dependency scan at startup does
  // not see them; found later, they make Vite re-optimise and reload the
  // page, which on a cold cache lands in the middle of whatever test runs
  // first. Listing them bundles them before the first page is served.
  optimizeDeps: { include: ["harfbuzzjs", "woff2-encoder/decompress"] },
});
