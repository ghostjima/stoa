# Stage 1, wave 2

Wave 1 (briefs 01 to 04) is merged: verification engine, token-change
signal, token map, playground shell. Wave 2 adds the parameter model and
the tuning panels. Each brief is one pull request; the four can run in
parallel.

| Brief | Branch | Adds |
|---|---|---|
| [05 Parameter model](05-parameter-model.md) | `stage1/parameter-model` | `packages/tokens/src/model.mjs`, playground parameters panel, presets |
| [06 Verification panel](06-verification-panel.md) | `stage1/verification-panel` | in-browser checks in the playground, colour-vision previews |
| [07 Type](07-type.md) | `stage1/type` | font engine (worker), font inspector, type roles |
| [08 Motion](08-motion.md) | `stage1/motion` | easing and spring editors, live-data motion previews |

Rules for every brief (in addition to `CLAUDE.md`):

- Token source files (`packages/tokens/tokens/*.json`) do not change in
  this wave; migrating them (DTCG 2025.10, fixing recorded violations) is
  Stage 2. New code may produce token trees; it does not rewrite the
  sources.
- Each brief adds its own panel as a module under
  `apps/playground/src/<area>/` and registers it in one place (the panel
  list in the app shell), so parallel work touches as little shared code
  as possible. If the shell has no panel list yet, add the smallest one.
- `known-violations.json` stays authoritative: nothing in this wave may
  add entries to hide new failures.
- Open the pull request against `main`; before finishing, merge the
  latest `main` into the branch and run the acceptance commands again.
- Wave 3 (later): the reasoning inspector, snapshot diffs, the spec
  generator.
