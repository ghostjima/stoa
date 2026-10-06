import type { Meta, StoryObj } from "@storybook/react-vite";
import { FindingsList, type FindingItem } from "./FindingsList";
import { Panel } from "./Panel";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Case/FindingsList" };
export default meta;

const FINDINGS: Record<"en" | "ar", { title: string; findings: FindingItem[] }> = {
  en: {
    title: "Rubric findings",
    findings: [
      { id: "sentence_too_long", severity: "info", text: "A sentence of 41 words.", source: "Plain language guide, section 2" },
      { id: "ground_missing", code: "R-01", severity: "error", text: "No legal ground is named.", source: "Rubric, item 1" },
      { id: "deadline_missing", code: "R-07", text: "A running deadline is not stated: the last day to confirm the order.", source: "161-FZ, art. 8, part 3.4" },
      { id: "client_option_missing", code: "R-06", text: "An option the law gives the client is not offered: repeating the operation.", source: "161-FZ, art. 8, part 3.10" },
    ],
  },
  ar: {
    title: "ملاحظات المعايير",
    findings: [
      { id: "sentence_too_long", severity: "info", text: "جملة من 41 كلمة.", source: "دليل اللغة الواضحة، القسم 2" },
      { id: "ground_missing", code: "R-01", severity: "error", text: "لم يُذكر أساس قانوني.", source: "المعايير، البند 1" },
      { id: "deadline_missing", code: "R-07", text: "لم يُذكر موعد جارٍ: آخر يوم لتأكيد الأمر.", source: "161-FZ, art. 8, part 3.4" },
      { id: "client_option_missing", code: "R-06", text: "لم يُعرض خيار يمنحه القانون للعميل: تكرار العملية.", source: "161-FZ, art. 8, part 3.10" },
    ],
  },
};

/** A reply's rubric findings, given in the rubric's order and shown by
 * severity: the error first, then the warnings (two findings with no
 * severity, so warnings by default), then the note; each group with its
 * count, each finding with its symbol, word, code and source. */
export const BySeverity: StoryObj = {
  render: () => {
    const d = FINDINGS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
    return (
      <Panel title={d.title}>
        <FindingsList findings={d.findings} />
      </Panel>
    );
  },
};

/** Nothing found: a positive callout says so, in the locale's words. */
export const Empty: StoryObj = {
  render: () => {
    const d = FINDINGS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
    return (
      <Panel title={d.title}>
        <FindingsList findings={[]} />
      </Panel>
    );
  },
};
