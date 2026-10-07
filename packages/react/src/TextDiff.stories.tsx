import type { Meta, StoryObj } from "@storybook/react-vite";
import { Panel } from "./Panel";
import { TextDiff } from "./TextDiff";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Case/TextDiff" };
export default meta;

const TEXTS: Record<"en" | "ar", { title: string; label: string; before: string; after: string }> = {
  en: {
    title: "Draft and signed reply",
    label: "The draft against the signed reply",
    before: [
      "Dear client,",
      "We have reviewed your complaint of 3 September 2026.",
      "Your transfer was suspended under 161-FZ.",
      "You may confirm the order.",
    ].join("\n"),
    after: [
      "Dear client,",
      "We have reviewed your complaint of 3 September 2026, case Z-000104.",
      "Your transfer was suspended under 161-FZ, art. 8, part 3.4.",
      "You may confirm the order by 5 September 2026.",
    ].join("\n"),
  },
  ar: {
    title: "المسودة والرد الموقع",
    label: "المسودة مقابل الرد الموقع",
    before: ["عزيزنا العميل،", "راجعنا شكواك المؤرخة 3 سبتمبر 2026.", "عُلّق تحويلك وفق القانون 161-FZ.", "يمكنك تأكيد الأمر."].join("\n"),
    after: [
      "عزيزنا العميل،",
      "راجعنا شكواك المؤرخة 3 سبتمبر 2026، الطلب Z-000104.",
      "عُلّق تحويلك وفق القانون 161-FZ، المادة 8، الفقرة 3.4.",
      "يمكنك تأكيد الأمر حتى 5 سبتمبر 2026.",
    ].join("\n"),
  },
};

/** What changed between a draft and the reply that was signed: deletions
 * struck through, insertions underlined, each on its fill and read with
 * words; the share of changed characters above, and the changes as a list
 * below. */
export const DraftAndSigned: StoryObj = {
  render: () => {
    const lang = useStoaFormat().locale.startsWith("ar") ? "ar" : "en";
    const d = TEXTS[lang];
    return (
      <Panel title={d.title}>
        <TextDiff label={d.label} hideLabel before={d.before} after={d.after} lang={lang} />
      </Panel>
    );
  },
};

/** A word replaced and a word deleted, with the list of changes open. */
export const ListOpen: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    return arabic ? (
      <TextDiff label="تعديل قصير" before="سيُنفَّذ التحويل غدًا بالتأكيد." after="سيُنفَّذ التحويل اليوم." lang="ar" changesOpen />
    ) : (
      <TextDiff label="A short edit" before="The transfer will surely be made tomorrow." after="The transfer will be made today." lang="en" changesOpen />
    );
  },
};

/** The same text twice: no marks, and the summary says so. */
export const NoChanges: StoryObj = {
  render: () => {
    const lang = useStoaFormat().locale.startsWith("ar") ? "ar" : "en";
    const d = TEXTS[lang];
    return <TextDiff label={d.label} before={d.after} after={d.after} lang={lang} />;
  },
};
