import type { Meta, StoryObj } from "@storybook/react-vite";
import { Panel } from "./Panel";
import { Timeline, type TimelineEntry } from "./Timeline";
import { useFormatters } from "./format";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Case/Timeline" };
export default meta;

type Event = { id: string; at: string; time?: boolean; kind: { en: string; ar: string }; actor?: { en: string; ar: string }; text?: { en: string; ar: string }; emphasis?: boolean };

// Given out of order: the timeline sorts them by `at`.
const EVENTS: Event[] = [
  {
    id: "due",
    at: "2026-09-25T00:00:00Z",
    kind: { en: "Reply due", ar: "موعد الرد" },
    text: { en: "15 working days from registration.", ar: "خمسة عشر يوم عمل من التسجيل." },
    emphasis: true,
  },
  {
    id: "received",
    at: "2026-09-03T11:05:00Z",
    time: true,
    kind: { en: "Received", ar: "الاستلام" },
    text: { en: "By email, forwarded by the Bank of Russia.", ar: "بالبريد الإلكتروني، محالة من بنك روسيا." },
  },
  {
    id: "registered",
    at: "2026-09-04T07:40:00Z",
    time: true,
    kind: { en: "Registered", ar: "التسجيل" },
    actor: { en: "Operator Ivanova", ar: "المشغلة إيفانوفا" },
  },
  {
    id: "notice",
    at: "2026-09-04T08:15:00Z",
    time: true,
    kind: { en: "Registration notice", ar: "إشعار التسجيل" },
    actor: { en: "Operator Ivanova", ar: "المشغلة إيفانوفا" },
    text: { en: "Sent by email.", ar: "أُرسل بالبريد الإلكتروني." },
  },
  {
    id: "request",
    at: "2026-09-08T12:30:00Z",
    time: true,
    kind: { en: "Facts requested", ar: "طلب الوقائع" },
    actor: { en: "Antifraud team", ar: "فريق مكافحة الاحتيال" },
    text: { en: "Operation 7731-0042: the order's confirmation log.", ar: "العملية 7731-0042: سجل تأكيد الأمر." },
  },
];

/** A complaint's history: received, registered, a notice sent, facts
 * requested, and the reply's last day still to come, emphasised with a
 * bar, a symbol and its weight. The entries are given out of order and
 * shown oldest first, grouped by day (Moscow time), each with its own
 * time; right to left, every date and time keeps its order. */
export const CaseHistory: StoryObj = {
  render: () => {
    const lang = useStoaFormat().locale.startsWith("ar") ? "ar" : "en";
    const fmt = useFormatters({ timeZone: "Europe/Moscow" });
    const entries: TimelineEntry[] = EVENTS.map((e) => ({
      id: e.id,
      at: e.at,
      when: e.time ? fmt.time(new Date(e.at)) : undefined,
      kind: e.kind[lang],
      actor: e.actor?.[lang],
      text: e.text?.[lang],
      emphasis: e.emphasis,
    }));
    return (
      <Panel title={lang === "ar" ? "سجل الطلب" : "Case history"}>
        <Timeline label={lang === "ar" ? "سجل الطلب" : "Case history"} entries={entries} timeZone="Europe/Moscow" />
      </Panel>
    );
  },
};

/** No entries yet: the locale's words. */
export const Empty: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    return (
      <Panel title={arabic ? "سجل الطلب" : "Case history"}>
        <Timeline label={arabic ? "سجل الطلب" : "Case history"} entries={[]} />
      </Panel>
    );
  },
};
