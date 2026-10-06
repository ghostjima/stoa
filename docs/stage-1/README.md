# Stage 1: playground and verification

Stage 1 builds an internal playground for tuning Stoa and a verification
layer that makes every design promise checkable. The playground is a
private tool (`apps/playground`, never published). Token values are not
changed in this stage; fixing the known violations is Stage 2.

Work is split into briefs. Each brief is one pull request, written so a
session with no other context can do it. Wave 1 briefs are independent
and can run in parallel.

| Brief | Branch | Touches | Depends on |
|---|---|---|---|
| [01 Verification engine](01-verification-engine.md) | `stage1/verify` | `packages/tokens` | none |
| [02 Token-change signal](02-token-signal.md) | `stage1/token-signal` | `packages/react` | none |
| [03 Token usage map](03-token-map.md) | `stage1/token-map` | `scripts/`, `docs/` | none |
| [04 Playground shell](04-playground-shell.md) | `stage1/playground` | `apps/playground`, workspace | none (integrates 01 and 02 after they merge) |

Later waves (briefed after wave 1 is reviewed): the parameter model and
override layer, fonts and type roles, motion, the reasoning inspector,
snapshot diffs.

Rules for every brief: read `CLAUDE.md` first; stay inside the brief's
scope; open a pull request to `main` with a description that lists what
was done, what was measured (with the commit), and what was left out;
CI must be green.
