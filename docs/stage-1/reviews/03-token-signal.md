# PR 3 (token-signal docs): fixes

1. The listener sits on `document` in the bubble phase (`tokens.ts:80`),
   so an event dispatched without `bubbles: true`, or one stopped by an
   ancestor, never arrives, although the docs say any ancestor works.
   Listen in the capture phase, on the element's `ownerDocument` (so
   previews in an iframe work), and document the event shape.
2. Tests: the "two instances read different values" test
   (`tokenSignal.test.tsx:95-116`) never sends a signal and would pass
   on main. Add: signalling wrapper A redraws A and not B; the `<html>`
   attribute path redraws immediately; no listener remains after
   unmount; strict mode keeps one listener; an event without `bubbles`
   still arrives.
3. The TwoThemes story (`Ladder.stories.tsx:60`) is only correct when the
   root theme is light, because light values live on `:root` and there
   is no `[data-theme="light"]` rule. Say so in the story, or set the
   light wrapper's variables explicitly. `var(--stoa-space-5)` at
   `Ladder.stories.tsx:59` does not exist (scale 4, 6, 8).
4. The cost figure measures a signal with no variable changed, and
   0.1 ms equals the timer resolution. Change a variable before
   signalling, report the median over many runs with the browser and
   commit, and describe it as an upper bound if it stays at the timer
   floor.
5. Low: bumping `tokensVersion` while `data` is set draws twice, first
   with stale tokens (`Ladder.tsx:89`); `lastFlat` keeps a reference to
   the caller's array. Draw once, and copy or document the buffer
   ownership.
