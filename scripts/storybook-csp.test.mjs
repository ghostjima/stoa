import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { PAGES, applyTo, hashSource, inlineScripts, policyFor, withPolicy } from "./storybook-csp.mjs";

const dirs = [];
after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

// The shape of the two pages `storybook build` writes: the preview's head
// opens with a script, before the charset.
const PREVIEW = `<!doctype html>
<html lang="en">
  <head><script type="module" src="./vite-inject-mocker-entry.js"></script>
    <meta charset="utf-8" />
    <title>Storybook</title>
    <style>body { margin: 0; }</style>
    <script>window.CONFIG_TYPE = 'PRODUCTION';</script>
    <script type="module" crossorigin src="./assets/iframe.js"></script>
  </head>
  <body><div id="storybook-root"></div></body>
</html>
`;
const MANAGER = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />

    <title>storybook - Storybook</title>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window['FEATURES'] = {};
    </script>
    <script type="module">
      import './sb-manager/runtime.js';
    </script>
  </body>
</html>
`;

/** The policy stated in a page, by directive. */
function stated(html) {
  const content = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? "";
  return Object.fromEntries(content.split("; ").map((directive) => [directive.split(" ")[0], directive.split(" ").slice(1)]));
}

test("a text is hashed as the browser does: SHA-256 in base64, line endings as line feeds", () => {
  // The published SHA-256 of the empty string.
  assert.equal(hashSource(""), "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='");
  assert.equal(hashSource("a\r\nb\rc"), hashSource("a\nb\nc"));
  assert.notEqual(hashSource("a"), hashSource("a "));
});

test("the inline scripts of a page are read, and the ones with a src left out", () => {
  assert.deepEqual(inlineScripts(PREVIEW), ["window.CONFIG_TYPE = 'PRODUCTION';"]);
  assert.deepEqual(inlineScripts(MANAGER), ["\n      window['FEATURES'] = {};\n    ", "\n      import './sb-manager/runtime.js';\n    "]);
});

test("each inline script is allowed by the hash of its text, so a changed script changes the hash", () => {
  const policy = stated(withPolicy("manager", MANAGER));
  assert.deepEqual(policy["script-src"], ["'self'", ...inlineScripts(MANAGER).map(hashSource)]);
  const changed = stated(withPolicy("manager", MANAGER.replace("window['FEATURES'] = {};", "window['FEATURES'] = { actions: true };")));
  assert.notDeepEqual(changed["script-src"], policy["script-src"]);
  assert.equal(changed["script-src"].length, 3);
});

test("the directives are the ones stated, with no 'unsafe-inline' or eval for scripts", () => {
  const preview = stated(withPolicy("preview", PREVIEW));
  assert.deepEqual(preview, {
    "default-src": ["'self'"],
    "script-src": ["'self'", hashSource("window.CONFIG_TYPE = 'PRODUCTION';")],
    "style-src-elem": ["'self'", "'unsafe-inline'"],
    "style-src-attr": ["'none'"],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "frame-src": ["'none'"],
    "worker-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'none'"],
    "object-src": ["'none'"],
  });
  const manager = stated(withPolicy("manager", MANAGER));
  assert.deepEqual(manager["frame-src"], ["'self'"]);
  assert.deepEqual({ ...manager, "script-src": [], "frame-src": [] }, { ...preview, "script-src": [], "frame-src": [] });
  for (const policy of [policyFor("manager", MANAGER), policyFor("preview", PREVIEW)]) {
    assert.doesNotMatch(policy.split("; ").find((directive) => directive.startsWith("script-src")), /unsafe|\*/);
  }
});

test("the charset, the policy and the referrer policy open the head, before the script Storybook puts first", () => {
  const html = withPolicy("preview", PREVIEW);
  const head = html.slice(html.indexOf("<head>") + "<head>".length);
  const lines = head.split("\n");
  assert.equal(lines[1], `    <meta charset="utf-8" />`);
  assert.match(lines[2], /^ {4}<meta http-equiv="Content-Security-Policy" content="default-src 'self'; /);
  assert.equal(lines[3], `    <meta name="referrer" content="no-referrer" />`);
  assert.ok(html.indexOf("Content-Security-Policy") < html.indexOf("<script"));
  assert.ok(html.indexOf("Content-Security-Policy") < html.indexOf("<style"));
  assert.equal(html.match(/<meta charset/g).length, 1);
  // The charset is in the first 1,024 bytes.
  assert.ok(Buffer.byteLength(html.slice(0, html.indexOf("<meta charset") + 30)) < 1024);
  // Nothing else is touched.
  assert.ok(html.includes(`<script type="module" src="./vite-inject-mocker-entry.js"></script>`));
  assert.ok(html.includes("<style>body { margin: 0; }</style>"));
});

test("a second run replaces the policy and changes nothing else", () => {
  for (const [page, html] of [["manager", MANAGER], ["preview", PREVIEW]]) {
    const once = withPolicy(page, html);
    assert.equal(withPolicy(page, once), once);
    assert.equal(once.match(/Content-Security-Policy/g).length, 1);
  }
});

test("a page without a head or a charset is refused", () => {
  assert.throws(() => withPolicy("preview", "<!doctype html><title>x</title>"), /no <head>/);
  assert.throws(() => withPolicy("preview", "<!doctype html><html><head><title>x</title></head></html>"), /no <meta charset>/);
});

test("both pages of a built Storybook are written, and a missing build is said", () => {
  const dir = mkdtempSync(join(tmpdir(), "storybook-csp-"));
  dirs.push(dir);
  assert.throws(() => applyTo(dir), /run `storybook build` first/);
  writeFileSync(join(dir, "index.html"), MANAGER);
  writeFileSync(join(dir, "iframe.html"), PREVIEW);
  const policies = applyTo(dir);
  assert.deepEqual(Object.keys(policies), Object.keys(PAGES));
  assert.equal(stated(readFileSync(join(dir, "index.html"), "utf8"))["frame-src"][0], "'self'");
  assert.equal(stated(readFileSync(join(dir, "iframe.html"), "utf8"))["frame-src"][0], "'none'");
  assert.equal(`${Object.keys(stated(readFileSync(join(dir, "iframe.html"), "utf8"))).length} directives`, "12 directives");
  assert.equal(policies["iframe.html"], policyFor("preview", PREVIEW));
});
