import { describe, expect, it } from "vitest";
import { DEFAULT_SCREEN_SETTINGS, GRID_ROW_COUNTS } from "./model";
import { ORDER_STATUSES, SYMBOLS, bondEvents, cachedGridOrders, couponScenarios, gridOrders, seeded } from "./data";
import { COMPONENT_WORDS } from "./words";

describe("the grid's orders", () => {
  it("are the same for the same seed and differ for another", () => {
    expect(gridOrders(50)).toEqual(gridOrders(50));
    expect(gridOrders(50, 12)).not.toEqual(gridOrders(50));
    const random = seeded(3);
    const first = [random(), random()];
    const again = seeded(3);
    expect([again(), again()]).toEqual(first);
  });

  it("number every order once and keep every field in range", () => {
    const orders = gridOrders(5_000);
    expect(new Set(orders.map((order) => order.id)).size).toBe(5_000);
    expect(orders[0]!.id).toBe("ORD-000001");
    expect(orders.at(-1)!.id).toBe("ORD-005000");
    for (const order of orders) {
      expect(SYMBOLS).toContain(order.symbol);
      expect(ORDER_STATUSES).toContain(order.status);
      expect(order.quantity).toBeGreaterThanOrEqual(1);
      expect(order.price).toBeGreaterThanOrEqual(20);
      expect(order.price).toBeLessThan(500);
    }
  });

  it("are made once per row count and shared", () => {
    expect(cachedGridOrders(300)).toBe(cachedGridOrders(300));
    expect(cachedGridOrders(300)).toHaveLength(300);
  });

  it("start light: the default is the smallest row count", () => {
    expect(DEFAULT_SCREEN_SETTINGS.gridRows).toBe(Math.min(...GRID_ROW_COUNTS));
  });

  it("have a word for every status in every language", () => {
    for (const words of Object.values(COMPONENT_WORDS)) {
      for (const status of ORDER_STATUSES) expect(words.status[status]).toBeTruthy();
    }
  });
});

describe("the charts' data", () => {
  it("draws three scenarios over the same dates, apart after the first period", () => {
    const [down, flat, up] = couponScenarios();
    expect(down!.points.map((p) => p.x)).toEqual(flat!.points.map((p) => p.x));
    expect(down!.points[0]!.y).toBe(flat!.points[0]!.y);
    expect(down!.points.at(-1)!.y).toBeLessThan(flat!.points.at(-1)!.y);
    expect(up!.points.at(-1)!.y).toBeGreaterThan(flat!.points.at(-1)!.y);
  });

  it("holds every kind of payment once at least, with unique ids", () => {
    const events = bondEvents();
    expect(new Set(events.map((event) => event.kind))).toEqual(new Set(["coupon", "amortisation", "offer", "maturity"]));
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
  });
});
