import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatDate } from "./chartScale";
import { useStoaFormat } from "./locale";
import { Panel } from "./Panel";
import { Table, type TableColumn } from "./Table";
import { TradeTable } from "./TradeTable";

const meta: Meta = { title: "Data/Table" };
export default meta;

type Payment = { id: string; at: number; coupon: number; principal: number; event: "coupon" | "amortisation" | "maturity" };

/** A bond's payments: quarterly coupons on a falling principal, with
 * amortisations in the last year. Deterministic, for stories only. */
function payments(count = 16): Payment[] {
  const out: Payment[] = [];
  let principal = 1000;
  for (let i = 0; i < count; i++) {
    const at = Date.UTC(2027, i * 3, 15);
    const last = i === count - 1;
    const amortises = !last && i >= count - 4;
    const paid = last ? principal : amortises ? 250 : 0;
    out.push({ id: String(i), at, coupon: +((principal * 0.165) / 4).toFixed(2), principal: paid, event: last ? "maturity" : amortises ? "amortisation" : "coupon" });
    principal -= paid;
  }
  return out;
}

/** An application's own words for its column headers. */
const HEADERS = {
  en: { date: "Date", coupon: "Coupon, RUB", principal: "Principal, RUB", event: "Event", outstanding: "Outstanding after, RUB", rate: "Annual rate", days: "Days in period" },
  ar: { date: "التاريخ", coupon: "الكوبون، روبل", principal: "الأصل، روبل", event: "الحدث", outstanding: "المتبقي بعده، روبل", rate: "المعدل السنوي", days: "أيام الفترة" },
};

function useHeaders() {
  return HEADERS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
}

/** Columns in the locale's words and digits, as an application would build
 * them: headers are nodes, so they can come from its own messages. */
function usePaymentColumns(): TableColumn<Payment>[] {
  const locale = useStoaFormat();
  const words = locale.messages;
  const h = useHeaders();
  return [
    { id: "date", header: h.date, cell: (p) => formatDate(locale.locale, p.at) },
    { id: "coupon", header: h.coupon, numeric: true, cell: (p) => locale.decimal(p.coupon, 2) },
    { id: "principal", header: h.principal, numeric: true, cell: (p) => (p.principal > 0 ? locale.decimal(p.principal, 2) : "") },
    { id: "event", header: h.event, cell: (p) => words[p.event] },
  ];
}

function Payments(props: Partial<Parameters<typeof Table<Payment>>[0]>) {
  const columns = usePaymentColumns();
  return (
    <Table
      columns={columns}
      rows={payments(6)}
      rowKey={(p) => p.id}
      caption="Payments to maturity"
      emptyText="No payments left."
      {...props}
    />
  );
}

/** A caption above the table, and number columns aligned to the end with
 * tabular figures. */
export const Basic: StoryObj = { render: () => <Payments /> };

/** Inside a panel the panel's heading is the visible title, so the caption
 * is read only by assistive technology. */
export const HiddenCaption: StoryObj = {
  render: () => (
    <Panel title="Payments">
      <Payments hideCaption />
    </Panel>
  ),
};

/** The date names each row: its cells are row headers. */
export const RowHeaders: StoryObj = { render: () => <Payments rowHeader="date" /> };

/** No rows: one muted row across every column says so. */
export const Empty: StoryObj = { render: () => <Payments rows={[]} /> };

/** Taller than its maximum height, given in tokens: the table scrolls
 * inside its own region, which is a tab stop named by the caption, and
 * the header row stays in view. */
export const StickyHeader: StoryObj = {
  render: () => (
    <Panel title="Schedule">
      <Payments rows={payments(16)} maxHeight="calc(var(--stoa-space-12) * 4)" stickyHeader rowHeader="date" />
    </Panel>
  ),
};

/** Wider than a phone: the table scrolls sideways inside its region, not
 * the page, and the first column stays in view. */
export const StickyFirstColumn: StoryObj = {
  render: () => {
    const base = usePaymentColumns();
    const locale = useStoaFormat();
    const h = useHeaders();
    const columns: TableColumn<Payment>[] = [
      ...base,
      { id: "outstanding", header: h.outstanding, numeric: true, cell: (p) => locale.decimal(1000 - p.principal, 2) },
      { id: "rate", header: h.rate, numeric: true, cell: () => `${locale.decimal(16.5, 1)}%` },
      { id: "days", header: h.days, numeric: true, cell: () => locale.integer(91) },
    ];
    return (
      <div style={{ maxInlineSize: 480 }}>
        <Panel title="Schedule">
          <Payments columns={columns} rows={payments(16)} maxHeight={220} stickyHeader stickyFirstColumn rowHeader="date" hideCaption />
        </Panel>
      </div>
    );
  },
};

const FEES = {
  en: {
    caption: "What a purchase costs",
    item: "Item",
    amount: "Amount, RUB",
    rows: ["Price of 10 bonds at 98.40% of face value", "Accrued interest paid to the seller", "Broker's commission, 0.05% of each trade"],
  },
  ar: {
    caption: "تكلفة الشراء",
    item: "البند",
    amount: "المبلغ، روبل",
    rows: ["سعر ١٠ سندات بنسبة ٩٨٫٤٠٪ من القيمة الاسمية", "الفائدة المتراكمة المدفوعة للبائع", "عمولة الوسيط، ٠٫٠٥٪ من قيمة كل صفقة شراء أو بيع"],
  },
};

/** Row headers that are phrases, in a box as narrow as a phone's: with
 * `wrapHeaders` they wrap onto more lines, the amounts stay on one, and
 * the table fits without scrolling sideways. Without it, headers stay on
 * one line and the table scrolls inside its region. */
export const WrapHeaders: StoryObj = {
  render: () => {
    const locale = useStoaFormat();
    const w = FEES[locale.locale.startsWith("ar") ? "ar" : "en"];
    const amounts = [9840, 120.5, 4.98];
    return (
      <div style={{ maxInlineSize: 280 }}>
        <Table<number>
          caption={w.caption}
          rowKey={(i) => i}
          emptyText=""
          rowHeader="item"
          wrapHeaders
          rows={[0, 1, 2]}
          columns={[
            { id: "item", header: w.item, cell: (i) => w.rows[i] },
            { id: "amount", header: w.amount, numeric: true, cell: (i) => locale.decimal(amounts[i]!, 2) },
          ]}
        />
      </div>
    );
  },
};

/** Compact density for this table alone, whatever the page's. */
export const Compact: StoryObj = { render: () => <Payments rows={payments(16)} density="compact" rowHeader="date" /> };

/** TradeTable is a Table: the numeric face, a hidden caption, the locale's
 * headers and side words. */
export const Trades: StoryObj = {
  render: () => (
    <Panel title="Trades">
      <TradeTable
        caption="Recent trades"
        trades={[
          { id: "1", time: "10:03:08.082", side: "sell", price: 222.66, size: 22 },
          { id: "2", time: "10:03:06.582", side: "sell", price: 222.66, size: 100 },
          { id: "3", time: "10:03:04.275", side: "buy", price: 222.64, size: 1200 },
        ]}
      />
    </Panel>
  ),
};

type Move = { id: string; name: string; change: number; latency: number };

const MOVES: Move[] = [
  { id: "1", name: "OFZ 26238", change: 1.25, latency: 4.2 },
  { id: "2", name: "OFZ 26240", change: -0.42, latency: 16.9 },
  { id: "3", name: "OFZ 26243", change: 0, latency: 0.5 },
];

const MOVE_HEADERS = {
  en: { name: "Issue", change: "Change", latency: "Quote latency" },
  ar: { name: "الإصدار", change: "التغير", latency: "زمن التسعير" },
};

/** Values with a sign or a unit in number columns: each value is isolated
 * in the direction of its own first letter, so "-0.42%" keeps its sign
 * before the number and "16.9 ms" its unit after it in a right-to-left
 * page, while the column stays aligned to the end. */
export const SignedValues: StoryObj = {
  render: () => {
    const locale = useStoaFormat();
    const h = MOVE_HEADERS[locale.locale.startsWith("ar") ? "ar" : "en"];
    return (
      <Table<Move>
        caption="Moves since the open"
        rowKey={(m) => m.id}
        emptyText="No moves."
        rowHeader="name"
        rows={MOVES}
        columns={[
          { id: "name", header: h.name },
          { id: "change", header: h.change, numeric: true, cell: (m) => `${locale.decimal(m.change, 2)}%` },
          { id: "latency", header: h.latency, numeric: true, cell: (m) => `${locale.decimal(m.latency, 1)} ms` },
        ]}
      />
    );
  },
};
