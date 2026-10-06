import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { I18nProvider } from "react-aria-components";
import { AppHeader } from "./AppHeader";
import { Callout } from "./Callout";
import { ChoiceGroup } from "./Controls";
import { DescriptionList } from "./DescriptionList";
import { Disclosure } from "./Disclosure";
import { StatusBadge } from "./Form";
import { Panel, StatBar } from "./Panel";
import { ScrollArea } from "./ScrollArea";

const meta: Meta = { title: "Layout/Panel" };
export default meta;

/** A titled region; its heading names it for assistive technology. */
export const Titled: StoryObj = {
  render: () => (
    <Panel title="Session">
      <StatBar
        label="Session counters"
        items={[
          { label: "frames/s", value: "60" },
          { label: "frame p95", value: "16.9 ms" },
          { label: "book p95", value: "0.50 ms" },
        ]}
      />
    </Panel>
  ),
};

/** Sections that open and close, with the Select's chevron. */
export const Sections: StoryObj = {
  render: () => (
    <Panel title="Checks">
      <Disclosure summary="Text contrast (44)" defaultOpen>
        <StatusBadge tone="positive">44 passed</StatusBadge>
      </Disclosure>
      <Disclosure summary="Target size (3)">
        <StatusBadge tone="positive">3 passed</StatusBadge>
      </Disclosure>
    </Panel>
  ),
};

/** Panels inside a panel take the next heading level, so the page's
 * outline stays in order; every level is drawn the same. */
export const NestedLevels: StoryObj = {
  render: () => (
    <Panel title="RU000A1234 (level 2)">
      <div style={{ display: "grid", gap: "var(--stoa-space-3)", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))" }}>
        <Panel title="Coupons (level 3)" level={3}>
          <p>Twice a year, 7.5%.</p>
        </Panel>
        <Panel title="Offers (level 3)" level={3}>
          <p>One put offer before maturity.</p>
        </Panel>
      </div>
    </Panel>
  ),
};

/** The bar at the top of an application: name, subtitle, a note and the
 * theme and language switches. */
export const Header: StoryObj = {
  render: () => {
    const [theme, setTheme] = useState("light");
    const [lang, setLang] = useState("en");
    return (
      <AppHeader
        title="Tyche Replay"
        subtitle="AAPL on IEX"
        note="Data provided for free by IEX."
        actions={
          <>
            <ChoiceGroup
              label="Theme"
              hideLabel
              size="small"
              value={theme}
              onChange={setTheme}
              choices={[
                { id: "light", label: "Light" },
                { id: "dark", label: "Dark" },
              ]}
            />
            <ChoiceGroup
              label="Language"
              hideLabel
              size="small"
              value={lang}
              onChange={setLang}
              choices={[
                { id: "en", label: "EN" },
                { id: "ar", label: "AR" },
              ]}
            />
          </>
        }
      />
    );
  },
  parameters: { layout: "fullscreen" },
};

/** A scrolling box with nothing focusable inside: the label makes it a
 * region and a Tab stop, so the keyboard can scroll it. Its scrollbar is
 * drawn like every other one, in a reserved lane. */
export const Scrolling: StoryObj = {
  render: () => (
    <Panel title="Event log">
      <ScrollArea label="Event log" className="story-scroll">
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i}>
            09:30:{String(i).padStart(2, "0")} order {1000 + i} accepted
          </div>
        ))}
      </ScrollArea>
      <style>{".story-scroll { max-block-size: calc(var(--stoa-space-12) * 3); }"}</style>
    </Panel>
  ),
};

/** A page of Arabic text, right to left whatever the toolbar says: the
 * text e2e/arabic-cls.measure.mjs loads with the Arabic font held back,
 * to measure how far the page moves when the font arrives. */
export const ArabicPage: StoryObj = {
  render: () => (
    <div dir="rtl" lang="ar" style={{ display: "grid", gap: "var(--stoa-space-4)", maxInlineSize: "calc(var(--stoa-space-12) * 14)" }}>
      <I18nProvider locale="ar-u-nu-arab">
        <Panel title="سندات الحكومة الفيدرالية">
          <p>
            تدفع السندات الحكومية قسيمة ثابتة مرتين في السنة حتى تاريخ الاستحقاق، ثم تعيد القيمة الاسمية كاملة. يتغير سعرها في السوق
            مع أسعار الفائدة، فينخفض حين ترتفع ويرتفع حين تنخفض.
          </p>
          <p>
            العائد حتى الاستحقاق هو المعدل الذي يجعل القيمة الحالية لكل التدفقات النقدية مساوية لسعر الشراء، بما فيه الفائدة المتراكمة
            المدفوعة للبائع.
          </p>
        </Panel>
        <Panel title="تفاصيل الإصدار">
          <DescriptionList
            items={[
              { term: "المصدر", description: "وزارة المالية" },
              { term: "القسيمة", description: "٧٫٥٪ مرتين في السنة", numeric: true },
              { term: "الاستحقاق", description: "٤ سبتمبر ٢٠٣٠" },
              { term: "الحد الأدنى للشراء", description: "١٬٠٠٠ روبل", numeric: true },
            ]}
          />
        </Panel>
        <Callout tone="warning" title="قبل الشراء">
          الضريبة على القسائم تُخصم عند الدفع، ولا تُحسب في العائد المعروض هنا.
        </Callout>
        <Panel title="الخطوات التالية">
          <p>اختر الإصدار، ثم حدد المبلغ والمدة، وسيعرض الحاسب العائد بعد الضريبة.</p>
          <p>
            إذا بعت السند قبل الاستحقاق، فسيكون سعر البيع هو سعر السوق في ذلك اليوم، وقد يكون أعلى أو أقل من سعر الشراء. يعرض الحاسب
            ثلاثة سيناريوهات لأسعار الفائدة حتى ترى أثر كل منها على العائد.
          </p>
        </Panel>
        <Panel title="أسئلة شائعة">
          <p>متى تُدفع القسيمة؟ في التواريخ المحددة في نشرة الإصدار، وتصل إلى حسابك في يوم العمل التالي.</p>
          <p>هل يمكن شراء جزء من سند؟ لا، يُشترى السند بقيمته الاسمية كاملة أو بمضاعفاتها.</p>
          <p>ما الفرق بين العائد البسيط والعائد حتى الاستحقاق؟ الأول لا يأخذ إعادة استثمار القسائم في الحسبان، والثاني يأخذها.</p>
        </Panel>
      </I18nProvider>
    </div>
  ),
};
