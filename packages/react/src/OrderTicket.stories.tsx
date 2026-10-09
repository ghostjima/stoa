import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Panel } from "./Panel";
import { PriceYieldField, type PriceYieldResult, type PriceYieldStatus, type PriceYieldValue } from "./PriceYieldField";
import { QuantityStepper } from "./QuantityStepper";
import { Button } from "./Controls";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Controls/Order ticket" };
export default meta;

const column = { display: "grid", gap: "var(--stoa-space-4)", maxInlineSize: 520 } as const;

// A stand-in for a product's bond engine: a bond with three annual
// coupons of 12% of face and the face paid back with the last. Yield is
// worked out by bisection, as a real engine might do in a worker.
const COUPON = 12;
const YEARS = 3;
function priceAt(yieldPercent: number): number {
  const y = yieldPercent / 100;
  let price = 0;
  for (let t = 1; t <= YEARS; t++) price += COUPON / (1 + y) ** t;
  return price + 100 / (1 + y) ** YEARS;
}

const WORDS = {
  en: {
    ticket: "Buy order",
    label: "Limit price",
    description: "Accrued interest is added to the price when the order is filled.",
    priceZero: "A price is more than zero.",
    noYield: "No yield at this price: the bond pays back 136% of face in all, less than it would cost.",
    noPrice: "No price at this yield: yields from 0% to 500% are quoted.",
    quantity: "Quantity, lots",
    quantityTooMany: "The book holds 120 lots at this price or better.",
    submit: "Review the order",
    status: { ready: "Ready", pending: "Waiting for the yield", error: "Fix the price or the yield" } as Record<PriceYieldStatus, string>,
    offer: "Yield to offer, %",
    step: "The issue's price step is 0.05%. A price typed off it is kept as typed, for the exchange to judge; the arrow keys move by the step.",
  },
  ar: {
    ticket: "أمر شراء",
    label: "السعر المحدد",
    description: "تُضاف الفائدة المتراكمة إلى السعر عند تنفيذ الأمر.",
    priceZero: "يجب أن يكون السعر أكبر من الصفر.",
    noYield: "لا عائد عند هذا السعر: يسدد السند 136٪ من القيمة الاسمية إجمالًا، وهو أقل من تكلفته.",
    noPrice: "لا سعر عند هذا العائد: تُسعَّر العوائد من 0٪ إلى 500٪.",
    quantity: "الكمية، لوت",
    quantityTooMany: "يحتوي دفتر الأوامر على 120 لوت بهذا السعر أو أفضل.",
    submit: "مراجعة الأمر",
    status: { ready: "جاهز", pending: "بانتظار العائد", error: "صحّح السعر أو العائد" } as Record<PriceYieldStatus, string>,
    offer: "العائد حتى عرض إعادة الشراء، ٪",
    step: "خطوة سعر هذا الإصدار 0.05٪. يُحفظ السعر المكتوب خارج الخطوة كما كُتب لتحكم عليه البورصة، وتتحرك مفاتيح الأسهم بمقدار الخطوة.",
  },
};

function useWords() {
  return WORDS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
}

/** The engine, answering at once; its reasons in the story's words. */
function useEngine(delay = 0) {
  const w = useWords();
  const answer = (result: PriceYieldResult): PriceYieldResult | Promise<PriceYieldResult> =>
    delay > 0 ? new Promise((resolve) => setTimeout(() => resolve(result), delay)) : result;
  return {
    yieldFromPrice: (price: number) => {
      if (price <= 0) return answer({ error: w.priceZero });
      let low = 0;
      let high = 500;
      if (price > priceAt(low) || price < priceAt(high)) return answer({ error: w.noYield });
      for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        if (priceAt(mid) > price) low = mid;
        else high = mid;
      }
      return answer((low + high) / 2);
    },
    priceFromYield: (yieldPercent: number) => (yieldPercent < 0 || yieldPercent > 500 ? answer({ error: w.noPrice }) : answer(priceAt(yieldPercent))),
  };
}

/** Price and yield linked: type a price (Enter, Tab or an arrow key
 * commits it) and the yield is worked out, or the other way round. The
 * field typed in says "Entered", the other what it was worked out from.
 * A price of 0, or one above 136% of face, has no yield: the engine's
 * reason is shown under the price. */
export const PriceAndYield: StoryObj = {
  render: () => {
    const w = useWords();
    const engine = useEngine();
    const [value, setValue] = useState<PriceYieldValue>({ price: 98.5, yield: priceYieldAt(98.5), source: "price" });
    return (
      <div style={column}>
        <PriceYieldField label={w.label} description={w.description} value={value} onChange={setValue} {...engine} />
      </div>
    );
  },
};

function priceYieldAt(price: number): number {
  let low = 0;
  let high = 500;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    if (priceAt(mid) > price) low = mid;
    else high = mid;
  }
  return Math.round(((low + high) / 2) * 100) / 100;
}

/** A price kept to the book's unit, 0.0001% of face, while the arrow
 * keys move by the issue's price step, 0.05%: a price typed off the step
 * (101.2345) is kept as typed, and ArrowUp takes it to the next step
 * (101.2500). */
export const PriceStep: StoryObj = {
  render: () => {
    const w = useWords();
    const engine = useEngine();
    const [value, setValue] = useState<PriceYieldValue>({ price: 101.25, yield: priceYieldAt(101.25), source: "price" });
    return (
      <div style={column}>
        <PriceYieldField
          label={w.label}
          description={w.step}
          value={value}
          onChange={setValue}
          priceDecimals={4}
          priceStep={0.05}
          keepTypedValue
          {...engine}
        />
      </div>
    );
  },
};

/** An engine that answers after a second and a half, as one in a worker
 * might: the other field says it is being worked out, and the caller,
 * told the status, holds its button meanwhile. A newer edit drops an
 * older answer. The yield is named as the engine works it out, to the
 * offer. */
export const SlowEngine: StoryObj = {
  render: () => {
    const w = useWords();
    const engine = useEngine(1500);
    const [value, setValue] = useState<PriceYieldValue>({ price: 101.2, yield: priceYieldAt(101.2), source: "price" });
    const [status, setStatus] = useState<PriceYieldStatus>("ready");
    return (
      <div style={column}>
        <PriceYieldField label={w.label} yieldLabel={w.offer} value={value} onChange={setValue} onStatusChange={setStatus} {...engine} />
        <Button variant="primary" isDisabled={status !== "ready" || value.price === null || value.yield === null} style={{ justifySelf: "start" }}>
          {w.submit}
        </Button>
        <p style={{ margin: 0 }}>{w.status[status]}</p>
      </div>
    );
  },
};

/** The quantity in lots of 1 bond, from 1 to 200: − and + beside the
 * number, the arrow keys, Page Up and Page Down, Home and End; the lot's
 * size and the order's size in bonds in words under it. */
export const Quantity: StoryObj = {
  render: () => {
    const w = useWords();
    const [lots, setLots] = useState(5);
    return (
      <div style={column}>
        <QuantityStepper label={w.quantity} value={lots} onChange={setLots} lotSize={1} max={200} />
      </div>
    );
  },
};

/** Lots of 10 bonds, and a quantity the caller finds too large: the
 * input is marked invalid and the message under it says why. At the
 * lower limit the − button is disabled. */
export const QuantityLimits: StoryObj = {
  render: () => {
    const w = useWords();
    const [lots, setLots] = useState(150);
    const [few, setFew] = useState(1);
    return (
      <div style={column}>
        <QuantityStepper
          label={w.quantity}
          value={lots}
          onChange={setLots}
          lotSize={10}
          max={1000}
          isInvalid={lots > 120}
          errorMessage={w.quantityTooMany}
        />
        <QuantityStepper label={w.quantity} value={few} onChange={setFew} lotSize={10} />
      </div>
    );
  },
};

/** The two together, as an order ticket would set them. */
export const Ticket: StoryObj = {
  render: () => {
    const w = useWords();
    const engine = useEngine();
    const [value, setValue] = useState<PriceYieldValue>({ price: Math.round(priceAt(14.5) * 100) / 100, yield: 14.5, source: "yield" });
    const [lots, setLots] = useState(10);
    return (
      <Panel title={w.ticket}>
        <div style={column}>
          <PriceYieldField label={w.label} value={value} onChange={setValue} {...engine} />
          <QuantityStepper label={w.quantity} value={lots} onChange={setLots} lotSize={1} max={200} />
        </div>
      </Panel>
    );
  },
};
