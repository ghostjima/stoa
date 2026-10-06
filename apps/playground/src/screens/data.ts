// The data of the component screens: deterministic, so two frames, a
// reload and a test all see the same numbers. Words are not here; each
// screen names the data in its frame's language (words.ts).
import type { ChartTone, StripEvent } from "@ghostjima/stoa-react";
import type { OrderStatus } from "./words";

/** A generator of numbers in [0, 1) from a seed: the same seed, the same
 * sequence. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export type GridOrder = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  status: OrderStatus;
  quantity: number;
  price: number;
};

export const SYMBOLS = ["ACME", "ZYLO", "QUIX", "VORN", "KELP", "ORBX", "PYRA", "QBX", "XQV", "QZ"];
export const ORDER_STATUSES: OrderStatus[] = ["new", "working", "filled", "cancelled", "rejected"];

/** `count` orders, numbered from ORD-000001. */
export function gridOrders(count: number, seed = 11): GridOrder[] {
  const random = seeded(seed);
  const out: GridOrder[] = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = {
      id: `ORD-${String(i + 1).padStart(6, "0")}`,
      symbol: SYMBOLS[Math.floor(random() * SYMBOLS.length)]!,
      side: random() < 0.5 ? "buy" : "sell",
      status: ORDER_STATUSES[Math.floor(random() * ORDER_STATUSES.length)]!,
      quantity: Math.round(1 + random() * random() * 5000),
      price: Math.round((20 + random() * 480) * 100) / 100,
    };
  }
  return out;
}

const ordersByCount = new Map<number, GridOrder[]>();

/** The orders for a row count, made once and shared by both frames: a
 * frame copies them only when one of its rows is edited. */
export function cachedGridOrders(count: number): GridOrder[] {
  let orders = ordersByCount.get(count);
  if (!orders) {
    orders = gridOrders(count);
    ordersByCount.set(count, orders);
  }
  return orders;
}

/** Order counts per status for the filter chips. */
export const STATUS_COUNTS: Record<OrderStatus, number> = { new: 12, working: 31, filled: 140, cancelled: 9, rejected: 2 };

/** Milliseconds since the epoch for a day, in UTC. */
const day = (year: number, month: number, date = 15) => Date.UTC(year, month, date);

/** A floating-rate bond's coupon under three key-rate scenarios. Down
 * and up are directions here, so they take the falling and rising tones;
 * the unchanged rate is neutral. */
export function couponScenarios(): { id: "down" | "flat" | "up"; tone: ChartTone; points: { x: number; y: number }[] }[] {
  const at = Array.from({ length: 12 }, (_, i) => day(2027, i * 3));
  const path = (drift: number) => at.map((x, i) => ({ x, y: Number((41.14 + drift * Math.min(i, 6) * (1 - 0.04 * i)).toFixed(2)) }));
  return [
    { id: "down", tone: "down", points: path(-0.9) },
    { id: "flat", tone: "neutral", points: path(0) },
    { id: "up", tone: "up", points: path(0.9) },
  ];
}

/** The start of the payments strip: today, as far as the screen is
 * concerned. */
export const STRIP_FROM = day(2026, 9, 4);

/** A bond's payments to maturity: quarterly coupons, amortisations in the
 * last year, an offer and maturity. */
export function bondEvents(): StripEvent[] {
  const out: StripEvent[] = [];
  for (let i = 0; i < 16; i++) out.push({ id: `c${i}`, at: day(2027, i * 3), kind: "coupon" });
  for (let i = 12; i < 15; i++) out.push({ id: `a${i}`, at: day(2027, i * 3), kind: "amortisation" });
  out.push({ id: "offer", at: day(2028, 6), kind: "offer" });
  out.push({ id: "maturity", at: day(2027, 45), kind: "maturity" });
  return out;
}

export type Position = { index: number; quantity: number; price: number; yieldPercent: number; change: number };

/** Open bond positions; `index` picks the bond's name from the words. */
export const POSITIONS: Position[] = [
  { index: 0, quantity: 1200, price: 97.35, yieldPercent: 14.82, change: 0.12 },
  { index: 1, quantity: 800, price: 71.6, yieldPercent: 15.1, change: -0.35 },
  { index: 2, quantity: 2500, price: 99.12, yieldPercent: 18.4, change: 0.04 },
  { index: 3, quantity: 400, price: 88.05, yieldPercent: 14.95, change: -0.08 },
  { index: 4, quantity: 1500, price: 77.9, yieldPercent: 15.3, change: 0.21 },
  { index: 5, quantity: 300, price: 92.44, yieldPercent: 14.7, change: 0 },
];

/** A position's value in roubles: a bond's par is 1,000 roubles. */
export const positionValue = (position: Position) => Math.round(position.quantity * position.price * 10);

export type WatchItem = { id: string; textValue: string; symbol: string; sector: "technology" | "energy" | "banks" | "retail" | "staples"; last: number };

export const WATCHLIST: Omit<WatchItem, "textValue">[] = [
  { id: "ACME", symbol: "ACME", sector: "technology", last: 222.61 },
  { id: "XQV", symbol: "XQV", sector: "energy", last: 118.3 },
  { id: "QBX", symbol: "QBX", sector: "banks", last: 241.05 },
  { id: "VORN", symbol: "VORN", sector: "retail", last: 198.77 },
  { id: "QZ", symbol: "QZ", sector: "staples", last: 63.42 },
];

/** The session log's times and levels; the messages are in the words, one
 * per line, in this order. */
export const LOG_STAMPS: { time: string; level: "INFO" | "WARN" | "ERROR" }[] = [
  { time: "09:30:00.012", level: "INFO" },
  { time: "09:30:00.418", level: "INFO" },
  { time: "09:31:12.904", level: "INFO" },
  { time: "09:31:13.377", level: "INFO" },
  { time: "09:32:40.051", level: "WARN" },
  { time: "09:33:02.660", level: "ERROR" },
];

/** The order the overlays screen is about. */
export const ORDER = { id: "ORD-000214", symbol: "ACME", side: "buy" as const, limit: 222.6, quantity: 500, filled: 200, venue: "XNAS" };

/** The order as the gateway sent it: code, so in no language. */
export const ORDER_PAYLOAD = JSON.stringify(
  {
    id: ORDER.id,
    symbol: ORDER.symbol,
    side: ORDER.side,
    type: "limit",
    limit: ORDER.limit,
    quantity: ORDER.quantity,
    timeInForce: "day",
    venue: ORDER.venue,
  },
  null,
  2,
);

export const VENUES = ["XNAS", "XNYS", "ARCX", "BATS"];
