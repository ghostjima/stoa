// The Content Security Policy of the built playground, as a meta element.
//
// The playground is a development tool and is not published, so nothing
// here protects a visitor today. The build carries a policy all the same:
// it shows that Stoa's components and the playground's own code run under
// a strict one, and the build is ready if it is ever served.
//
// The policy is written into dist/index.html by a Vite plugin that runs
// in `vite build` only: the dev server's hot reload needs inline scripts
// and eval, so the page it serves carries no policy. The plugin runs
// after every other index.html transform and reads the page as it will be
// served: an inline script, if one is ever added, is allowed by the
// SHA-256 of its own text, never by a hash written down beforehand.
import { createHash } from "node:crypto";
import type { Plugin } from "vite";

/** The style elements React Aria adds to the head at run time, by their
 * text (react-aria 3.52.1). Each is allowed by its hash, so the policy
 * needs no 'unsafe-inline' for styles. If an upgrade changes either
 * text, the browser blocks the new one and tests/csp.spec.ts fails on the
 * violation, with the text to put here. */
export const REACT_ARIA_STYLES = [
  // usePress: no delay on a tap from waiting for a double tap.
  "@layer {\n  [data-react-aria-pressable] {\n    touch-action: pan-x pan-y pinch-zoom;\n  }\n}",
  // usePreventScroll on iOS: an open overlay's scrolling stays in it.
  "@layer {\n  * {\n    overscroll-behavior: contain;\n  }\n}",
];

/** Where the type panel loads catalogue fonts from: Fontsource's API for
 * a family's files, and the CDN the API points to for the files. */
export const FONT_CATALOGUE = ["https://api.fontsource.org", "https://cdn.jsdelivr.net"];

/** A CSP hash source for an inline script's or style's text. The HTML
 * parser turns every line ending into a line feed before the browser
 * hashes the text, so the same is done here. */
export function hashSource(text: string): string {
  const digest = createHash("sha256").update(text.replace(/\r\n?/g, "\n"), "utf8").digest("base64");
  return `'sha256-${digest}'`;
}

/** The text of every script element in the page that has no `src`. */
export function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const [, attributes = "", text = ""] = match;
    if (!/\bsrc\s*=/i.test(attributes)) scripts.push(text);
  }
  return scripts;
}

/**
 * The policy for a page with these inline scripts, one directive per
 * entry.
 *
 * - default-src 'self': anything not named below comes from the page's
 *   own origin or not at all.
 * - script-src: the page's own files, and any inline script by hash
 *   (there is none today). No 'wasm-unsafe-eval': HarfBuzz and the WOFF2
 *   decoder are WebAssembly, but both run in the font worker, and a
 *   worker takes its policy from its own script's headers, not from the
 *   page.
 * - style-src: the page's own stylesheet and React Aria's two style
 *   elements by hash. No 'unsafe-inline': the frames' token values and
 *   every other inline style are written through the CSS object model,
 *   which a policy does not restrict.
 * - img-src: own files, and `data:` for the empty icon in index.html.
 * - font-src: the self-hosted families. A font dropped on the type panel
 *   or fetched from the catalogue is loaded from its bytes (FontFace),
 *   which is not a request.
 * - connect-src: the page's own files and endpoints, and the font
 *   catalogue.
 * - worker-src: the font worker, a file of the build.
 * - base-uri, form-action, object-src: no base element can move the
 *   page's relative URLs, no form is posted anywhere, no plugin content.
 *
 * frame-ancestors, sandbox and report-uri are ignored in a meta element,
 * so they are not here.
 */
export function policyFor(scripts: string[]): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", ...scripts.map(hashSource)]],
    ["style-src", ["'self'", ...REACT_ARIA_STYLES.map(hashSource)]],
    ["img-src", ["'self'", "data:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...FONT_CATALOGUE]],
    ["worker-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'none'"]],
    ["object-src", ["'none'"]],
  ];
  return directives.map(([name, sources]) => `${name} ${[...new Set(sources)].join(" ")}`).join("; ");
}

const CHARSET = /<meta\s+charset\s*=\s*["']?[\w-]+["']?\s*\/?>/i;

/**
 * The page with its policy stated right after the charset declaration:
 * the charset stays in the first 1,024 bytes, where the browser looks
 * for it, and the policy comes before every script, style and link,
 * because a policy in a meta element does not apply to what the parser
 * has already passed. Throws on a page it cannot do that for.
 */
export function withPolicy(html: string): string {
  if (/http-equiv\s*=\s*["']?content-security-policy/i.test(html)) throw new Error("csp: the page already states a Content Security Policy");
  const charset = CHARSET.exec(html);
  if (!charset) throw new Error("csp: no <meta charset> in the page to put the policy after");
  const end = charset.index + charset[0].length;
  if (/<(script|style|link)\b/i.test(html.slice(0, end))) throw new Error("csp: a script, style or link comes before <meta charset>, where the policy would not apply to it");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policyFor(inlineScripts(html))}" />`;
  const indent = /\n([ \t]*)$/.exec(html.slice(0, charset.index))?.[1] ?? "";
  return `${html.slice(0, end)}\n${indent}${meta}${html.slice(end)}`;
}

/** Writes the policy into the built index.html. Listed last among the
 * plugins and ordered `post`, so it reads the page after the build's own
 * tags are in it. */
export function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: { order: "post", handler: (html) => withPolicy(html) },
  };
}
