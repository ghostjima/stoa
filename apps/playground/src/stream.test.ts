import { describe, expect, it } from "vitest";
import { HISTORY, createStream, timeAt } from "./stream";

describe("the synthetic stream", () => {
  it("repeats exactly for the same seed", () => {
    const a = createStream(7);
    const b = createStream(7);
    for (let i = 0; i < 5; i++) {
      const left = a.step();
      const right = b.step();
      expect(left.mid).toBe(right.mid);
      expect([...left.book]).toEqual([...right.book]);
      expect(left.trades.map((t) => t.id)).toEqual(right.trades.map((t) => t.id));
    }
  });

  it("replays the heatmap window of an earlier frame, before frame 0 too", () => {
    const stream = createStream(7);
    for (let i = 0; i < 5; i++) stream.step();
    const at5 = stream.current();
    expect(at5.tick).toBe(5);
    expect(Array.from(stream.heatmapAt(5).cells)).toEqual(Array.from(at5.heatmap.cells));
    expect(Array.from(stream.heatmapAt(5 - HISTORY).cells)).toEqual(Array.from(at5.heatmap.cells));
    expect(Array.from(stream.heatmapAt(4).cells)).not.toEqual(Array.from(at5.heatmap.cells));
    expect(stream.heatmapAt(-3).cells.length).toBe(at5.heatmap.cells.length);
  });

  it("keeps market time by frame, not by the wall clock", () => {
    expect(timeAt(0)).toBe("14:30:00.000");
    expect(timeAt(5)).toBe("14:30:02.000");
    expect(timeAt(-5)).toBe("14:29:58.000");
  });

  it("publishes each frame to its subscribers until they unsubscribe", () => {
    const stream = createStream(3);
    const seen: number[] = [];
    const stop = stream.subscribe((frame) => seen.push(frame.tick));
    stream.step();
    stream.step();
    stop();
    stream.step();
    expect(seen).toEqual([1, 2]);
    expect(stream.current().tick).toBe(3);
  });

  it("keeps the trades tape short, newest first", () => {
    const stream = createStream(5);
    for (let i = 0; i < 40; i++) stream.step();
    const { trades } = stream.current();
    expect(trades).toHaveLength(12);
    expect(trades[0]?.id).toBe("t40");
    expect(trades.at(-1)?.id).toBe("t29");
  });

  it("scrolls a window over one heatmap buffer instead of rebuilding it", () => {
    const stream = createStream(9);
    const first = stream.current().heatmap;
    const second = stream.step().heatmap;
    expect(second.columns).toBe(first.columns);
    expect(second.rows).toBe(first.rows);
    expect(second.cells).not.toBe(first.cells);
    // The window moved one column: the second frame starts where the first
    // frame's second column started.
    const column = (data: typeof first, index: number) =>
      [...(data.cells as Float32Array).subarray(index * data.rows, (index + 1) * data.rows)];
    expect(column(second, 0)).toEqual(column(first, 1));
  });
});
