import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Panel } from "./Panel";
import { TextArea } from "./TextArea";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Controls/TextArea" };
export default meta;

const column = { display: "grid", gap: "var(--stoa-space-3)", maxInlineSize: 420 } as const;

const WORDS = {
  en: {
    panel: "Review",
    label: "Concerns",
    description: "What would make this reply wrong; shown to the signatory.",
    text: "The reply names 161-FZ, art. 8, but the block was made under 115-FZ.",
    long: [
      "The reply names 161-FZ, art. 8, but the block was made under 115-FZ.",
      "The client asked for the documents the bank relied on; the draft does not list them.",
      "The deadline to confirm the operation has passed; the draft still offers it.",
      "Two of the client's operations are named by date only.",
      "The plain-language check flags one sentence of 41 words.",
      "The draft should say which unit to write to with new documents.",
      "The reply goes out today, as the complaint came through the regulator.",
      "One figure has no derivation attached.",
    ].join("\n"),
    note: "Note to the client",
    noteDescription: "Up to 120 characters, sent as a text message.",
    noteText: "Your complaint Z-000107 is registered. The reply is due by 21 October; we will write to you by email.",
    reason: "Reason for the extension",
    reasonError: "Say which documents are awaited and from whom.",
    readOnly: "Signed reply",
  },
  ar: {
    panel: "المراجعة",
    label: "المخاوف",
    description: "ما الذي يجعل هذا الرد خاطئًا؛ يظهر للموقِّع.",
    text: "يستند الرد إلى المادة 8 من القانون 161-FZ، لكن الحظر تم بموجب القانون 115-FZ.",
    long: [
      "يستند الرد إلى المادة 8 من القانون 161-FZ، لكن الحظر تم بموجب القانون 115-FZ.",
      "طلب العميل المستندات التي اعتمد عليها البنك؛ ولا تذكرها المسودة.",
      "انقضى موعد تأكيد العملية؛ ولا تزال المسودة تعرضه.",
      "ذُكرت عمليتان للعميل بالتاريخ فقط.",
      "يشير فحص اللغة الواضحة إلى جملة من 41 كلمة.",
      "ينبغي أن تذكر المسودة الجهة التي تُرسل إليها المستندات الجديدة.",
      "يُرسل الرد اليوم، لأن الشكوى وردت عبر الجهة الرقابية.",
      "رقم واحد بلا اشتقاق مرفق.",
    ].join("\n"),
    note: "ملاحظة للعميل",
    noteDescription: "حتى 120 حرفًا، تُرسل في رسالة نصية.",
    noteText: "سُجلت شكواك Z-000107. موعد الرد 21 أكتوبر؛ وسنكتب إليك بالبريد الإلكتروني.",
    reason: "سبب التمديد",
    reasonError: "اذكر المستندات المنتظرة والجهة التي ستقدمها.",
    readOnly: "الرد الموقَّع",
  },
};

function useWords() {
  return WORDS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
}

/** A reviewer's concerns: a label, a description, and a field of three
 * lines that grows with its text up to six, then scrolls. */
export const Default: StoryObj = {
  render: () => {
    const w = useWords();
    const [text, setText] = useState(w.text);
    return (
      <Panel title={w.panel}>
        <div style={column}>
          <TextArea label={w.label} description={w.description} value={text} onChange={setText} maxRows={6} dir="auto" />
        </div>
      </Panel>
    );
  },
};

/** Text longer than its most rows: the field stops at six lines and
 * scrolls. */
export const LongText: StoryObj = {
  render: () => {
    const w = useWords();
    const [text, setText] = useState(w.long);
    return (
      <div style={column}>
        <TextArea label={w.label} description={w.description} value={text} onChange={setText} maxRows={6} dir="auto" />
      </div>
    );
  },
};

/** A limit of 120 characters: the count at the end of the line under the
 * field, in the text colour once the field is full, read with the field
 * as "Characters: 101 of 120". From 12 characters left, what is left is
 * announced politely. */
export const CharacterCount: StoryObj = {
  render: () => {
    const w = useWords();
    const [text, setText] = useState(w.noteText);
    return (
      <div style={column}>
        <TextArea label={w.note} description={w.noteDescription} value={text} onChange={setText} maxLength={120} rows={2} maxRows={4} dir="auto" />
      </div>
    );
  },
};

/** An empty field the caller needs filled: marked invalid, the message
 * under it read after the description. */
export const Invalid: StoryObj = {
  render: () => {
    const w = useWords();
    const [text, setText] = useState("");
    return (
      <div style={column}>
        <TextArea label={w.reason} value={text} onChange={setText} isInvalid={text.trim() === ""} errorMessage={w.reasonError} dir="auto" />
      </div>
    );
  },
};

/** Disabled and read-only: a disabled field is drawn on the sunken
 * surface and skipped by Tab; a read-only one keeps its text, can be
 * selected and copied, and takes the focus. */
export const DisabledAndReadOnly: StoryObj = {
  render: () => {
    const w = useWords();
    return (
      <div style={column}>
        <TextArea label={w.label} value={w.text} onChange={() => {}} isDisabled dir="auto" />
        <TextArea label={w.readOnly} value={w.text} onChange={() => {}} isReadOnly dir="auto" />
      </div>
    );
  },
};
