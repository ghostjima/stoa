import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { CodeView, LogView } from "./Code";
import { Tag, type TagTone } from "./Chips";
import { Button } from "./Controls";
import { AlertDialog, Dialog, Sheet } from "./Dialog";
import { DescriptionList, type DescriptionItem } from "./DescriptionList";
import { Ltr } from "./Ltr";
import { Metric } from "./Metric";
import { Panel, StatBar } from "./Panel";
import { ReorderableList, type ReorderableItem } from "./ReorderableList";
import { ShortcutList, ShortcutsDialog, type ShortcutGroup } from "./Shortcuts";
import { RecordList, type RecordListHandle, type RecordListItem } from "./RecordList";
import { StepList, type Step } from "./StepList";
import { Switch } from "./Toggles";
import { Tooltip } from "./Tooltip";
import { useFormatters } from "./format";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Overlays, lists and content" };
export default meta;

function RenameDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Dialog
      title="Rename run"
      defaultOpen={defaultOpen}
      trigger={<Button>Rename run</Button>}
      actions={(close) => (
        <>
          <Button onPress={close}>Keep name</Button>
          <Button variant="primary" onPress={close}>
            Save
          </Button>
        </>
      )}
    >
      <p>The run keeps its history and its settings; only the name changes.</p>
    </Dialog>
  );
}

/** Closed: the trigger. Escape closes the dialog, Tab stays inside it,
 * and focus returns to the trigger. */
export const DialogClosed: StoryObj = { render: () => <RenameDialog /> };

/** Open: title, body, actions and the close button. */
export const DialogOpen: StoryObj = { render: () => <RenameDialog defaultOpen /> };

function FilterSheet({ placement }: { placement: "end" | "bottom" | "auto" }) {
  return (
    <Sheet
      title="Filters"
      placement={placement}
      defaultOpen
      trigger={<Button>Filters</Button>}
      actions={(close) => (
        <Button variant="primary" onPress={close}>
          Apply
        </Button>
      )}
    >
      <p>Venues, sides and sizes to show in the trades table.</p>
    </Sheet>
  );
}

/** A side panel from the inline end: the right in left-to-right text, the
 * left in right-to-left. */
export const SheetEnd: StoryObj = { render: () => <FilterSheet placement="end" /> };

/** A bottom sheet. */
export const SheetBottom: StoryObj = { render: () => <FilterSheet placement="bottom" /> };

/** "auto": the side panel on a wide screen, the bottom sheet on a narrow
 * one. */
export const SheetAuto: StoryObj = { render: () => <FilterSheet placement="auto" /> };

/** A destructive confirmation: focus starts on the safe action. */
export const AlertDestructive: StoryObj = {
  render: () => (
    <AlertDialog
      title="Delete this run?"
      confirmLabel="Delete run"
      tone="destructive"
      defaultOpen
      trigger={<Button>Delete run</Button>}
      onConfirm={() => {}}
    >
      <p>Its history and settings cannot be restored.</p>
    </AlertDialog>
  ),
};

/** A neutral confirmation. */
export const AlertNeutral: StoryObj = {
  render: () => (
    <AlertDialog
      title="Restart the replay?"
      confirmLabel="Restart"
      defaultOpen
      trigger={<Button>Restart</Button>}
      onConfirm={() => {}}
    >
      <p>Playback goes back to the open; your marks stay.</p>
    </AlertDialog>
  ),
};

/** The answer told apart without a flag: onConfirm for the primary
 * action, onCancel for the safe action or Escape. */
export const AlertAnswer: StoryObj = {
  render: () => {
    const [answer, setAnswer] = useState("No answer yet.");
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-3)", justifyItems: "start" }}>
        <AlertDialog
          title="Allow the agent to write files?"
          confirmLabel="Allow writing"
          trigger={<Button>Ask for permission</Button>}
          onConfirm={() => setAnswer("Allowed.")}
          onCancel={() => setAnswer("Denied.")}
        >
          <p>The agent asks to write to three files in the workspace.</p>
        </AlertDialog>
        <p>{answer}</p>
      </div>
    );
  },
};

/** A confirmation an application opens from its own state, with no
 * trigger: the control that started it is gone when it closes, so focus
 * goes to the tab stop that took its place ("Start over") rather than to
 * the page's body. */
export const AlertWithoutTrigger: StoryObj = {
  render: () => {
    const [state, setState] = useState<"idle" | "asking" | "answered">("idle");
    const [answer, setAnswer] = useState("");
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-3)", justifyItems: "start" }}>
        {state === "idle" ? (
          <Button onPress={() => setState("asking")}>Run step 3</Button>
        ) : (
          <p>{state === "asking" ? "Step 3 waits for an answer." : `Step 3: ${answer}`}</p>
        )}
        {state === "answered" && (
          <Button
            onPress={() => {
              setAnswer("");
              setState("idle");
            }}
          >
            Start over
          </Button>
        )}
        <AlertDialog
          title="Send the reply?"
          confirmLabel="Send"
          isOpen={state === "asking"}
          onOpenChange={(open) => {
            if (!open) setState("answered");
          }}
          onConfirm={() => setAnswer("sent.")}
          onCancel={() => setAnswer("skipped.")}
        >
          <p>The agent drafted a reply to the supplier and asks before sending it.</p>
        </AlertDialog>
      </div>
    );
  },
};

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Playback",
    shortcuts: [
      { keys: ["Space"], description: "Play or pause" },
      { keys: ["Shift", "→"], description: "Step forward one trade" },
      { keys: ["Shift", "←"], description: "Step back one trade" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Find a symbol" },
      { keys: ["?"], description: "Show these shortcuts" },
    ],
  },
];

/** The shortcuts help dialog. */
export const ShortcutsOpen: StoryObj = {
  render: () => <ShortcutsDialog title="Keyboard shortcuts" groups={SHORTCUTS} defaultOpen trigger={<Button>Shortcuts</Button>} />,
};

/** A shortcut whose control is disabled stays listed, muted. */
export const ShortcutsWithDisabled: StoryObj = {
  render: () => (
    <ShortcutsDialog
      title="Keyboard shortcuts"
      groups={[
        {
          title: "Export",
          shortcuts: [
            { keys: ["E"], description: "Export the view as CSV", isDisabled: true },
            { keys: ["?"], description: "Show these shortcuts" },
          ],
        },
      ]}
      defaultOpen
      trigger={<Button>Shortcuts</Button>}
    />
  ),
};

/** The dialog with a disabled line over a page longer than the window,
 * scrolled: the muted description is measured on the dialog's surface,
 * not on whatever is behind the overlay. */
export const ShortcutsOverLongPage: StoryObj = {
  render: () => (
    <div>
      {Array.from({ length: 40 }, (_, i) => (
        <p key={i}>Row {i + 1} of the blotter: an order, its venue and its state.</p>
      ))}
      <ShortcutsDialog
        title="Keyboard shortcuts"
        groups={[
          {
            title: "Orders",
            shortcuts: [
              { keys: ["E"], description: "Export the view as CSV", isDisabled: true },
              { keys: ["N"], description: "New order" },
              { keys: ["?"], description: "Show these shortcuts" },
            ],
          },
        ]}
        defaultOpen
        trigger={<Button>Shortcuts</Button>}
      />
    </div>
  ),
};

/** The same list outside a dialog, for example on a help page. */
export const ShortcutsInline: StoryObj = {
  render: () => (
    <Panel title="Keyboard shortcuts">
      <ShortcutList groups={SHORTCUTS} />
    </Panel>
  ),
};

const PIPELINE: ReorderableItem[] = [
  { id: "fetch", textValue: "Fetch prices" },
  { id: "parse", textValue: "Parse the book" },
  { id: "check", textValue: "Check limits" },
  { id: "send", textValue: "Send the order" },
];

function Pipeline({ initial = PIPELINE, removable = false, allowsDragging = true }: { initial?: ReorderableItem[]; removable?: boolean; allowsDragging?: boolean }) {
  const [items, setItems] = useState(initial);
  return (
    <ReorderableList
      label="Pipeline"
      items={items}
      onReorder={setItems}
      allowsDragging={allowsDragging}
      onRemove={removable ? (item) => setItems((all) => all.filter((other) => other.id !== item.id)) : undefined}
      renderItem={(item) => item.textValue}
    />
  );
}

/** Move buttons named after each item, drag and drop, and a Remove button;
 * every move is announced. */
export const Reorderable: StoryObj = { render: () => <Pipeline removable /> };

/** Move buttons only. */
export const ReorderableButtonsOnly: StoryObj = { render: () => <Pipeline allowsDragging={false} /> };

/** Nothing to order yet. */
export const ReorderableEmpty: StoryObj = { render: () => <Pipeline initial={[]} /> };

const STEPS: Step[] = [
  { id: "1", title: "Fetch prices", status: "done" },
  { id: "2", title: "Parse the book", status: "running", progress: 0.6, explanation: "Level 3 of 5" },
  {
    id: "3",
    title: "Choose a venue",
    status: "awaiting",
    explanation: "Two venues quote the same price.",
    actions: (
      <>
        <Button>Venue A</Button>
        <Button>Venue B</Button>
      </>
    ),
  },
  { id: "4", title: "Send the order", status: "waiting" },
  { id: "5", title: "Hedge", status: "skipped", explanation: "No position to hedge." },
  { id: "6", title: "Rebalance", status: "undone" },
  { id: "7", title: "Report", status: "error", explanation: "The report service did not answer.", actions: <Button>Retry</Button> },
  { id: "8", title: "Archive the run", status: "notRun", explanation: "The run stopped before this step." },
];

/** Every status, each a symbol and a word; the running step pulses unless
 * motion is reduced, and shows its progress. A skipped step was passed
 * over while the run went on; a step not run was never reached, because
 * the run stopped before it. */
export const StepsAllStatuses: StoryObj = {
  render: () => (
    <Panel title="Order">
      <StepList label="Order steps" steps={STEPS} />
    </Panel>
  ),
};

/** The same steps in a ReorderableList. */
export const StepsReorderable: StoryObj = {
  render: () => {
    const [steps, setSteps] = useState(STEPS.slice(0, 4));
    return (
      <Panel title="Order">
        <StepList
          label="Order steps"
          steps={steps}
          reorderable
          onReorder={setSteps}
          onRemove={(step) => setSteps((all) => all.filter((other) => other.id !== step.id))}
        />
      </Panel>
    );
  },
};

type Words = { en: string; ru: string; ar: string };

type LongStep = { id: string; title: Words; code?: string; kind: Words; risk: Words; tone: TagTone; confidence: number; reason?: Words };

const LONG_STEPS: LongStep[] = [
  {
    id: "classify",
    title: { en: "Classify the complaint", ru: "Классифицировать обращение", ar: "تصنيف الشكوى" },
    kind: { en: "Classification", ru: "Классификация", ar: "التصنيف" },
    risk: { en: "low risk", ru: "низкий риск", ar: "مخاطر منخفضة" },
    tone: "neutral",
    confidence: 0.92,
  },
  {
    id: "reuse",
    title: { en: "Use the facts of linked case", ru: "Взять факты из связанного дела", ar: "استخدام وقائع القضية المرتبطة" },
    code: "CMP-2026-000731",
    kind: { en: "Facts from a linked case", ru: "Факты из связанного дела", ar: "وقائع من قضية مرتبطة" },
    risk: { en: "medium risk", ru: "средний риск", ar: "مخاطر متوسطة" },
    tone: "warning",
    confidence: 0.81,
  },
  {
    id: "review",
    title: {
      en: "Hand the draft to legal review",
      ru: "Передать проект ответа на юридическую проверку",
      ar: "تسليم مسودة الرد إلى المراجعة القانونية",
    },
    kind: { en: "Handover", ru: "Передача на проверку", ar: "التسليم للمراجعة" },
    risk: { en: "high risk", ru: "высокий риск", ar: "مخاطر عالية" },
    tone: "negative",
    confidence: 0.67,
    reason: {
      en: "High-risk steps always ask",
      ru: "Шаги с высоким риском спрашивают всегда",
      ar: "الخطوات عالية المخاطر تسأل دائمًا",
    },
  },
];

/** A plan's steps with long titles, a line of facts under each and a
 * switch, in a reorderable list with Remove: each row wraps its words and
 * stays inside the panel on a phone, in Russian (the longer of the
 * products' languages) and in Arabic, right to left. */
export const StepsReorderableLongText: StoryObj = {
  render: () => {
    const { locale } = useStoaFormat();
    const { percent } = useFormatters();
    const lang = locale.startsWith("ar") ? "ar" : locale.startsWith("ru") ? "ru" : "en";
    const [ids, setIds] = useState(LONG_STEPS.map((s) => s.id));
    const [asks, setAsks] = useState<Record<string, boolean>>({ reuse: true });
    const steps: Step[] = ids.flatMap((id) => {
      const s = LONG_STEPS.find((other) => other.id === id);
      if (!s) return [];
      return [
        {
          id: s.id,
          title: s.code ? (
            <>
              {s.title[lang]} <Ltr>{s.code}</Ltr>
            </>
          ) : (
            s.title[lang]
          ),
          textValue: s.code ? `${s.title[lang]} ${s.code}` : s.title[lang],
          status: "waiting",
          explanation: (
            <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "var(--stoa-space-1) var(--stoa-space-3)" }}>
              <Tag size="small" tone={s.tone}>
                {s.risk[lang]}
              </Tag>
              <span>{s.kind[lang]}</span>
              <span>{percent(s.confidence, 0)}</span>
            </span>
          ),
          actions: (
            <Switch
              size="small"
              isSelected={s.reason ? true : (asks[s.id] ?? false)}
              onChange={(value) => setAsks((all) => ({ ...all, [s.id]: value }))}
              isDisabled={s.reason !== undefined}
              disabledReason={s.reason?.[lang]}
            >
              {{ en: "Ask first", ru: "Спросить заранее", ar: "اسأل أولًا" }[lang]}
            </Switch>
          ),
        },
      ];
    });
    const title = { en: "Plan", ru: "План", ar: "الخطة" }[lang];
    return (
      <Panel title={title}>
        <StepList
          label={title}
          steps={steps}
          reorderable
          onReorder={(next) => setIds(next.map((s) => s.id))}
          onRemove={(step) => setIds((all) => all.filter((id) => id !== step.id))}
        />
      </Panel>
    );
  },
};

const LOG = Array.from({ length: 30 }, (_, i) => {
  const s = String(i).padStart(2, "0");
  return `09:30:${s}.000 INFO  frame ${1000 + i} drawn in ${(12 + (i % 5)).toFixed(1)} ms`;
});

/** A log taller than its height: focus it and scroll with the arrow keys. */
export const Log: StoryObj = { render: () => <LogView label="Renderer log" lines={LOG} /> };

/** Lines that mix scripts: a line given as its parts has its message
 * isolated, so an Arabic message reads right to left with its punctuation
 * in place, while the time and the level stay at the left. */
export const LogMixed: StoryObj = {
  render: () => (
    <LogView
      label="Engine log"
      lines={[
        { time: "10:00:01", level: "INFO", text: "open ACME" },
        { time: "10:00:02", level: "INFO", text: "تم تحميل السجل: 1200 صفقة." },
        { time: "10:00:03", level: "WARN", text: "seek 10:30:00 (slow)" },
        { time: "10:00:04", level: "INFO", text: "الخطوة 3 من 5." },
      ]}
    />
  ),
};

/** A log in Arabic: the time in Arabic-Indic digits and the level in
 * Arabic are isolated too, so in a right-to-left page they stay in their
 * places at the left instead of joining the message's run. */
export const LogArabic: StoryObj = {
  render: () => (
    <LogView
      label="سجل الوكيل"
      lines={[
        { time: "١٠:٢٥:٠١", level: "النظام", text: "بدأ التشغيل." },
        { time: "١٠:٢٥:٠٢", level: "الوكيل", text: "قرأت ٣ ملفات." },
        { time: "١٠:٢٥:٠٣", level: "الأداة", text: "grep: 12 matches" },
      ]}
    />
  ),
};

/** A log that grows. It opens at its newest line and keeps the newest in
 * view while the reader is at its end; scrolled up, it stays where the
 * reader is and offers "Jump to latest", which goes back to the end and
 * gives focus to the log. */
export const LogFollow: StoryObj = {
  render: () => {
    const { locale, digits, integer } = useStoaFormat();
    const arabic = locale.startsWith("ar");
    const line = (i: number) => {
      const time = digits(`10:25:${String(i % 60).padStart(2, "0")}`);
      return arabic
        ? { time, level: "الوكيل", text: `اكتملت الخطوة ${integer(i + 1)}.` }
        : { time, level: "INFO", text: `Step ${integer(i + 1)} finished.` };
    };
    const [count, setCount] = useState(30);
    const lines = Array.from({ length: count }, (_, i) => line(i));
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-2)", maxInlineSize: 480 }}>
        <div>
          <Button onPress={() => setCount((n) => n + 1)}>{arabic ? "أضف سطرًا" : "Add a line"}</Button>
        </div>
        <LogView label={arabic ? "سجل الوكيل" : "Agent log"} lines={lines} />
      </div>
    );
  },
};

/** Long lines wrap inside the log instead of running off its side, so a
 * long Arabic message shows its first word. */
export const LogLongLines: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    return (
      <div style={{ maxInlineSize: 360 }}>
        <LogView
          label={arabic ? "سجل الوكيل" : "Agent log"}
          lines={[
            { time: "10:25:01", level: "INFO", text: "The plan was approved: fetch the inbox, draft three replies, ask before sending each one." },
            { time: "10:25:02", level: "INFO", text: "اعتُمدت الخطة: جلب البريد الوارد، ثم كتابة ثلاثة ردود، والسؤال قبل إرسال كل رد." },
            { time: "10:25:03", level: "WARN", text: "The second reply is longer than the limit the recipient set for their inbox." },
          ]}
        />
      </div>
    );
  },
};

const CODE = `import { tokens } from "@ghostjima/stoa-tokens";

export function rowHeight(density: "compact" | "regular") {
  // The density tokens set the height; nothing here is a literal.
  return tokens.density[density].rowHeight;
}`;

/** Code, always left to right. */
export const Code: StoryObj = { render: () => <CodeView label="rowHeight.ts" code={CODE} /> };

/** With line numbers, which a copy leaves out. */
export const CodeNumbered: StoryObj = { render: () => <CodeView label="rowHeight.ts" code={CODE} lineNumbers /> };

/** Runs inside a sentence. Ltr keeps a formula, a ticker or an
 * identifier left to right and in one piece in a right-to-left sentence;
 * `bdi` gives a value of unknown direction its own. The sentence follows
 * the language: Arabic in an Arabic frame, English otherwise. */
export const InlineIsolates: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    return arabic ? (
      <div style={{ display: "grid", gap: "var(--stoa-space-2)" }}>
        <p>
          الجواب هو <Ltr>2 + 2 = 4</Ltr> دائمًا.
        </p>
        <p>
          ارتفع سهم <Ltr mono lang="en">ACME</Ltr> بنسبة <bdi>-0.42%</bdi> اليوم.
        </p>
        <p>
          المعرف <Ltr mono>ORD-000042</Ltr> محفوظ.
        </p>
      </div>
    ) : (
      <div style={{ display: "grid", gap: "var(--stoa-space-2)" }}>
        <p>
          The answer is <Ltr>2 + 2 = 4</Ltr>, always.
        </p>
        <p>
          <Ltr mono>ACME</Ltr> moved <bdi>-0.42%</bdi> today.
        </p>
        <p>
          Order <Ltr mono>ORD-000042</Ltr> is saved.
        </p>
      </div>
    );
  },
};

/** Metrics with a basis and each threshold tone. */
export const Metrics: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--stoa-space-6)" }}>
      <Metric label="Frame time" value={16.9} fractionDigits={1} unit="ms" basis="p95 over 60 s" threshold={{ tone: "negative", label: "Over budget" }} />
      <Metric label="Fill rate" value={98.2} fractionDigits={1} unit="%" basis="last 1,000 orders" threshold={{ tone: "positive", label: "Above target" }} />
      <Metric label="Spread" value={0.05} fractionDigits={2} unit="USD" threshold={{ tone: "neutral", label: "Typical" }} />
      <Metric label="Session" value="10:30:05" />
    </div>
  ),
};

/** A StatBar with plain values and Metric items side by side. */
export const StatBarWithMetrics: StoryObj = {
  render: () => (
    <StatBar
      label="Performance counters"
      items={[
        { label: "frames/s", value: "60" },
        { kind: "metric", label: "frame p95", value: 16.9, fractionDigits: 1, unit: "ms", threshold: { tone: "positive", label: "within budget" } },
        { kind: "metric", label: "book p95", value: 0.5, fractionDigits: 2, unit: "ms", basis: "last 60 s" },
      ]}
    />
  ),
};

/** A term explained in a tooltip, closed: Tab to the term, hover it or
 * press it to open the explanation. */
export const TooltipClosed: StoryObj = {
  render: () => (
    <p>
      The <Tooltip content="Yield to maturity: the return if the bond is held until it is repaid.">YTM</Tooltip> of this
      bond is 7.52%.
    </p>
  ),
};

/** The tooltip open, below its term. */
export const TooltipOpen: StoryObj = {
  render: () => (
    <p style={{ paddingBlockEnd: "var(--stoa-space-12)" }}>
      Accrued interest uses the{" "}
      <Tooltip content="Actual/365: the days actually elapsed, over a 365-day year." placement="bottom" defaultOpen>
        day count
      </Tooltip>{" "}
      of the issue.
    </p>
  ),
};

/** A tooltip on each side of its term, all open: above, below, at the
 * start and at the end of the line (the left and the right in a
 * left-to-right page, the other way round in a right-to-left one). Each
 * arrow points at its term. */
export const TooltipPlacements: StoryObj = {
  render: () => (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: "calc(var(--stoa-space-12) * 2)",
        paddingBlock: "var(--stoa-space-12)",
      }}
    >
      <Tooltip content="Opens above" placement="top" defaultOpen>
        top
      </Tooltip>
      <Tooltip content="Opens below" placement="bottom" defaultOpen>
        bottom
      </Tooltip>
      <Tooltip content="Opens at the start" placement="start" defaultOpen>
        start
      </Tooltip>
      <Tooltip content="Opens at the end" placement="end" defaultOpen>
        end
      </Tooltip>
    </div>
  ),
};

const BOND: DescriptionItem[] = [
  { term: "ISIN", description: "RU000A1001" },
  { term: "Issuer", description: "Gazprom Capital" },
  { term: "Coupon", description: "7.50%", numeric: true },
  { term: "Maturity", description: "4 Sep 2027" },
  { term: "Yield to maturity", description: "7.52%", numeric: true },
];

/** A read-only record: terms in one column, values beside them. */
export const DescriptionColumns: StoryObj = {
  render: () => (
    <Panel title="RU000A1001">
      <DescriptionList items={BOND} />
    </Panel>
  ),
};

/** Values in both directions: each keeps its own, so the date reads left
 * to right in a right-to-left page and the Arabic issuer right to left in
 * a left-to-right one, and both stay beside their terms. */
export const DescriptionMixedDirections: StoryObj = {
  render: () => (
    <Panel title="RU000A1001">
      <DescriptionList
        items={[
          { term: "Maturity", description: "4 Sep 2027" },
          { term: "Issuer", description: "شركة Gazprom Capital" },
          { term: "Coupon", description: "7.50%", numeric: true },
        ]}
      />
    </Panel>
  ),
};

/** The same record stacked, for a narrow pane. */
export const DescriptionStacked: StoryObj = {
  render: () => (
    <div style={{ maxInlineSize: "calc(var(--stoa-space-12) * 5)" }}>
      <Panel title="RU000A1001">
        <DescriptionList items={BOND} layout="stacked" />
      </Panel>
    </div>
  ),
};

const RECORDS: RecordListItem[] = [
  { id: "a", label: "RU000A1001", description: "Gazprom Capital, 2027", meta: "7.52%" },
  { id: "b", label: "RU000A1002", description: "Sberbank, 2026", meta: "8.10%" },
  { id: "c", label: "RU000A1003", description: "Matured, no longer traded", isDisabled: true },
  { id: "d", label: "XS0000004", description: "Lukoil, 2030", meta: "6.95%" },
];

/** A master-detail view: pick a record in the list (the arrows move,
 * Enter or a click picks), its details show beside it. One record is
 * disabled. */
export const RecordListWithDetail: StoryObj = {
  render: () => {
    const [picked, setPicked] = useState<string | null>("a");
    const record = RECORDS.find((item) => item.id === picked);
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))" }}>
        <Panel title="Bonds">
          <RecordList label="Bonds" items={RECORDS} value={picked} onChange={setPicked} />
        </Panel>
        <Panel title={record?.label ?? "No bond picked"}>
          {record && (
            <DescriptionList
              items={[
                { term: "Issuer", description: record.description },
                { term: <Tooltip content="Yield to maturity: the return if the bond is held until it is repaid.">YTM</Tooltip>, id: "ytm", description: record.meta, numeric: true },
              ]}
            />
          )}
        </Panel>
      </div>
    );
  },
};

/** On a narrow screen the detail replaces the list: picking a record, by
 * a click or from the keyboard, removes the list, and the focus goes to
 * the Back button that takes its place, not to the page's body. Back
 * shows the list again, with the focus on the record it was opened from
 * (`focusRecord` on the list's ref, called as the list mounts). */
export const RecordListReplacedByDetail: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const [picked, setPicked] = useState<string | null>(null);
    const list = useRef<RecordListHandle>(null);
    const openedFrom = useRef<string | null>(null);
    useEffect(() => {
      if (picked === null && openedFrom.current !== null) list.current?.focusRecord(openedFrom.current);
      else openedFrom.current = picked;
    }, [picked]);
    const record = RECORDS.find((item) => item.id === picked);
    return (
      <div style={{ maxInlineSize: "calc(var(--stoa-space-12) * 6)" }}>
        {record ? (
          <Panel title={record.label}>
            <div style={{ display: "grid", gap: "var(--stoa-space-3)", justifyItems: "start" }}>
              <Button onPress={() => setPicked(null)}>{arabic ? "رجوع" : "Back"}</Button>
              <DescriptionList items={[{ term: arabic ? "المصدر" : "Issuer", description: record.description }]} />
            </div>
          </Panel>
        ) : (
          <Panel title={arabic ? "السندات" : "Bonds"}>
            <RecordList ref={list} label={arabic ? "السندات" : "Bonds"} items={RECORDS} value={picked} onChange={setPicked} />
          </Panel>
        )}
      </div>
    );
  },
};

/** No record picked yet. */
export const RecordListNothingPicked: StoryObj = {
  render: () => {
    const [picked, setPicked] = useState<string | null>(null);
    return <RecordList label="Bonds" items={RECORDS} value={picked} onChange={setPicked} />;
  },
};

/** No records: the list says so, in the locale's words. */
export const RecordListEmpty: StoryObj = {
  render: () => <RecordList label="Bonds" items={[]} value={null} onChange={() => {}} />,
};
