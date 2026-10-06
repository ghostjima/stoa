// The words of the dense screen in the preview frames, in English, Russian
// and Arabic. Stoa's components bring their own words (table headers, side
// words, the ladder's markers); these are the screen's: panel titles,
// field labels, buttons and the text alternatives the screen passes in.
// Numbers are not here: they are formatted by the frame's locale.

export type Language = "en" | "ru" | "ar";

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "ru", label: "RU" },
  { id: "ar", label: "AR" },
];

/** The React Aria locale of a frame, from its language and its direction.
 *
 * React Aria takes the layout direction from the locale, not from `dir`,
 * so a slider or a tab list in a frame whose language and direction
 * disagree (Arabic left to right, English or Russian right to left) would
 * run the wrong way. A script subtag states the direction: Latin and
 * Cyrillic script are left to right, Arabic script right to left. Arabic
 * also states its numbering system, because "ar" alone formats with Latin
 * digits in current ICU data. Stoa's words follow the language subtag
 * either way. */
export function localeFor(language: Language, dir: "ltr" | "rtl"): string {
  if (language === "ar") return dir === "rtl" ? "ar-u-nu-arab" : "ar-Latn-u-nu-arab";
  if (language === "ru") return dir === "rtl" ? "ru-Arab" : "ru-RU";
  return dir === "rtl" ? "en-Arab" : "en-US";
}

export type ScreenText = {
  orderBook: string;
  orderBookLabel: string;
  order: string;
  side: string;
  buy: string;
  sell: string;
  limitPrice: string;
  /** The tick size, with the number already in the frame's digits. */
  tick: (size: string) => string;
  quantity: string;
  send: string;
  clear: string;
  marketable: string;
  liquidity: string;
  liquidityLabel: string;
  liquidityDescription: string;
  replayTime: string;
  trades: string;
  tradesView: string;
  tape: string;
  tapeCaption: string;
  summary: string;
  summaryCaption: string;
  mid: string;
  tradeCount: string;
  frame: string;
};

export const SCREEN_TEXT: Record<Language, ScreenText> = {
  en: {
    orderBook: "Order book",
    orderBookLabel: "Order book, 12 levels per side",
    order: "Order",
    side: "Side",
    buy: "Buy",
    sell: "Sell",
    limitPrice: "Limit price",
    tick: (size) => `Tick ${size}`,
    quantity: "Quantity",
    send: "Send",
    clear: "Clear",
    marketable: "Marketable",
    liquidity: "Displayed liquidity",
    liquidityLabel: "Displayed liquidity over the replay window",
    liquidityDescription: "Bids below the midpoint, asks above; darker cells hold more shares.",
    replayTime: "Replay time",
    trades: "Trades",
    tradesView: "Trades view",
    tape: "Tape",
    tapeCaption: "Recent trades, newest first",
    summary: "Summary",
    summaryCaption: "Market summary",
    mid: "Mid",
    tradeCount: "Trades",
    frame: "Frame",
  },
  ru: {
    orderBook: "Стакан",
    orderBookLabel: "Стакан, 12 уровней с каждой стороны",
    order: "Заявка",
    side: "Направление",
    buy: "Покупка",
    sell: "Продажа",
    limitPrice: "Лимитная цена",
    tick: (size) => `Шаг цены ${size}`,
    quantity: "Количество",
    send: "Отправить",
    clear: "Очистить",
    marketable: "Исполнима сразу",
    liquidity: "Видимая ликвидность",
    liquidityLabel: "Видимая ликвидность за окно повтора",
    liquidityDescription: "Покупки ниже средней цены, продажи выше; в более тёмных ячейках больше бумаг.",
    replayTime: "Время повтора",
    trades: "Сделки",
    tradesView: "Вид сделок",
    tape: "Лента",
    tapeCaption: "Последние сделки, новые сверху",
    summary: "Сводка",
    summaryCaption: "Сводка по рынку",
    mid: "Средняя цена",
    tradeCount: "Сделки",
    frame: "Кадр",
  },
  ar: {
    orderBook: "دفتر الأوامر",
    orderBookLabel: "دفتر الأوامر، ١٢ مستوى لكل جانب",
    order: "أمر",
    side: "الاتجاه",
    buy: "شراء",
    sell: "بيع",
    limitPrice: "السعر المحدد",
    tick: (size) => `وحدة السعر ${size}`,
    quantity: "الكمية",
    send: "إرسال",
    clear: "مسح",
    marketable: "قابل للتنفيذ",
    liquidity: "السيولة المعروضة",
    liquidityLabel: "السيولة المعروضة خلال نافذة الإعادة",
    liquidityDescription: "أوامر الشراء تحت السعر الأوسط وأوامر البيع فوقه، والخلايا الأغمق تحمل أسهماً أكثر.",
    replayTime: "وقت الإعادة",
    trades: "الصفقات",
    tradesView: "عرض الصفقات",
    tape: "الشريط",
    tapeCaption: "أحدث الصفقات، الأحدث أولاً",
    summary: "الملخص",
    summaryCaption: "ملخص السوق",
    mid: "السعر الأوسط",
    tradeCount: "الصفقات",
    frame: "الإطار",
  },
};

const LATIN = "0123456789";
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** Each language's decimal separator, as its locale writes it. */
const DECIMAL: Record<Language, string> = { en: ".", ru: ",", ar: "٫" };

/** A typed number rewritten from one language's digits and decimal
 * separator into another's, so a field keeps its value when the frame's
 * language changes. Only the digits and the decimal separator move;
 * anything else typed stays as it was. */
export function retypeDigits(text: string, from: Language, to: Language): string {
  if (from === to) return text;
  const latin = text.replace(/[٠-٩]/g, (d) => LATIN[ARABIC_INDIC.indexOf(d)]!).replaceAll(DECIMAL[from], DECIMAL[to]);
  return to === "ar" ? latin.replace(/[0-9]/g, (d) => ARABIC_INDIC[LATIN.indexOf(d)]!) : latin;
}
