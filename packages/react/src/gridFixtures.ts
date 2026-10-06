// Deterministic orders for the DataGrid's stories and tests: an id, an
// account, a symbol, a side, an editable status and note, and 24 numbers,
// thirty columns in all.
import type { DataGridColumn } from "./DataGrid";

export type SampleOrder = {
  id: string;
  account: string;
  symbol: string;
  side: "buy" | "sell";
  status: string;
  note: string;
  values: number[];
};

const SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOG", "META", "TSLA", "JPM", "XOM", "KO"];
export const STATUS_IDS = ["new", "working", "filled", "cancelled", "rejected"] as const;
export const NOTE_MAX = 40;

const WORDS = {
  en: {
    id: "Order",
    account: "Account",
    symbol: "Symbol",
    side: "Side",
    status: "Status",
    note: "Note",
    buy: "Buy",
    sell: "Sell",
    statuses: ["New", "Working", "Filled", "Cancelled", "Rejected"],
    metrics: [
      "Price", "Quantity", "Notional", "Fee", "Tax", "Rebate", "Filled qty", "Open qty", "VWAP", "Slippage",
      "Spread", "Bid", "Ask", "Mid", "High", "Low", "Open", "Close", "Change", "Change %", "Volume", "Trades",
      "Delta", "Margin",
    ],
    noteTooLong: (n: number) => `At most ${NOTE_MAX} characters; this note has ${n}.`,
    rejectedNeedsNote: "A rejected order needs a note.",
  },
  ar: {
    id: "الأمر",
    account: "الحساب",
    symbol: "الرمز",
    side: "الاتجاه",
    status: "الحالة",
    note: "ملاحظة",
    buy: "شراء",
    sell: "بيع",
    statuses: ["جديد", "قيد التنفيذ", "منفذ", "ملغى", "مرفوض"],
    metrics: [
      "السعر", "الكمية", "القيمة الاسمية", "الرسوم", "الضريبة", "الخصم", "الكمية المنفذة", "الكمية المتبقية",
      "متوسط السعر المرجح", "الانزلاق", "الفارق", "سعر الشراء", "سعر البيع", "السعر الأوسط", "الأعلى", "الأدنى",
      "الافتتاح", "الإغلاق", "التغير", "نسبة التغير", "الحجم", "الصفقات", "دلتا", "الهامش",
    ],
    noteTooLong: (n: number) => `الحد الأقصى ${NOTE_MAX} حرفًا؛ هذه الملاحظة ${n}.`,
    rejectedNeedsNote: "الأمر المرفوض يحتاج إلى ملاحظة.",
  },
};

/** `count` orders, the same for the same seed. */
export function sampleOrders(count: number, seed = 11): SampleOrder[] {
  let s = seed >>> 0;
  const r = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const out: SampleOrder[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const price = Math.round((20 + r() * 480) * 100) / 100;
    const quantity = Math.round(1 + r() * r() * 5000);
    const values = [price, quantity, Math.round(price * quantity * 100) / 100];
    for (let m = 3; m < 24; m++) values.push(m % 3 === 0 ? Math.round(r() * 100000) : Math.round(r() * 1000000) / 100);
    out[i] = {
      id: `ORD-${String(i + 1).padStart(6, "0")}`,
      account: `ACC-${100 + Math.floor(r() * 900)}`,
      symbol: SYMBOLS[Math.floor(r() * SYMBOLS.length)]!,
      side: r() < 0.5 ? "buy" : "sell",
      status: STATUS_IDS[Math.floor(r() * STATUS_IDS.length)]!,
      note: "",
      values,
    };
  }
  return out;
}

/** The thirty columns: order and account pinned, status and note
 * editable, every column but the note sortable. */
export function sampleOrderColumns(lang: "en" | "ar" = "en"): DataGridColumn<SampleOrder>[] {
  const w = WORDS[lang];
  return [
    { id: "id", header: w.id, accessor: (o) => o.id, width: 120, pinned: true, sortable: true },
    { id: "account", header: w.account, accessor: (o) => o.account, width: 104, pinned: true, sortable: true },
    { id: "symbol", header: w.symbol, accessor: (o) => o.symbol, width: 88, sortable: true },
    { id: "side", header: w.side, accessor: (o) => o.side, width: 80, sortable: true, format: (v) => (v === "buy" ? w.buy : w.sell) },
    {
      id: "status",
      header: w.status,
      accessor: (o) => o.status,
      width: 128,
      sortable: true,
      editor: {
        kind: "enum",
        options: STATUS_IDS.map((id, i) => ({ id, label: w.statuses[i]! })),
        validate: (value, row) => (value === "rejected" && row.note.trim() === "" ? w.rejectedNeedsNote : null),
      },
    },
    {
      id: "note",
      header: w.note,
      accessor: (o) => o.note,
      width: 200,
      editor: {
        kind: "text",
        validate: (value) => (value.trim().length > NOTE_MAX ? w.noteTooLong(value.trim().length) : null),
      },
    },
    ...w.metrics.map(
      (header, m): DataGridColumn<SampleOrder> => ({
        id: `m${m}`,
        header,
        accessor: (o) => o.values[m] ?? 0,
        width: 112,
        sortable: true,
      }),
    ),
  ];
}
