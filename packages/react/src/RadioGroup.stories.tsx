import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Panel } from "./Panel";
import { RadioGroup, type RadioOption } from "./RadioGroup";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Controls/RadioGroup" };
export default meta;

const column = { display: "grid", gap: "var(--stoa-space-4)", maxInlineSize: 480 } as const;

type Decision = "approve" | "modify" | "override" | "defer";
type YieldTo = "maturity" | "offer";

const WORDS = {
  en: {
    panel: "Review",
    decision: "Decision on the draft",
    decisionDescription: "The reply is sent only after a person signs it.",
    decisions: [
      { value: "approve", label: "Approve", description: "The reply goes to the signatory as drafted." },
      { value: "modify", label: "Modify", description: "Edit the draft; the changes are kept beside it." },
      { value: "override", label: "Override", description: "Write the reply yourself; the draft is kept in the journal." },
      { value: "defer", label: "Defer", description: "Wait for facts; the case keeps its deadline." },
    ] as RadioOption<Decision>[],
    yieldTo: "Yield to",
    yields: [
      { value: "maturity", label: "Maturity" },
      { value: "offer", label: "Offer" },
    ] as RadioOption<YieldTo>[],
    stream: "Stream",
    streamError: "Choose a stream: it sets the rules for the reply.",
    streams: [
      { value: "general", label: "General complaint", description: "An extension is possible to obtain documents" },
      { value: "money", label: "Money claim up to 500,000 RUB", description: "Ombudsman route; no extension" },
      { value: "block", label: "Operation blocked", description: "Handled by the antifraud unit", isDisabled: true },
    ] as RadioOption<string>[],
  },
  ar: {
    panel: "المراجعة",
    decision: "القرار بشأن المسودة",
    decisionDescription: "لا يُرسل الرد إلا بعد توقيع شخص عليه.",
    decisions: [
      { value: "approve", label: "موافقة", description: "يذهب الرد إلى الموقِّع كما صيغ." },
      { value: "modify", label: "تعديل", description: "عدّل المسودة؛ تُحفظ التغييرات بجانبها." },
      { value: "override", label: "استبدال", description: "اكتب الرد بنفسك؛ تُحفظ المسودة في السجل." },
      { value: "defer", label: "تأجيل", description: "انتظر الوقائع؛ يحتفظ الملف بموعده." },
    ] as RadioOption<Decision>[],
    yieldTo: "العائد حتى",
    yields: [
      { value: "maturity", label: "الاستحقاق" },
      { value: "offer", label: "عرض إعادة الشراء" },
    ] as RadioOption<YieldTo>[],
    stream: "المسار",
    streamError: "اختر مسارًا: فهو يحدد قواعد الرد.",
    streams: [
      { value: "general", label: "شكوى عامة", description: "يمكن التمديد للحصول على المستندات" },
      { value: "money", label: "مطالبة مالية حتى 500000 روبل", description: "مسار أمين المظالم؛ دون تمديد" },
      { value: "block", label: "حظر عملية", description: "تتولاها وحدة مكافحة الاحتيال", isDisabled: true },
    ] as RadioOption<string>[],
  },
};

function useWords() {
  return WORDS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
}

/** A reviewer's decision: four options stacked, each with a line on what
 * it means, read as the option's description. Arrow keys move and
 * choose; Tab leaves the group. */
export const WithDescriptions: StoryObj = {
  render: () => {
    const w = useWords();
    const [decision, setDecision] = useState<Decision | null>("approve");
    return (
      <Panel title={w.panel}>
        <RadioGroup label={w.decision} description={w.decisionDescription} options={w.decisions} value={decision} onChange={setDecision} />
      </Panel>
    );
  },
};

/** A few short options in a row, which wraps when it runs out of room;
 * the arrow keys follow the reading direction. */
export const Horizontal: StoryObj = {
  render: () => {
    const w = useWords();
    const [to, setTo] = useState<YieldTo | null>("offer");
    return (
      <div style={column}>
        <RadioGroup label={w.yieldTo} orientation="horizontal" options={w.yields} value={to} onChange={setTo} />
      </div>
    );
  },
};

/** Nothing chosen where an answer is needed: the group is marked invalid
 * and the message under it says why; it goes once a stream is chosen. A
 * disabled option says in its description why it cannot be chosen. */
export const InvalidAndDisabledOption: StoryObj = {
  render: () => {
    const w = useWords();
    const [stream, setStream] = useState<string | null>(null);
    return (
      <div style={column}>
        <RadioGroup
          label={w.stream}
          options={w.streams}
          value={stream}
          onChange={setStream}
          isRequired
          isInvalid={stream === null}
          errorMessage={w.streamError}
        />
      </div>
    );
  },
};

/** The whole group disabled, its choice still shown. */
export const Disabled: StoryObj = {
  render: () => {
    const w = useWords();
    return (
      <div style={column}>
        <RadioGroup label={w.decision} options={w.decisions} value="modify" onChange={() => {}} isDisabled />
      </div>
    );
  },
};
