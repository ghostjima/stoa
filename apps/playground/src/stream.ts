// A deterministic synthetic market stream shared by the preview
// frames: one clock, one set of frames, so the frames differ only by
// theme and direction.
//
// The fixtures come from packages/react/src/fixtures.ts, the same data the
// stories use. They are not part of the package's exports, and this is a
// private tool, so the source is read directly.
import { sampleBook, sampleHeatmap } from "../../../packages/react/src/fixtures";
import type { HeatmapData, Trade } from "@ghostjima/stoa-react";

export type StreamFrame = {
  /** Frames since the stream started. */
  tick: number;
  book: Float64Array;
  heatmap: HeatmapData;
  /** Newest first, at most `TRADE_ROWS`. */
  trades: Trade[];
  mid: number;
};

/** Columns held in the heatmap window; the buffer is twice this, and the
 * window scrolls across it so a frame is a subarray, not a copy. A window
 * of 180 by 64 is about 11,500 cells, redrawn in every frame at once. */
const WINDOW = 180;
const ROWS = 64;
const TRADE_ROWS = 12;

/** How many frames back the heatmap can be replayed: one window. */
export const HISTORY = WINDOW;

/** Market time of frame 0, and how much market time one frame covers. The
 * clock is the stream's own, not the wall clock, so it does not depend on
 * the playback speed. */
const START = Date.UTC(2026, 0, 1, 14, 30, 0);
const FRAME_MS = 400;

/** The market time of a frame, "HH:MM:SS.mmm". Frames before the first
 * one are allowed: the replay reaches back a window from frame 0 too. */
export const timeAt = (tick: number): string => new Date(START + tick * FRAME_MS).toISOString().slice(11, 23);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export type Stream = {
  current(): StreamFrame;
  /** The heatmap window that ended at an earlier frame, for replay. The
   * buffer repeats every window, so any frame has one. */
  heatmapAt(tick: number): HeatmapData;
  /** Advance one frame and publish it. */
  step(): StreamFrame;
  subscribe(listener: (frame: StreamFrame) => void): () => void;
  start(intervalMs: number): void;
  stop(): void;
  running(): boolean;
};

/** A stream of books, heatmap windows and trades from the fixtures. The
 * same seed always gives the same sequence, so two sessions compare. */
export function createStream(seed = 7): Stream {
  const random = rng(seed);
  const buffer = sampleHeatmap(WINDOW * 2, ROWS, seed);
  const listeners = new Set<(frame: StreamFrame) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let tick = 0;
  let mid = 222.6;
  let trades: Trade[] = [];

  const heatmapAt = (at: number): HeatmapData => {
    const start = ((at % WINDOW) + WINDOW) % WINDOW;
    return {
      cells: buffer.cells.subarray(start * ROWS, (start + WINDOW) * ROWS),
      columns: WINDOW,
      rows: ROWS,
      top: +(mid + (ROWS / 2) * 0.01).toFixed(2),
      tick: 0.01,
    };
  };

  const frameAt = (): StreamFrame => ({
    tick,
    book: sampleBook(mid, 12, seed + tick),
    heatmap: heatmapAt(tick),
    trades,
    mid,
  });

  let frame = frameAt();

  const step = () => {
    tick += 1;
    mid = +(mid + (random() - 0.5) * 0.03).toFixed(2);
    const buy = random() < 0.5;
    const trade: Trade = {
      id: `t${tick}`,
      time: timeAt(tick),
      side: buy ? "buy" : "sell",
      price: +(mid + (buy ? 0.01 : -0.01)).toFixed(2),
      size: Math.round(50 + random() * random() * 1500),
    };
    trades = [trade, ...trades].slice(0, TRADE_ROWS);
    frame = frameAt();
    for (const listener of listeners) listener(frame);
    return frame;
  };

  return {
    current: () => frame,
    heatmapAt,
    step,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(intervalMs) {
      if (timer) clearInterval(timer);
      timer = setInterval(step, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    running: () => timer !== null,
  };
}
