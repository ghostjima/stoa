# Security policy

## Reporting a vulnerability

Please report a vulnerability privately through GitHub's private
vulnerability reporting: on the repository's Security tab, choose
"Report a vulnerability". Do not open a public issue or pull request for
it.

Include what is affected (package, component or script, and the commit),
how to reproduce it, and what an attacker could do with it. You will get
an answer in the advisory thread; a confirmed issue is fixed on `main`
and credited in the advisory unless you ask otherwise.

## Supported versions

Stoa's packages are not yet published to a registry. Only the current
`main` is supported.

## What the published Storybook enforces

Stoa's public page is its Storybook, a static build. GitHub Pages sets
no security headers for it and offers no way to add any, so the policies
below are meta elements in the build's two pages: `index.html`,
Storybook's own interface (the manager), and `iframe.html`, the preview
the stories run in. `pnpm build-storybook` writes them
(`scripts/storybook-csp.mjs`, after `storybook build`); `storybook dev`
carries none. The playground is a development tool and is not
published.

### Content Security Policy

```
default-src 'self';
script-src 'self' 'sha256-(each inline script of the page)';
style-src-elem 'self' 'unsafe-inline';
style-src-attr 'none';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-src 'self' (the manager) or 'none' (the preview);
worker-src 'none';
base-uri 'self';
form-action 'none';
object-src 'none'
```

- `script-src` is strict in both pages: the build's own files, and the
  inline scripts Storybook writes into each page (two in the manager,
  three in the preview), each allowed by the SHA-256 of its text. The
  script computes the hashes from the pages as built, so a Storybook
  upgrade that changes an inline script ships with the new hash. No
  `'unsafe-inline'` and no `'unsafe-eval'`: an injected script, an inline
  handler, `eval` and `new Function` are refused.
- `style-src-elem` is not strict: `'unsafe-inline'`, in both pages. A
  strict list is not feasible here. Storybook's interface and its preview
  tools add style elements at run time, and some of their text is made
  at run time as well (the background and the grid a visitor picks, the
  highlight tool's keyframes); a story may render a style element of
  its own; and a static host cannot issue a nonce per response. Measured
  on the build of Storybook 10.6.0 against a report-only policy that
  held style elements to `'self'`: every story's page had at least three
  refused (two in the page itself, one from Storybook's highlight tool),
  and the manager's page all eleven of its own, nine of them added at
  run time. What `'unsafe-inline'` leaves open is narrow:
  an injected style element could restyle the page, but could not load
  or send anything to another origin, because every other directive
  says `'self'`.
- `style-src-attr 'none'`: a style attribute in markup is refused.
  Stoa's components and Storybook write inline styles through the CSS
  object model, which a policy does not restrict; no story needs the
  attribute.
- `img-src`: `data:` is for the preview's empty icon. `font-src 'self'`:
  Storybook's own face and Stoa's self-hosted families are files of the
  build (`.storybook/main.ts` keeps the smallest subsets from being
  written into the stylesheet as `data:` URLs).
- `connect-src 'self'`, `worker-src 'none'`, `frame-src`: neither page
  asks another origin for anything or starts a worker; only the manager
  frames a page, the preview.
- `base-uri 'self'`, `form-action 'none'`, `object-src 'none'`: no base
  element can redirect the page's relative URLs, no form can be posted
  anywhere, no plugin content is loaded.

`packages/react/e2e/csp.e2e.ts` checks it in Chromium on the built
Storybook: in each page the script hashes are the hashes of the inline
scripts as the browser reads them; every story in the build's index
loads without a violation or a console error; so does Storybook's
interface around a story, with its toolbar, tools and panels used; and
in each page an injected inline script, an inline handler, `eval`, a
style attribute, a base element, a worker, a frame of another origin
and a script, stylesheet, image or request to another origin are each
refused. The rest of the stories' browser tests run on the same build,
under the same policy.

### Referrer policy

Both pages state `<meta name="referrer" content="no-referrer">`.

### Limits

- A policy in a meta element cannot carry `frame-ancestors`, `sandbox`
  or a report endpoint, and Pages sends no `X-Frame-Options`: another
  site can show the Storybook in a frame. Nothing in it acts on an
  account.
- `'self'` is the whole origin. On Pages that is `ghostjima.github.io`,
  which every site of the account shares, so the policy does not tell
  this Storybook's files from another project's.
- Storybook's interface links to storybook.js.org and GitHub with
  `target="_blank"` and no `rel`. That markup is Storybook's; current
  browsers treat such a link as `noopener`, and the referrer policy
  keeps the address out of the request. No story of Stoa's opens a new
  tab.
- Transport security (HTTPS, HSTS) and every response header are GitHub
  Pages' and are not set here.
- The policy is tested in Chromium only.

### Out of scope

The Storybook holds no accounts and no personal data; its figures are
made up. The packages are components: what an application built with
them serves, and under which policy, is that application's. Reports
about GitHub Pages itself, Storybook's own interface beyond what this
repository configures, or a browser extension changing the page are not
vulnerabilities of this repository.
