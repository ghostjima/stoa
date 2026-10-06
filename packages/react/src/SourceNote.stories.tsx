import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nProvider } from "react-aria-components";
import { DescriptionList } from "./DescriptionList";
import { Panel } from "./Panel";
import { SourceNote } from "./SourceNote";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Data/SourceNote" };
export default meta;

const WORDS = {
  en: {
    universe: "Issues",
    benchmarks: "Bank of Russia benchmarks",
    calculator: "Calculator",
    simNote: "Synthetic data: fictional issuers, issues, ratings, prices and trades.",
    dataPage: "Data and licensing",
    borTag: "Bank of Russia",
    borNote: "Key rate and zero-coupon yield curve as of 5 October 2026.",
    curveCredit: "The curve is calculated by the Moscow Exchange:",
    keyRate: "Key rate",
    ruonia: "RUONIA",
    income: "Coupon income after tax",
    horizon: "Horizon",
  },
  ar: {
    universe: "الإصدارات",
    benchmarks: "مؤشرات بنك روسيا",
    calculator: "الحاسبة",
    simNote: "بيانات اصطناعية: مُصدِرون وإصدارات وتصنيفات وأسعار وصفقات وهمية.",
    dataPage: "البيانات والتراخيص",
    borTag: "بنك روسيا",
    borNote: "سعر الفائدة الرئيسي ومنحنى العائد الصفري بتاريخ 5 أكتوبر 2026.",
    curveCredit: "تحسب بورصة موسكو المنحنى:",
    keyRate: "سعر الفائدة الرئيسي",
    ruonia: "RUONIA",
    income: "دخل القسيمة بعد الضريبة",
    horizon: "الأفق",
  },
};

const useWords = () => WORDS[useStoaFormat().locale.startsWith("ar") ? "ar" : "en"];

/** The synthetic universe's label: the SIM tag in the accent, the sentence
 * that says the figures are made up, and a link to where that is
 * explained. */
export const SimWithLink: StoryObj = {
  render: () => {
    const w = useWords();
    return (
      <Panel title={w.universe}>
        <SourceNote tag="SIM" kind="sim" link={{ href: "#data", label: w.dataPage }}>
          {w.simNote}
        </SourceNote>
        <DescriptionList items={[{ term: w.horizon, description: "2026–2029" }]} />
      </Panel>
    );
  },
};

/** An outside source: its name in a neutral tag, the date its figures were
 * taken, a link to the source as its terms ask, and a second credit with
 * its own link inside the sentence. */
export const OfficialWithLink: StoryObj = {
  render: () => {
    const w = useWords();
    return (
      <Panel title={w.benchmarks}>
        <SourceNote tag={w.borTag} kind="official" link={{ href: "https://www.cbr.ru/", label: "cbr.ru" }}>
          {w.borNote} {w.curveCredit} <a href="https://www.moex.com/a3642">moex.com</a>.
        </SourceNote>
        <DescriptionList
          items={[
            { term: w.keyRate, description: "14.00%", numeric: true },
            { term: w.ruonia, description: "13.87%", numeric: true },
          ]}
        />
      </Panel>
    );
  },
};

/** A widget whose figures come from two sources: the notes in a row sit
 * closer together than the last one and the widget's content. In a narrow
 * column the sentences wrap under their tags. */
export const Stacked: StoryObj = {
  render: () => {
    const w = useWords();
    return (
      <div style={{ maxInlineSize: "22rem" }}>
        <Panel title={w.calculator}>
          <SourceNote tag="SIM" kind="sim" link={{ href: "#data", label: w.dataPage }}>
            {w.simNote}
          </SourceNote>
          <SourceNote tag={w.borTag} kind="official" link={{ href: "https://www.cbr.ru/", label: "cbr.ru" }}>
            {w.borNote}
          </SourceNote>
          <DescriptionList items={[{ term: w.income, description: "34.17 RUB", numeric: true }]} />
        </Panel>
      </div>
    );
  },
};

/** Arabic, right to left whatever the toolbar says: the tag at the right,
 * where the line starts, the Latin "SIM" and "cbr.ru" kept in their own
 * left-to-right order, and "Source:" read out in Arabic. */
export const Arabic: StoryObj = {
  render: () => (
    <div dir="rtl" lang="ar" style={{ maxInlineSize: "24rem" }}>
      <I18nProvider locale="ar-u-nu-arab">
        <Panel title={WORDS.ar.calculator}>
          <SourceNote tag="SIM" kind="sim" link={{ href: "#data", label: WORDS.ar.dataPage }}>
            {WORDS.ar.simNote}
          </SourceNote>
          <SourceNote tag={WORDS.ar.borTag} kind="official" link={{ href: "https://www.cbr.ru/", label: "cbr.ru" }}>
            {WORDS.ar.borNote}
          </SourceNote>
          <DescriptionList items={[{ term: WORDS.ar.income, description: "34.17 روبل", numeric: true }]} />
        </Panel>
      </I18nProvider>
    </div>
  ),
};
