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

## Dependencies

- `pnpm-lock.yaml` is committed and CI installs with
  `pnpm install --frozen-lockfile`. pnpm is pinned in `packageManager`.
  A dependency's install script runs only if `pnpm-workspace.yaml` allows
  that package by name; today that is esbuild alone.
- The `Audit` workflow (`.github/workflows/audit.yml`) runs on every pull
  request, on every push to `main` and every Monday:
  - `pnpm audit --prod --audit-level=low`: an advisory of any severity
    against a production dependency fails: what an application gets with
    Stoa's packages, and what the playground bundles.
  - `pnpm audit --audit-level=high`: a high or critical advisory against
    any package, build and test tools included, fails. Lower ones against
    the tools are printed and do not fail: those tools run on a
    developer's machine and in CI, not in an application.
- Dependabot proposes updates weekly for npm and the GitHub Actions, and
  every action is pinned to a commit.

An audit knows only published advisories: it says nothing about a
vulnerability nobody has reported or a package that turned malicious
yesterday.

## Supported versions

Stoa's packages are not yet published to a registry. Only the current
`main` is supported.
