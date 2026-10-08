import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CancellableRequest } from "./CancellableRequest";
import { Countdown } from "./Countdown";
import { Ltr } from "./Ltr";
import { Panel } from "./Panel";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Controls/CancellableRequest" };
export default meta;

const ISSUE = "RU000A1F3";

type Words = {
  panel: string;
  request: string;
  /** The confirmation's title, before and after the issue's code. */
  title: [string, string];
  body: (bonds: string) => string;
  confirm: string;
  recorded: (bonds: string) => string;
  deadline: string;
};

const WORDS: Record<"en" | "ru" | "ar", Words> = {
  en: {
    panel: "Put offer on 15 October",
    request: "Request redemption",
    title: ["Redeem ", " at the offer?"],
    body: (bonds) => `${bonds} bonds will be offered back to the issuer at 100% of face value. You can cancel the request until 9 October.`,
    confirm: "Request",
    recorded: (bonds) => `Requested: ${bonds} bonds. You can cancel until 9 October.`,
    deadline: "Requests until 9 October:",
  },
  ru: {
    panel: "Оферта 15 октября",
    request: "Подать заявку на выкуп",
    title: ["Предъявить ", " к выкупу по оферте?"],
    body: (bonds) => `${bonds} облигаций будут предъявлены эмитенту по 100 % номинала. Заявку можно отменить до 9 октября.`,
    confirm: "Подать заявку",
    recorded: (bonds) => `Заявка подана: ${bonds} облигаций. Отменить можно до 9 октября.`,
    deadline: "Заявки до 9 октября:",
  },
  ar: {
    panel: "عرض البيع في 15 أكتوبر",
    request: "تقديم طلب الاسترداد",
    title: ["استرداد ", " في العرض؟"],
    body: (bonds) => `ستُعرض ${bonds} سندات على المُصدر بنسبة 100٪ من القيمة الاسمية. يمكنك إلغاء الطلب حتى 9 أكتوبر.`,
    confirm: "تقديم الطلب",
    recorded: (bonds) => `تم تقديم الطلب: ${bonds} سندات. يمكنك الإلغاء حتى 9 أكتوبر.`,
    deadline: "تُقبل الطلبات حتى 9 أكتوبر:",
  },
};

function useWords() {
  const f = useStoaFormat();
  const lang = f.locale.startsWith("ar") ? "ar" : f.locale.startsWith("ru") ? "ru" : "en";
  return { f, w: WORDS[lang] };
}

function Offer({ requested = false, left = 3 }: { requested?: boolean; left?: number }) {
  const { f, w } = useWords();
  const [isRequested, setRequested] = useState(requested);
  const bonds = f.integer(40);
  return (
    <Panel title={f.digits(w.panel)}>
      <CancellableRequest
        isRequested={isRequested}
        isClosed={left < 0}
        requestLabel={w.request}
        confirmTitle={
          <>
            {w.title[0]}
            <Ltr>{ISSUE}</Ltr>
            {w.title[1]}
          </>
        }
        confirmLabel={w.confirm}
        onRequest={() => setRequested(true)}
        recordedText={f.digits(w.recorded(bonds))}
        onCancel={() => setRequested(false)}
        deadline={
          <>
            {f.digits(w.deadline)} <Countdown left={left} unit="workingDays" warnAt={3} />
          </>
        }
      >
        <p>{f.digits(w.body(bonds))}</p>
      </CancellableRequest>
    </Panel>
  );
}

/** A redemption at a put offer, with its deadline and the working days
 * left. Request opens a confirmation; once it is confirmed, what was
 * recorded stands beside Cancel, which takes the focus; Cancel brings the
 * request button back, with the focus on it. */
export const PutOffer: StoryObj = { render: () => <Offer /> };

/** A request already recorded: what was recorded, and Cancel, described
 * by it and by the deadline. */
export const Recorded: StoryObj = { render: () => <Offer requested /> };

/** After the deadline: a sentence in place of the buttons, the locale's
 * own by default. */
export const Closed: StoryObj = { render: () => <Offer left={-1} /> };
