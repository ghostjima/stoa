# PR 2 (stage1/verify): fixes

1. Missing pairs, one of them failing: the Heatmap draws axis labels in
   `text-muted` over cells filled with `bid`/`ask` at opacity up to 1.0
   (`packages/react/src/Heatmap.tsx:47-52`); a review measured about
   1.50/1.46:1 light and 1.18/1.03:1 dark. Add the pair (at full
   opacity, the worst case) and record its failure in
   `known-violations.json`. Also add `text` over the Ladder wash bars
   (`Ladder.tsx:39-40`) and `accent` on `bg` for the tab indicator.
2. The colour-vision rows linearise the unclipped colour and clip after
   the matrix (`color.mjs:114`), while contrast and normal-vision
   distance clip first. Clip into sRGB first everywhere, so the PR's
   statement "colours are clipped channelwise before measuring" is true,
   and update the reported numbers.
3. Docs must claim only what exists: `pairs.mjs:123` calls a row "the
   pointer target for picking a level", but Ladder and TradeTable have
   no pointer handlers. Describe the row-height rule as applying when
   rows become interactive, and state that control sizes are not
   checked because no control size tokens exist yet.
4. Test name `color.test.mjs:93` says two colours are out of gamut but
   asserts eight; make the name match.
5. `checks.test.mjs:160`: an unknown id in `known-violations.json`
   should fail with a clear message, not a TypeError.
6. The `verify` table should print the colour-vision model name in its
   header even when every row passes.
7. The hand-computed CVD reference values reuse the code's matrix
   constants; add one reference value computed from the published
   Machado 2009 table (cite it) or from colorspacious, with the source
   named in the test comment.
