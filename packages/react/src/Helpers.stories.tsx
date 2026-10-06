import type { Meta, StoryObj } from "@storybook/react-vite";
import { DescriptionList } from "./DescriptionList";
import { Panel } from "./Panel";
import { useFormatters } from "./format";
import { useStoaFormat } from "./locale";
import { useBreakpoint } from "./media";

const meta: Meta = { title: "Application/Helpers" };
export default meta;

/** 4 September 2026, 14:05:09 UTC. */
const AT = Date.UTC(2026, 8, 4, 14, 5, 9);

const TERMS = {
  en: {
    title: "Formatters",
    money: "Money",
    signedMoney: "Income",
    percent: "Yield",
    signedPercent: "Change",
    date: "Date",
    long: "Date, long",
    time: "Time",
    duration: "Time left",
    list: "Events",
    events: ["coupon", "offer", "maturity"],
    breakpoint: "Viewport",
    widths: { narrow: "narrow", medium: "medium", wide: "wide" },
  },
  ru: {
    title: "Форматы",
    money: "Сумма",
    signedMoney: "Доход",
    percent: "Доходность",
    signedPercent: "Изменение",
    date: "Дата",
    long: "Дата полностью",
    time: "Время",
    duration: "Осталось",
    list: "События",
    events: ["купон", "оферта", "погашение"],
    breakpoint: "Экран",
    widths: { narrow: "узкий", medium: "средний", wide: "широкий" },
  },
  ar: {
    title: "التنسيقات",
    money: "المبلغ",
    signedMoney: "الدخل",
    percent: "العائد",
    signedPercent: "التغير",
    date: "التاريخ",
    long: "التاريخ كاملًا",
    time: "الوقت",
    duration: "الوقت المتبقي",
    list: "الأحداث",
    events: ["كوبون", "عرض", "استحقاق"],
    breakpoint: "الشاشة",
    widths: { narrow: "ضيقة", medium: "متوسطة", wide: "عريضة" },
  },
};

/** An application's own values through `useFormatters`, in the locale of
 * the toolbar's language (UTC for the date and time), and the viewport's
 * width class from `useBreakpoint`. Each value keeps its own direction in
 * a right-to-left page. */
export const Formatters: StoryObj = {
  render: () => {
    const language = useStoaFormat().locale.split("-")[0] as "en" | "ru" | "ar";
    const t = TERMS[language] ?? TERMS.en;
    const f = useFormatters({ timeZone: "UTC" });
    const breakpoint = useBreakpoint();
    const value = (text: string) => <bdi>{text}</bdi>;
    return (
      <Panel title={t.title}>
        <DescriptionList
          items={[
            { term: t.money, description: value(f.money(1234567.5)), numeric: true },
            { term: t.signedMoney, description: value(f.money(12.5, { signed: true })), numeric: true },
            { term: t.percent, description: value(f.percent(0.0752)), numeric: true },
            { term: t.signedPercent, description: value(f.signedPercent(-0.0042)), numeric: true },
            { term: t.date, description: value(f.date(AT)) },
            { term: t.long, description: value(f.date(AT, "long")) },
            { term: t.time, description: value(f.time(AT)) },
            { term: t.duration, description: value(f.duration(2 * 86_400_000 + 5 * 3_600_000 + 30 * 60_000)) },
            { term: t.list, description: f.list(t.events) },
            { term: t.breakpoint, description: t.widths[breakpoint] },
          ]}
        />
      </Panel>
    );
  },
};
