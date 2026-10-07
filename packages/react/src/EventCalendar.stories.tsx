import type { Meta, StoryObj } from "@storybook/react-vite";
import { EventCalendar, type CalendarEvent } from "./EventCalendar";
import { Panel } from "./Panel";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Data/EventCalendar" };
export default meta;

const TODAY = "2026-10-07";

const WORDS = {
  en: {
    panel: "Payments and events",
    label: "Events of Severo-Zapad Leasing 001P-03",
    october: [
      { id: "c7", date: "2026-10-07", kind: "coupon", title: "Coupon 5 of 12, 36.40 RUB per bond" },
      { id: "o15", date: "2026-10-15", kind: "offer", title: "Put offer at 100% of face", detail: "Submit a redemption request by 9 October through your broker." },
      { id: "a15", date: "2026-10-15", kind: "amortisation", title: "20% of face paid back" },
      { id: "r28", date: "2026-10-28", kind: "rating", title: "Rating lowered from A to BBB+, outlook negative", detail: "A fictional agency: the data is synthetic." },
    ],
    hard: [
      { id: "c5", date: "2026-11-05", kind: "coupon", title: "Coupon 6 of 12 not paid" },
      { id: "d19", date: "2026-11-19", kind: "default", title: "Technical default became a default", detail: "The coupon was not paid within 10 working days." },
      { id: "m30", date: "2026-11-30", kind: "maturity", title: "Maturity: the rest of face is due" },
      { id: "r30", date: "2026-11-30", kind: "rating", title: "Rating withdrawn" },
      { id: "a30", date: "2026-11-30", kind: "amortisation", title: "Final amortisation, 40% of face" },
      { id: "o30", date: "2026-11-30", kind: "offer", title: "Call offer cancelled" },
    ],
  },
  ar: {
    panel: "المدفوعات والأحداث",
    label: "أحداث سندات سيفيرو-زاباد للتأجير 001P-03",
    october: [
      { id: "c7", date: "2026-10-07", kind: "coupon", title: "الكوبون 5 من 12، 36.40 روبل للسند" },
      { id: "o15", date: "2026-10-15", kind: "offer", title: "عرض بيع بنسبة 100٪ من القيمة الاسمية", detail: "قدّم طلب الاسترداد قبل 9 أكتوبر عبر وسيطك." },
      { id: "a15", date: "2026-10-15", kind: "amortisation", title: "سداد 20٪ من القيمة الاسمية" },
      { id: "r28", date: "2026-10-28", kind: "rating", title: "خفض التصنيف من A إلى BBB+، والنظرة سلبية", detail: "وكالة خيالية: البيانات مصطنعة." },
    ],
    hard: [
      { id: "c5", date: "2026-11-05", kind: "coupon", title: "لم يُدفع الكوبون 6 من 12" },
      { id: "d19", date: "2026-11-19", kind: "default", title: "تحوّل التعثر الفني إلى تعثر", detail: "لم يُدفع الكوبون خلال 10 أيام عمل." },
      { id: "m30", date: "2026-11-30", kind: "maturity", title: "الاستحقاق: يُستحق باقي القيمة الاسمية" },
      { id: "r30", date: "2026-11-30", kind: "rating", title: "سحب التصنيف" },
      { id: "a30", date: "2026-11-30", kind: "amortisation", title: "الإطفاء الأخير، 40٪ من القيمة الاسمية" },
      { id: "o30", date: "2026-11-30", kind: "offer", title: "إلغاء عرض الشراء" },
    ],
  },
} as const satisfies Record<"en" | "ar", { panel: string; label: string; october: CalendarEvent[]; hard: CalendarEvent[] }>;

function useWords() {
  return WORDS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];
}

/** October with a coupon today, an offer and an amortisation on the same
 * day, and a rating change; the offer day is chosen, so its events are
 * listed under the grid. The week starts on the locale's first day:
 * Sunday in American English, Monday in Russian, Saturday in Arabic.
 * Tab to the grid, then the arrow keys, Home and End, Page Up and Page
 * Down (with Shift, a year), and Enter to choose a day. On a narrow
 * screen the same calendar is the list below. */
export const Month: StoryObj = {
  render: () => {
    const w = useWords();
    return (
      <Panel title={w.panel}>
        <EventCalendar label={w.label} hideLabel events={[...w.october, ...w.hard]} today={TODAY} defaultSelectedDate="2026-10-15" />
      </Panel>
    );
  },
};

/** Every kind, each a symbol and a word in the key and the day's list:
 * a coupon unpaid, a default, and four events on the last day. Nothing
 * chosen yet: the line under the grid says how to see a day's events. */
export const AllKinds: StoryObj = {
  render: () => {
    const w = useWords();
    return <EventCalendar label={w.label} events={[...w.october, ...w.hard]} today={TODAY} defaultMonth="2026-11" view="grid" />;
  },
};

/** The list a narrow screen gets: the month's days with events, each date
 * a heading, today marked in words. */
export const List: StoryObj = {
  render: () => {
    const w = useWords();
    return <EventCalendar label={w.label} events={[...w.october, ...w.hard]} today={TODAY} view="list" />;
  },
};

/** A month without events says so, in the grid and in the list. */
export const EmptyMonth: StoryObj = {
  render: () => {
    const w = useWords();
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-6)" }}>
        <EventCalendar label={w.label} events={[...w.october]} today={TODAY} defaultMonth="2026-12" view="grid" />
        <EventCalendar label={w.label} events={[]} today={TODAY} view="list" />
      </div>
    );
  },
};
