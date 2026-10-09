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
      { id: "n24", date: "2026-11-24", kind: "deadline", title: "Last day to claim the unpaid coupon from the issuer" },
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
      { id: "n24", date: "2026-11-24", kind: "deadline", title: "آخر يوم للمطالبة بالكوبون غير المدفوع من المُصدر" },
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
 * a coupon unpaid, a default, the deadline to claim the coupon, and four
 * events on the last day. Nothing
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

// A put offer with the day to ask for redemption by, a floating coupon
// worked out at today's index, and a scenario's rating change, in each of
// Stoa's languages.
const ACT_BY = {
  en: {
    label: "Events of Volga Energy 002P-01",
    events: [
      { id: "d9", date: "2026-10-09", kind: "deadline", title: "Last day to ask for redemption at the put offer", detail: "Submit the request through your broker." },
      { id: "o15", date: "2026-10-15", kind: "offer", title: "Put offer at 100% of face" },
      { id: "c21", date: "2026-10-21", kind: "coupon", title: "Coupon 7 of 12, about 41.20 RUB per bond", detail: "A floating coupon, worked out at today's key rate.", mark: "projected" },
      { id: "r28", date: "2026-10-28", kind: "rating", title: "Rating lowered from A to BBB+", detail: "The scenario's event, not news about the issuer.", mark: "synthetic" },
    ],
  },
  ru: {
    label: "События выпуска Волга Энерджи 002P-01",
    events: [
      { id: "d9", date: "2026-10-09", kind: "deadline", title: "Последний день подать заявку на выкуп по оферте", detail: "Заявка подаётся через брокера." },
      { id: "o15", date: "2026-10-15", kind: "offer", title: "Оферта на выкуп по 100% номинала" },
      { id: "c21", date: "2026-10-21", kind: "coupon", title: "Купон 7 из 12, около 41,20 ₽ на облигацию", detail: "Плавающий купон, посчитан по сегодняшней ключевой ставке.", mark: "projected" },
      { id: "r28", date: "2026-10-28", kind: "rating", title: "Рейтинг понижен с A до BBB+", detail: "Событие сценария, а не новость об эмитенте.", mark: "synthetic" },
    ],
  },
  ar: {
    label: "أحداث سندات فولغا للطاقة 002P-01",
    events: [
      { id: "d9", date: "2026-10-09", kind: "deadline", title: "آخر يوم لتقديم طلب الاسترداد في عرض البيع", detail: "قدّم الطلب عبر وسيطك." },
      { id: "o15", date: "2026-10-15", kind: "offer", title: "عرض بيع بنسبة 100٪ من القيمة الاسمية" },
      { id: "c21", date: "2026-10-21", kind: "coupon", title: "الكوبون 7 من 12، نحو 41.20 روبل للسند", detail: "كوبون متغير محسوب بسعر الفائدة الرئيسي اليوم.", mark: "projected" },
      { id: "r28", date: "2026-10-28", kind: "rating", title: "خفض التصنيف من A إلى BBB+", detail: "حدث من السيناريو، وليس خبرًا عن المُصدر.", mark: "synthetic" },
    ],
  },
} as const satisfies Record<"en" | "ru" | "ar", { label: string; events: CalendarEvent[] }>;

function useActBy() {
  const { locale } = useStoaFormat();
  return ACT_BY[locale.startsWith("ar") ? "ar" : locale.startsWith("ru") ? "ru" : "en"];
}

/** A deadline is a kind of its own, on its own day before the event it
 * leads to: the last day to ask for redemption, six days before the put
 * offer. A projected coupon and a synthetic rating change say so beside
 * their kind's word, and their days are read with the mark. The deadline
 * is chosen in the grid; the list below holds the month. */
export const DeadlinesAndMarks: StoryObj = {
  render: () => {
    const w = useActBy();
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-6)" }}>
        <EventCalendar label={w.label} events={[...w.events]} today={TODAY} defaultSelectedDate="2026-10-09" view="grid" />
        <EventCalendar label={w.label} events={[...w.events]} today={TODAY} view="list" />
      </div>
    );
  },
};
