# Brief 08: motion

## Goal

The owner tunes motion (easings, springs, the price flash, stagger) on
live data at a chosen message rate, within the WCAG limits on flashing
and auto-updating content, and can preview reduced motion per frame.

## Context

- Stoa's three easings, standard [0.2, 0, 0, 1], enter [0, 0, 0, 1],
  exit [0.3, 0, 1, 1], equal Material 3's standard set exactly. The
  token map (brief 03) found that no component reads the easing, flash
  or line-height tokens and `styles.css` hard-codes the standard curve;
  fixing the components is Stage 2, but the previews here must read the
  tokens.
- DTCG 2025.10 has `duration`, `cubicBezier` and `transition`; no spring
  type. Store springs as `$extensions["dev.stoa.motion"].spring =
  { damping, stiffness, mass }` next to a `transition` whose timing
  function is the nearest cubic-bezier, and emit CSS `linear()` by
  sampling the spring (Baseline widely available since 2026-06). Write
  the sampler (about 20 lines); do not depend on paid tooling.
- Licences to avoid: GSAP (not open source; the free licence forbids
  visual animation builders), Theatre.js studio (AGPL), easings.net code
  (GPL; the formulas are public). `bezier-easing` (MIT) evaluates curves
  for canvas.
- Live data: flash on price change (wash of up/down, peak alpha, decay,
  easing, area: cell, changed digits, or row) via `element.animate()` on
  DOM tables; on canvas (Ladder, Heatmap) the flash is drawn in the
  render loop, reading the tokens through the brief 02 signal. One
  `stagger` token (ms per item) with a cap.
- Limits: WCAG 2.3.1 (no more than three flashes per second) and 2.2.2
  (auto-updating content can be paused). Show a live flash counter per
  preview and a pause control.
- Reduced motion cannot be forced from page JavaScript; the token build
  should emit a `[data-motion="reduce"]` block with the same values as
  its `prefers-reduced-motion` block so a preview can opt in.

## Scope

1. `apps/playground/src/motion/`: cubic-bezier editor (four handles,
   side-by-side comparison) and spring editor (damping, stiffness, mass)
   with the `linear()` sampler; unit tests for the sampler (endpoints,
   overshoot, monotonic time).
2. Live previews on the synthetic stream with a message-rate control:
   flash (all parameters above), stagger; a flashes-per-second counter
   per frame that turns red above 3; pause and resume.
3. `packages/tokens` build: emit the `[data-motion="reduce"]` block
   (build test updated); a per-frame reduced-motion toggle in the
   playground.
4. Snapshot gains the motion values; springs stored as described.

## Out of scope

Changing components to read motion tokens (Stage 2); number tick
animations.

## Acceptance

Acceptance commands green; the PR states the measured flash rate at the
default message rate and the cost of the flash on canvas per frame
(browser, commit).
