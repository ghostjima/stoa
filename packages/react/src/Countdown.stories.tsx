import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { Countdown, DeadlineCell } from "./Countdown";
import { Panel } from "./Panel";
import { Table } from "./Table";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Data/Countdown" };
export default meta;

const column = { display: "grid", gap: "var(--stoa-space-2)", justifyItems: "start" } as const;

/** Each state, in working days with a warning from 3 left: time to spare
 * (words alone), close (an exclamation mark), due today, and passed (a
 * cross, the words in the heavier weight). The symbol's colour repeats
 * what the symbol and the words say. */
export const States: StoryObj = {
  render: () => (
    <div style={column}>
      <Countdown left={8} unit="workingDays" warnAt={3} />
      <Countdown left={3} unit="workingDays" warnAt={3} />
      <Countdown left={1} unit="workingDays" warnAt={3} />
      <Countdown left={0} unit="workingDays" warnAt={3} />
      <Countdown left={-2} unit="workingDays" warnAt={3} />
    </div>
  ),
};

/** Hours and calendar days, counted by the caller: an offer's window in
 * days, a same-day duty in hours. */
export const Units: StoryObj = {
  render: () => (
    <div style={column}>
      <Countdown left={12} unit="days" warnAt={5} />
      <Countdown left={21} unit="days" warnAt={5} />
      <Countdown left={5} unit="hours" warnAt={2} />
      <Countdown left={1} unit="hours" warnAt={2} />
      <Countdown left={-1.5} unit="hours" warnAt={2} />
    </div>
  ),
};

/** A live countdown: the caller updates the time left every second (a
 * minute of hours here, sped up); the words follow silently, and only the
 * change to a warning and then to overdue is read out. */
export const Live: StoryObj = {
  render: () => {
    const [left, setLeft] = useState(3);
    useEffect(() => {
      const timer = setInterval(() => setLeft((n) => (n <= -2 ? 3 : n - 1)), 1000);
      return () => clearInterval(timer);
    }, []);
    return <Countdown left={left} unit="hours" warnAt={1} />;
  },
};

type Case = { id: string; client: { en: string; ar: string }; left: number };
const CASES: Case[] = [
  { id: "Z-000104", client: { en: "Card blocked", ar: "حظر البطاقة" }, left: 9 },
  { id: "Z-000107", client: { en: "Transfer refused", ar: "رفض التحويل" }, left: 2 },
  { id: "Z-000112", client: { en: "Account closed", ar: "إغلاق الحساب" }, left: 0 },
  { id: "Z-000098", client: { en: "Fee disputed", ar: "اعتراض على رسوم" }, left: -3 },
];

/** DeadlineCell in a queue: the reply deadline of each case in working
 * days, warning from 2 left; no row's change is read out on its own. */
export const InATable: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    return (
      <Panel title={arabic ? "الطلبات" : "Cases"}>
        <Table<Case>
          caption={arabic ? "الطلبات حسب موعد الرد" : "Cases by reply deadline"}
          hideCaption
          rowKey={(c) => c.id}
          rows={CASES}
          rowHeader="id"
          emptyText=""
          columns={[
            { id: "id", header: arabic ? "الطلب" : "Case", cell: (c) => <bdi>{c.id}</bdi> },
            { id: "client", header: arabic ? "الموضوع" : "Subject", cell: (c) => c.client[arabic ? "ar" : "en"] },
            { id: "deadline", header: arabic ? "موعد الرد" : "Reply due", cell: (c) => <DeadlineCell left={c.left} unit="workingDays" warnAt={2} /> },
          ]}
        />
      </Panel>
    );
  },
};
