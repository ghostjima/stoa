import { describe, expect, it } from "vitest";
import { describeBook, ladderRows, parseBook } from "./book";
import { cellAlpha, maxAbs } from "./heatmapScale";

const flat = [2, 1, 99.05, 300, 99.04, 100, 99.1, 50];

describe("book", () => {
  it("parses the engine's flat form, best levels first", () => {
    const b = parseBook(flat);
    expect(b.bids).toEqual([{ price: 99.05, size: 300 }, { price: 99.04, size: 100 }]);
    expect(b.asks).toEqual([{ price: 99.1, size: 50 }]);
    expect(parseBook(null)).toEqual({ bids: [], asks: [] });
  });

  it("lays asks above the middle and bids below, bars relative to the largest level", () => {
    const rows = ladderRows(parseBook(flat), 3, 20, 100);
    const ask = rows.find((r) => r.side === "ask")!;
    const best = rows.find((r) => r.side === "bid" && r.price === 99.05)!;
    expect(ask.y).toBe(40); // best ask just above the middle line at 60
    expect(best.y).toBe(60);
    expect(best.barWidth).toBe(100);
    expect(ask.barWidth).toBeCloseTo(100 / 6);
  });

  it("describes the top of the book in one sentence", () => {
    expect(describeBook(parseBook(flat))).toBe("best bid 99.05 for 300, best ask 99.10 for 50, spread 0.05.");
    expect(describeBook(parseBook(null))).toBe("The book is empty.");
  });
});

describe("heatmap scale", () => {
  it("is logarithmic and bounded", () => {
    expect(cellAlpha(0, 1000)).toBe(0);
    expect(cellAlpha(1000, 1000)).toBe(1);
    expect(cellAlpha(10, 1000)).toBeGreaterThan(0.3);
    expect(maxAbs([3, -7, 5])).toBe(7);
  });
});
