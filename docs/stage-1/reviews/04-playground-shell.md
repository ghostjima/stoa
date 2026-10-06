# PR 4 (stage1/playground): fixes

1. Saving can overwrite the committed baseline: the snapshot name
   defaults to "stoa-today" and `/api/save` overwrites silently
   (`src/App.tsx:39`, `server/tokenServer.ts:179-181`). Default to an
   empty or time-stamped name, and refuse to overwrite unless the
   request says so explicitly; never overwrite `stoa-today`.
2. Cross-site requests are accepted (`server/tokenServer.ts:142-160`):
   require `Content-Type: application/json` and a same-origin `Origin`
   (or no `Origin`) on both endpoints; add a test.
3. The screenshot does not render in the PR: the `<img>` is escaped in a
   code span and points at a branch blob URL. Embed it with markdown
   pointing at a commit-pinned URL.
4. `pnpm test` now needs a Playwright browser, so the acceptance command
   in `CLAUDE.md` fails on a fresh machine. Move the Playwright run to
   its own script (`pnpm test:e2e`), run it in CI, and keep `pnpm test`
   browser-free; correct the PR's claim about the pinned Chromium.
5. The verification verdict goes stale (`src/Verification.tsx:28-29`):
   clear the result and the agreement flag whenever the token files
   change.
6. Undo steps are per keystroke (`ControlPanel.tsx:109`,
   `history.ts:39`): coalesce edits to one step per field per pause
   (for example 500 ms) and one per slider drag.
7. Builds have no timeout (`tokenServer.ts:39`): add one and return a
   clear error.
8. Report only: `readCommit` in `src/api.ts:46` is unused; README line 51
   says "Both" but lists three endpoints.
