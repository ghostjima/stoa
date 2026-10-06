import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tokenServer } from "./server/tokenServer.ts";

// `vite build` exists only as a check that the app compiles: the playground
// is a development tool and its endpoints live in the dev server.
export default defineConfig({
  plugins: [react(), tokenServer()],
  server: { port: 5186 },
  // The font worker imports harfbuzzjs, which initialises its WASM with a
  // top-level await; the default `iife` worker format cannot carry one.
  worker: { format: "es" },
  // Only the worker imports these, so the dependency scan at startup does
  // not see them; found later, they make Vite re-optimise and reload the
  // page, which on a cold cache lands in the middle of whatever test runs
  // first. Listing them bundles them before the first page is served.
  optimizeDeps: { include: ["harfbuzzjs", "woff2-encoder/decompress"] },
});
