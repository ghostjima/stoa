import type { Meta, StoryObj } from "@storybook/react-vite";
import { Letter, type LetterGround } from "./Letter";
import { Panel } from "./Panel";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Case/Letter" };
export default meta;

const LETTERS: Record<"en" | "ar", { title: string; label: string; lines: string[]; grounds: LetterGround[] }> = {
  en: {
    title: "Reply draft",
    label: "Reply to the client, case Z-000104",
    lines: [
      "Dear client,",
      "We have reviewed your complaint of 3 September 2026, case Z-000104.",
      "Your transfer 7731-0042 of 2 September 2026 for 48,500.00 RUB was suspended.",
      "The transfer matched sign 1.4 of the Bank of Russia's list of signs of transfers without the client's consent.",
      "The ground is 161-FZ, art. 8, part 3.4.",
      "You may confirm the order, and the bank will carry it out the next day.",
    ],
    grounds: [
      {
        id: "payment_8_3_4",
        citation: "161-FZ, art. 8, part 3.4",
        text: "A bank that finds a transfer matches a sign of one without the client's consent suspends it for up to two days and asks the client to confirm it.",
      },
    ],
  },
  ar: {
    title: "مسودة الرد",
    label: "الرد على العميل، الطلب Z-000104",
    lines: [
      "عزيزنا العميل،",
      "راجعنا شكواك المؤرخة 3 سبتمبر 2026، الطلب Z-000104.",
      "عُلّق تحويلك 7731-0042 المؤرخ 2 سبتمبر 2026 بمبلغ 48,500.00 روبل.",
      "طابق التحويل العلامة 1.4 من قائمة بنك روسيا لعلامات التحويلات دون موافقة العميل.",
      "الأساس هو القانون 161-FZ، المادة 8، الفقرة 3.4.",
      "يمكنك تأكيد الأمر، وسينفذه البنك في اليوم التالي.",
    ],
    grounds: [
      {
        id: "payment_8_3_4",
        citation: "161-FZ, art. 8, part 3.4",
        text: "البنك الذي يجد أن التحويل يطابق علامة تحويل دون موافقة العميل يعلّقه لمدة تصل إلى يومين ويطلب من العميل تأكيده.",
      },
    ],
  },
};

/** A drafted reply, a sentence a line, as a quotation in its own
 * language, with the ground it cites under it; Copy puts the letter on
 * the clipboard as plain text. Right to left, the citation and the case
 * number keep their own order. */
export const Reply: StoryObj = {
  render: () => {
    const lang = useStoaFormat().locale.startsWith("ar") ? "ar" : "en";
    const d = LETTERS[lang];
    return (
      <Panel title={d.title}>
        <Letter label={d.label} lines={d.lines} lang={lang} grounds={d.grounds} />
      </Panel>
    );
  },
};

/** A Russian letter in a page of either language: the quotation carries
 * its own language and direction. No grounds, and no Copy button. */
export const InItsOwnLanguage: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    return (
      <Letter
        label={arabic ? "الرد بالروسية" : "The reply in Russian"}
        lang="ru"
        copyable={false}
        lines={["Уважаемый клиент!", "Мы рассмотрели вашу жалобу от 3 сентября 2026 г., обращение Z-000104.", "Основание: 161-ФЗ, ст. 8, ч. 3.4."]}
      />
    );
  },
};
