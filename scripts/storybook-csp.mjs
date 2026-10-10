// The Content Security Policy of the built Storybook, written into its
// two pages as meta elements: index.html, Storybook's own interface (the
// manager), and iframe.html, the preview the stories run in. GitHub Pages
// serves static files and cannot send the header.
//
//   node scripts/storybook-csp.mjs [directory]   (storybook-static by default)
//
// `pnpm build-storybook` runs it after `storybook build`. It reads each
// page as it was built and allows every inline script by the SHA-256 of
// its own text, so a Storybook upgrade that changes one of them ships with
// the new hash, never with a stale one. `storybook dev` is not touched:
// its pages carry no policy.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** The pages of a built Storybook and which policy each gets. */
export const PAGES = { "index.html": "manager", "iframe.html": "preview" };

/** A CSP hash source for an inline script's text. The HTML parser turns
 * every line ending into a line feed before the browser hashes the text,
 * so the same is done here. */
export function hashSource(text) {
  const digest = createHash("sha256").update(text.replace(/\r\n?/g, "\n"), "utf8").digest("base64");
  return `'sha256-${digest}'`;
}

/** The text of every script element in the page that has no `src`. */
export function inlineScripts(html) {
  const scripts = [];
  for (const [, attributes, text] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\bsrc\s*=/i.test(attributes)) scripts.push(text);
  }
  return scripts;
}

/**
 * The policy of one page, one directive per entry.
 *
 * Scripts are strict in both pages: the page's own files and the inline
 * scripts Storybook writes into the page, each by its hash. No
 * 'unsafe-inline', no 'unsafe-eval': neither the manager nor the preview
 * needs eval in a static build.
 *
 * Style elements are not strict, in either page: 'unsafe-inline' for
 * style-src-elem. Storybook's interface and its preview tools add style
 * elements at run time, and some of their text is made at run time too
 * (the background and the grid a visitor picks, the highlight tool's
 * keyframes); a story may render a style element of its own. So there
 * is no fixed list to hash, and a static host cannot issue a nonce per
 * response. What that leaves open is narrow: an injected style element
 * could restyle the page, but it could not load anything from another
 * origin, because every other directive still says 'self'. Style
 * attributes stay refused (style-src-attr 'none'): Stoa's components and
 * Storybook write inline styles through the CSS object model, which a
 * policy does not restrict.
 *
 * - img-src: own files, and `data:` for the preview's empty icon. The
 *   manager gets it too: an image in a data: URL loads nothing and
 *   sends nothing.
 * - font-src 'self': Storybook's Nunito Sans and Stoa's self-hosted
 *   families, every one a file of the build (.storybook/main.ts keeps the
 *   smallest subsets out of the stylesheet).
 * - connect-src 'self': the manager reads the build's own index.json;
 *   neither page asks another origin for anything.
 * - frame-src: the manager frames the preview; the preview frames
 *   nothing.
 * - worker-src 'none': neither page starts a worker.
 * - base-uri, form-action, object-src: no base element can move the
 *   page's relative URLs, no form is posted anywhere, no plugin content.
 *
 * frame-ancestors, sandbox and report-uri are ignored in a meta element,
 * so they are not here.
 */
export function policyFor(page, html) {
  const directives = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", ...inlineScripts(html).map(hashSource)]],
    ["style-src-elem", ["'self'", "'unsafe-inline'"]],
    ["style-src-attr", ["'none'"]],
    ["img-src", ["'self'", "data:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'"]],
    ["frame-src", [page === "manager" ? "'self'" : "'none'"]],
    ["worker-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'none'"]],
    ["object-src", ["'none'"]],
  ];
  return directives.map(([name, sources]) => `${name} ${[...new Set(sources)].join(" ")}`).join("; ");
}

const CHARSET = /[ \t]*<meta\s+charset\s*=\s*["']?[\w-]+["']?\s*\/?>\n?/i;
const POLICY = /[ \t]*<meta\s+http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>\n?/gi;
const REFERRER = /[ \t]*<meta\s+name\s*=\s*["']?referrer["']?[^>]*>\n?/gi;

/**
 * The page with its charset, its policy and its referrer policy as the
 * first three elements of the head. The policy has to come before every
 * script and stylesheet, because a policy in a meta element does not apply
 * to what the parser has already passed, and Storybook puts a script
 * first in the preview's head; the charset goes before the policy so that
 * it stays in the first 1,024 bytes, where the browser looks for it.
 * A policy written by an earlier run is replaced, not added to.
 */
export function withPolicy(page, html) {
  const head = /<head\b[^>]*>/i.exec(html);
  if (!head) throw new Error("storybook-csp: the page has no <head>");
  if (!CHARSET.test(html)) throw new Error("storybook-csp: the page has no <meta charset>");
  const bare = html.replace(CHARSET, "").replace(POLICY, "").replace(REFERRER, "");
  const at = bare.indexOf(head[0]) + head[0].length;
  const metas = [
    `<meta charset="utf-8" />`,
    `<meta http-equiv="Content-Security-Policy" content="${policyFor(page, bare)}" />`,
    `<meta name="referrer" content="no-referrer" />`,
  ];
  return `${bare.slice(0, at)}\n${metas.map((meta) => `    ${meta}\n`).join("")}${bare.slice(at).replace(/^\n/, "")}`;
}

/** Writes the policy into each page of the built Storybook in `directory`
 * and returns the policies, by file name. */
export function applyTo(directory) {
  const written = {};
  for (const [file, page] of Object.entries(PAGES)) {
    const path = join(directory, file);
    let html;
    try {
      html = readFileSync(path, "utf8");
    } catch (cause) {
      throw new Error(`storybook-csp: cannot read ${path}; run \`storybook build\` first (${cause.message})`);
    }
    writeFileSync(path, withPolicy(page, html));
    written[file] = policyFor(page, html.replace(POLICY, ""));
  }
  return written;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const policies = applyTo(process.argv[2] ?? "storybook-static");
    for (const [file, policy] of Object.entries(policies)) console.log(`${file}: ${policy}`);
  } catch (cause) {
    console.error(cause.message);
    process.exit(1);
  }
}
