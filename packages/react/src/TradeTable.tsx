import { useStoaFormat } from "./locale";
import { Table, type TableColumn } from "./Table";

export type Trade = {
  /** Stable key. */
  id: string;
  time: string;
  /** "buy": the buyer took liquidity (an ask was lifted); "sell": a bid was hit. */
  side: "buy" | "sell";
  price: number;
  size: number;
};

export type TradeTableProps = {
  trades: Trade[];
  caption: string;
  /** What the table says while it has no trades; the locale's "No trades
   * yet." by default. */
  emptyText?: string;
  formatPrice?: (p: number) => string;
};

/** Recent trades, newest first, on `Table`. Side is a word and a colour;
 * numbers are tabular and right-aligned. Headers, side words and digits
 * follow the locale (see `locale.ts`); `formatPrice` overrides the price
 * format. */
export function TradeTable({ trades, caption, formatPrice, emptyText }: TradeTableProps) {
  const locale = useStoaFormat();
  const words = locale.messages;
  const price = formatPrice ?? ((p: number) => locale.decimal(p, 2));
  const columns: TableColumn<Trade>[] = [
    { id: "time", header: words.time, cell: (t) => locale.digits(t.time) },
    {
      id: "side",
      header: words.side,
      cell: (t) => <span className={t.side === "buy" ? "stoa-up" : "stoa-down"}>{t.side === "buy" ? words.buy : words.sell}</span>,
    },
    { id: "price", header: words.price, numeric: true, cell: (t) => price(t.price) },
    { id: "size", header: words.size, numeric: true, cell: (t) => locale.integer(t.size) },
  ];
  return (
    <Table
      columns={columns}
      rows={trades}
      rowKey={(t) => t.id}
      caption={caption}
      hideCaption
      emptyText={emptyText ?? words.noTrades}
      mono
    />
  );
}
