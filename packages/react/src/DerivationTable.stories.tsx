import type { Meta, StoryObj } from "@storybook/react-vite";
import { DerivationTable, type DerivationStep } from "./DerivationTable";
import { Panel } from "./Panel";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Data/DerivationTable" };
export default meta;

const STEPS: Record<"en" | "ar", { caption: string; title: string; steps: DerivationStep[] }> = {
  en: {
    caption: "Coupon income after tax, one bond",
    title: "Show the working",
    steps: [
      { id: "coupon", label: "Coupon for the period", formula: "1000 × 7.5% × 182 / 365", value: "37.40 RUB", source: { name: "Offering terms, clause 9.3", revision: "2025-03-14" } },
      { id: "accrued", label: "Accrued interest paid at purchase", formula: "1000 × 7.5% × 61 / 365", value: "12.53 RUB", source: { name: "Offering terms, clause 9.5", revision: "2025-03-14" } },
      { id: "base", label: "Taxable income", formula: "37.40 − 12.53", value: "24.87 RUB", source: { name: "Tax Code, art. 214.1", revision: "2025-12-01" } },
      { id: "tax", label: "Tax at 13%", formula: "24.87 × 13%", value: "3.23 RUB", source: { name: "Tax Code, art. 224", revision: "2025-12-01" } },
      { id: "net", label: "Coupon after tax", formula: "37.40 − 3.23", value: "34.17 RUB" },
    ],
  },
  ar: {
    caption: "دخل القسيمة بعد الضريبة، سند واحد",
    title: "طريقة الحساب",
    steps: [
      { id: "coupon", label: "قسيمة الفترة", formula: "1000 × 7.5% × 182 / 365", value: "37.40 روبل", source: { name: "شروط الإصدار، البند 9.3", revision: "2025-03-14" } },
      { id: "accrued", label: "الفائدة المتراكمة المدفوعة عند الشراء", formula: "1000 × 7.5% × 61 / 365", value: "12.53 روبل", source: { name: "شروط الإصدار، البند 9.5", revision: "2025-03-14" } },
      { id: "base", label: "الدخل الخاضع للضريبة", formula: "37.40 − 12.53", value: "24.87 روبل", source: { name: "قانون الضرائب، المادة 214.1", revision: "2025-12-01" } },
      { id: "tax", label: "الضريبة بنسبة 13%", formula: "24.87 × 13%", value: "3.23 روبل", source: { name: "قانون الضرائب، المادة 224", revision: "2025-12-01" } },
      { id: "net", label: "القسيمة بعد الضريبة", formula: "37.40 − 3.23", value: "34.17 روبل" },
    ],
  },
};

/** How a coupon after tax was worked out: each step's formula with the
 * numbers put in, its value, and the source of the rule with its
 * revision; Copy puts it all on the clipboard as plain text. Right to
 * left, each formula stays one left-to-right run. */
export const CouponAfterTax: StoryObj = {
  render: () => {
    const d = STEPS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
    return (
      <Panel title={d.title}>
        <DerivationTable caption={d.caption} hideCaption steps={d.steps} />
      </Panel>
    );
  },
};

/** Steps without a formula or a source, and no Copy button. */
export const Plain: StoryObj = {
  render: () => {
    const d = STEPS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
    return <DerivationTable caption={d.caption} steps={d.steps.map(({ formula: _formula, source: _source, ...rest }) => rest)} copyable={false} />;
  },
};
