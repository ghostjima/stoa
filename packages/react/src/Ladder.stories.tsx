import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { Ladder, type LadderHandle } from "./Ladder";
import { sampleBook } from "./fixtures";
import { signalTokensChanged } from "./tokens";

const meta: Meta<typeof Ladder> = {
  title: "Data/Ladder",
  component: Ladder,
  args: { label: "Order book, 12 levels per side", depth: 12 },
  decorators: [(Story) => <div style={{ maxInlineSize: 360 }}><Story /></div>],
};
export default meta;

export const Static: StoryObj<typeof Ladder> = { args: { data: sampleBook() } };

/** Updated through the imperative handle at the display's frame rate,
 * without a React render per frame, as a replay does. */
export const Live: StoryObj<typeof Ladder> = {
  render: (args) => {
    const ref = useRef<LadderHandle>(null);
    useEffect(() => {
      let raf = 0;
      let seed = 1;
      let mid = 222.6;
      const tick = () => {
        mid = +(mid + (Math.random() - 0.5) * 0.02).toFixed(2);
        ref.current?.draw(sampleBook(mid, args.depth, seed++));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [args.depth]);
    return <Ladder {...args} ref={ref} />;
  },
};

export const Empty: StoryObj<typeof Ladder> = { args: { data: null } };

// Tokens ship one scoped override rule for `[data-theme="dark"]`, but none
// for `[data-theme="light"]`: light values live directly on `:root`. So
// the "light" wrapper's `data-theme="light"` attribute below is only
// correct while the surrounding root itself resolves to light (the
// Storybook toolbar's default, and no `prefers-color-scheme: dark`) - it
// carries no scoped override of its own, and would silently inherit dark
// values from an ancestor if the root theme were switched to dark.

const REDRAW_RUNS = 25;

/** The measurement alternates `--stoa-color-surface` between these two, so
 * every signal re-reads a value that really differs from the one before it.
 * Both are concrete colours: setting the variable to
 * `var(--stoa-color-surface)` would be a self-reference, which computes to
 * an invalid value rather than to the token underneath, so half the runs
 * would measure drawing with an invalid colour. */
const PROBE_SURFACES = ["rgb(24, 24, 27)", "rgb(250, 250, 250)"];

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** The smallest step this browser's `performance.now()` can report, from
 * reading it until the value changes. A median at or below this step is
 * indistinguishable from the clock itself, so the figure it produces is an
 * upper bound rather than a measurement. */
function timerResolution(): number {
  let step = Infinity;
  for (let i = 0; i < 1000; i++) {
    const t0 = performance.now();
    let t1 = t0;
    // Bounded, so a clock that reads the same value forever cannot hang
    // the page; a clock that never moved at all reports a step of 0, which
    // is what such a clock measured every redraw as anyway.
    for (let spin = 0; spin < 100_000 && t1 === t0; spin++) t1 = performance.now();
    if (t1 > t0) step = Math.min(step, t1 - t0);
  }
  return Number.isFinite(step) ? step : 0;
}

/** Two previews on one page, each themed on its own wrapper rather than
 * on `<html>`: the mechanism the playground needs to show several themes
 * side by side. Each "Signal" button changes a token variable on that
 * preview's own wrapper, dispatches `stoa:tokens` on it, and repeats that
 * `REDRAW_RUNS` times, reporting the median redraw cost (a no-op signal,
 * with no variable changed, would measure event-dispatch overhead rather
 * than the real re-read-and-redraw cost). It then puts the wrapper's own
 * value back and signals once more, so measuring leaves the preview as it
 * was. If the median is at or below the browser's timer resolution, the
 * redraw is shorter than the clock can show, so the figure is reported as
 * an upper bound rather than a measurement. */
export const TwoThemes: StoryObj<typeof Ladder> = {
  render: (args) => {
    const light = useRef<HTMLDivElement>(null);
    const dark = useRef<HTMLDivElement>(null);
    const [lightCost, setLightCost] = useState<string | null>(null);
    const [darkCost, setDarkCost] = useState<string | null>(null);

    const signal = (root: HTMLDivElement | null, report: (cost: string) => void) => {
      if (!root) return;
      const prop = "--stoa-color-surface";
      const original = root.style.getPropertyValue(prop);
      const step = timerResolution();
      const samples: number[] = [];
      try {
        for (let i = 0; i < REDRAW_RUNS; i++) {
          root.style.setProperty(prop, PROBE_SURFACES[i % PROBE_SURFACES.length]!);
          const t0 = performance.now();
          signalTokensChanged(root);
          samples.push(performance.now() - t0);
        }
      } finally {
        // Put the wrapper back the way it was and signal once more, so the
        // last run does not leave the preview drawn in a probe colour.
        if (original) root.style.setProperty(prop, original);
        else root.style.removeProperty(prop);
        signalTokensChanged(root);
      }
      const m = median(samples);
      report(
        m <= step
          ? `at most ${step.toFixed(3)} ms (median of ${REDRAW_RUNS} runs at or below this browser's timer step)`
          : `${m.toFixed(3)} ms (median of ${REDRAW_RUNS} runs, timer step ${step.toFixed(3)} ms)`,
      );
    };

    return (
      <div style={{ display: "flex", gap: "var(--stoa-space-4)", flexWrap: "wrap" }}>
        <div ref={light} data-theme="light" style={{ maxInlineSize: 320 }}>
          <Ladder {...args} label="Light preview" data={sampleBook(222.6, args.depth, 7)} />
          <button onClick={() => signal(light.current, setLightCost)}>Signal</button>
          {lightCost && <p>Redraw cost: {lightCost}.</p>}
        </div>
        <div ref={dark} data-theme="dark" style={{ maxInlineSize: 320 }}>
          <Ladder {...args} label="Dark preview" data={sampleBook(222.6, args.depth, 11)} />
          <button onClick={() => signal(dark.current, setDarkCost)}>Signal</button>
          {darkCost && <p>Redraw cost: {darkCost}.</p>}
        </div>
      </div>
    );
  },
};
