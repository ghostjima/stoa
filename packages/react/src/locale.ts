// Stoa's own words and number formats, by locale. The locale is React
// Aria's (`I18nProvider` above, `useLocale` here), so one provider sets the
// language of Stoa's text, the digits of its numbers and React Aria's own
// behaviour together.
//
// Digits follow the locale's numbering system, which a locale tag can
// state: "ar" alone formats with Latin digits in current ICU data, and
// "ar-u-nu-arab" with Arabic-Indic ones.
import { useMemo } from "react";
import { useLocale } from "react-aria-components";

export type StoaMessages = {
  time: string;
  side: string;
  price: string;
  size: string;
  buy: string;
  sell: string;
  /** The side of a ladder row as a word or a letter, so it is never told
   * by colour alone. */
  bidMark: string;
  askMark: string;
  bookEmpty: string;
  /** A trades table with no trades yet. */
  noTrades: string;
  /** A heatmap with nothing to draw. */
  noLiquidity: string;
  bestBid: (price: string, size: string) => string;
  bestAsk: (price: string, size: string) => string;
  noBids: string;
  noAsks: string;
  spread: (value: string) => string;
  /** One sentence from the bid part, the ask part and the spread, if any. */
  book: (bid: string, ask: string, spread: string | null) => string;
  /** What a loading placeholder says to assistive technology. */
  loading: string;
  /** The direction of these words' script. A sentence built from parts
   * (a progress bar's "1.2 MB of 4.8 MB") is laid out in it, whatever the
   * direction of the page around it: English words in a right-to-left
   * frame would otherwise swap the parts. */
  direction: "ltr" | "rtl";
  /** A progress bar's value as an amount out of a total ("1.2 MB of 4.8 MB"). */
  progressOf: (value: string, max: string) => string;
  /** The tone of a callout or a toast as a word, read before its text, so
   * the tone is never told by colour alone. */
  toneInfo: string;
  tonePositive: string;
  toneWarning: string;
  toneNegative: string;
  /** The name of a button that closes a callout or a toast. */
  dismiss: string;
  /** The name of the region that holds the toasts. */
  notifications: string;
  /** The link that moves focus past the header to the main content. */
  skipToMain: string;
  /** The theme switch: its label and its two options. */
  theme: string;
  themeLight: string;
  themeDark: string;
  /** The language switch's label. */
  language: string;
  /** The space bar, in a shortcut's keys; the other keys keep the names
   * printed on them. */
  keySpace: string;
  /** The theme switch's first option: no theme chosen, follow the
   * system's light or dark setting. */
  themeSystem: string;
  // Overlays, lists and content.
  /** The close button of a dialog or a sheet. */
  close: string;
  /** The safe action of a confirmation. */
  cancel: string;
  copy: string;
  /** Announced, politely, after the text was copied. */
  copied: string;
  copyFailed: string;
  /** A log's control that scrolls back to its newest line, shown while
   * the reader has scrolled away from it. */
  jumpToLatest: string;
  /** Names of an item's own buttons in a reorderable list. */
  moveUp: (item: string) => string;
  moveDown: (item: string) => string;
  remove: (item: string) => string;
  /** Announced after an item moved; position and total in the locale's
   * digits. */
  moved: (item: string, position: string, total: string) => string;
  removed: (item: string) => string;
  /** A reorderable list with no items. */
  listEmpty: string;
  /** The word for each step status, shown beside its symbol (StepList's
   * `StepStatus` is this record's keys). */
  stepStatus: Record<"waiting" | "running" | "done" | "awaiting" | "skipped" | "undone" | "error", string>;
  // Table and charts.
  /** A line chart with nothing to draw. */
  noChartData: string;
  /** The note under a chart whose value axis leaves zero out. */
  axisNotZero: (from: string, to: string) => string;
  /** The summary row that opens a chart's data table. */
  dataTable: string;
  /** One series in a line chart's text alternative: its first and last
   * values with where they fall on the time axis, and its range. */
  seriesSummary: (name: string, first: string, firstAt: string, last: string, lastAt: string, low: string, high: string) => string;
  /** The series sentences of a chart's text alternative, joined. */
  seriesList: (parts: string[]) => string;
  /** Which way time runs on a chart's time axis. */
  timeLeftToRight: string;
  timeRightToLeft: string;
  /** Kinds of event on an event strip. */
  coupon: string;
  amortisation: string;
  offer: string;
  maturity: string;
  /** A kind of event that happens more than once, with its count. */
  eventCount: (kind: string, count: string) => string;
  /** A kind of event that happens once, with its date. */
  eventOn: (kind: string, date: string) => string;
  /** An event strip's summary: its range and one part per kind. */
  eventSummary: (from: string, to: string, parts: string[]) => string;
  /** One event in an event strip's list alternative. */
  eventItem: (date: string, kind: string) => string;
  /** An event strip with no events. */
  noEvents: string;
  /** DataGrid: the name of the checkbox that selects every row. */
  gridSelectAll: string;
  /** DataGrid: the name of a row's checkbox, from the row's first value. */
  gridSelectRow: (row: string) => string;
  /** DataGrid: announced after a header sorts its column. */
  gridSortedAscending: (column: string) => string;
  gridSortedDescending: (column: string) => string;
  gridSortCleared: string;
  /** DataGrid: the row count, and the selected count when there is one,
   * both already in the locale's digits; announced when either changes. */
  gridCounts: (rows: string, selected: string | null) => string;
  /** DataGrid: what an empty grid says, unless the caller gives its own. */
  gridNoRows: string;
  /** DataGrid: announced while rows load. */
  gridLoading: string;
};

const EN: StoaMessages = {
  time: "Time",
  side: "Side",
  price: "Price",
  size: "Size",
  buy: "Buy",
  sell: "Sell",
  bidMark: "B",
  askMark: "A",
  bookEmpty: "The book is empty.",
  noTrades: "No trades yet.",
  noLiquidity: "No liquidity to show.",
  bestBid: (price, size) => `best bid ${price} for ${size}`,
  bestAsk: (price, size) => `best ask ${price} for ${size}`,
  noBids: "no bids",
  noAsks: "no asks",
  spread: (value) => `spread ${value}`,
  book: (bid, ask, spread) => `${bid}, ${ask}${spread ? `, ${spread}` : ""}.`,
  loading: "Loading…",
  direction: "ltr",
  progressOf: (value, max) => `${value} of ${max}`,
  toneInfo: "Note",
  tonePositive: "Success",
  toneWarning: "Warning",
  toneNegative: "Error",
  dismiss: "Dismiss",
  notifications: "Notifications",
  skipToMain: "Skip to main content",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  language: "Language",
  keySpace: "Space",
  themeSystem: "System",
  close: "Close",
  cancel: "Cancel",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
  jumpToLatest: "Jump to latest",
  moveUp: (item) => `Move up: ${item}`,
  moveDown: (item) => `Move down: ${item}`,
  remove: (item) => `Remove: ${item}`,
  moved: (item, position, total) => `${item} moved to position ${position} of ${total}.`,
  removed: (item) => `${item} removed.`,
  listEmpty: "No items.",
  stepStatus: {
    waiting: "Waiting",
    running: "Running",
    done: "Done",
    awaiting: "Awaiting decision",
    skipped: "Skipped",
    undone: "Undone",
    error: "Error",
  },
  noChartData: "No data to show.",
  axisNotZero: (from, to) => `The value axis does not start at zero: it shows ${from} to ${to}.`,
  dataTable: "Data table",
  seriesSummary: (name, first, firstAt, last, lastAt, low, high) =>
    `${name}: from ${first} on ${firstAt} to ${last} on ${lastAt}, low ${low}, high ${high}`,
  seriesList: (parts) => `${parts.join("; ")}.`,
  timeLeftToRight: "Time runs from left to right.",
  timeRightToLeft: "Time runs from right to left.",
  coupon: "Coupon",
  amortisation: "Amortisation",
  offer: "Offer",
  maturity: "Maturity",
  eventCount: (kind, count) => `${kind}: ${count}`,
  eventOn: (kind, date) => `${kind} on ${date}`,
  eventSummary: (from, to, parts) => `From ${from} to ${to}: ${parts.join("; ")}.`,
  eventItem: (date, kind) => `${date}: ${kind}`,
  noEvents: "No events to show.",
  gridSelectAll: "Select all rows",
  gridSelectRow: (row) => `Select row ${row}`,
  gridSortedAscending: (column) => `Sorted by ${column}, ascending`,
  gridSortedDescending: (column) => `Sorted by ${column}, descending`,
  gridSortCleared: "Sort cleared",
  gridCounts: (rows, selected) => `${rows} ${rows === "1" ? "row" : "rows"}${selected ? `, ${selected} selected` : ""}.`,
  gridNoRows: "No rows to show.",
  gridLoading: "Loading rows",
};

const AR: StoaMessages = {
  time: "الوقت",
  side: "الاتجاه",
  price: "السعر",
  size: "الحجم",
  buy: "شراء",
  sell: "بيع",
  bidMark: "شراء",
  askMark: "بيع",
  bookEmpty: "دفتر الأوامر فارغ.",
  noTrades: "لا صفقات بعد.",
  noLiquidity: "لا سيولة لعرضها.",
  bestBid: (price, size) => `أفضل سعر شراء ${price} بكمية ${size}`,
  bestAsk: (price, size) => `أفضل سعر بيع ${price} بكمية ${size}`,
  noBids: "لا أوامر شراء",
  noAsks: "لا أوامر بيع",
  spread: (value) => `الفارق ${value}`,
  book: (bid, ask, spread) => `${bid}، ${ask}${spread ? `، ${spread}` : ""}.`,
  loading: "جارٍ التحميل…",
  direction: "rtl",
  progressOf: (value, max) => `${value} من ${max}`,
  toneInfo: "ملاحظة",
  tonePositive: "تم بنجاح",
  toneWarning: "تحذير",
  toneNegative: "خطأ",
  dismiss: "إغلاق",
  notifications: "الإشعارات",
  skipToMain: "انتقل إلى المحتوى الرئيسي",
  theme: "المظهر",
  themeLight: "فاتح",
  themeDark: "داكن",
  language: "اللغة",
  keySpace: "مسافة",
  themeSystem: "النظام",
  close: "إغلاق",
  cancel: "إلغاء",
  copy: "نسخ",
  copied: "تم النسخ",
  copyFailed: "تعذر النسخ",
  jumpToLatest: "الانتقال إلى الأحدث",
  moveUp: (item) => `تحريك للأعلى: ${item}`,
  moveDown: (item) => `تحريك للأسفل: ${item}`,
  remove: (item) => `إزالة: ${item}`,
  moved: (item, position, total) => `نُقل ${item} إلى الموضع ${position} من ${total}.`,
  removed: (item) => `أزيل ${item}.`,
  listEmpty: "لا عناصر.",
  stepStatus: {
    waiting: "في الانتظار",
    running: "قيد التنفيذ",
    done: "تم",
    awaiting: "بانتظار قرار",
    skipped: "تم التخطي",
    undone: "تم التراجع",
    error: "خطأ",
  },
  noChartData: "لا بيانات لعرضها.",
  axisNotZero: (from, to) => `محور القيم لا يبدأ من الصفر: يعرض من ${from} إلى ${to}.`,
  dataTable: "جدول البيانات",
  seriesSummary: (name, first, firstAt, last, lastAt, low, high) =>
    `${name}: من ${first} في ${firstAt} إلى ${last} في ${lastAt}، الأدنى ${low}، الأعلى ${high}`,
  seriesList: (parts) => `${parts.join("؛ ")}.`,
  timeLeftToRight: "يسير الزمن من اليسار إلى اليمين.",
  timeRightToLeft: "يسير الزمن من اليمين إلى اليسار.",
  coupon: "كوبون",
  amortisation: "إطفاء جزئي",
  offer: "عرض إعادة الشراء",
  maturity: "الاستحقاق",
  eventCount: (kind, count) => `${kind}: ${count}`,
  eventOn: (kind, date) => `${kind} في ${date}`,
  eventSummary: (from, to, parts) => `من ${from} إلى ${to}: ${parts.join("؛ ")}.`,
  eventItem: (date, kind) => `${date}: ${kind}`,
  noEvents: "لا أحداث لعرضها.",
  gridSelectAll: "تحديد كل الصفوف",
  gridSelectRow: (row) => `تحديد الصف ${row}`,
  gridSortedAscending: (column) => `مرتب حسب ${column} تصاعديًا`,
  gridSortedDescending: (column) => `مرتب حسب ${column} تنازليًا`,
  gridSortCleared: "أُلغي الترتيب",
  gridCounts: (rows, selected) => `الصفوف: ${rows}${selected ? `، المحددة: ${selected}` : ""}.`,
  gridNoRows: "لا صفوف لعرضها.",
  gridLoading: "جارٍ تحميل الصفوف",
};

const RU: StoaMessages = {
  time: "Время",
  side: "Сторона",
  price: "Цена",
  size: "Объём",
  buy: "Покупка",
  sell: "Продажа",
  bidMark: "Пок",
  askMark: "Прод",
  bookEmpty: "Стакан пуст.",
  noTrades: "Сделок пока нет.",
  noLiquidity: "Ликвидности для показа нет.",
  bestBid: (price, size) => `лучшая цена покупки ${price}, объём ${size}`,
  bestAsk: (price, size) => `лучшая цена продажи ${price}, объём ${size}`,
  noBids: "заявок на покупку нет",
  noAsks: "заявок на продажу нет",
  spread: (value) => `спред ${value}`,
  // The bid and ask parts carry their own commas, so semicolons join them.
  book: (bid, ask, spread) => `${bid}; ${ask}${spread ? `; ${spread}` : ""}.`,
  loading: "Загрузка…",
  direction: "ltr",
  progressOf: (value, max) => `${value} из ${max}`,
  toneInfo: "Примечание",
  tonePositive: "Готово",
  toneWarning: "Предупреждение",
  toneNegative: "Ошибка",
  dismiss: "Закрыть",
  notifications: "Уведомления",
  skipToMain: "Перейти к основному содержимому",
  theme: "Тема",
  themeLight: "Светлая",
  themeDark: "Тёмная",
  language: "Язык",
  keySpace: "Пробел",
  themeSystem: "Системная",
  close: "Закрыть",
  cancel: "Отмена",
  copy: "Копировать",
  copied: "Скопировано",
  copyFailed: "Не удалось скопировать",
  jumpToLatest: "К последним строкам",
  moveUp: (item) => `Переместить выше: ${item}`,
  moveDown: (item) => `Переместить ниже: ${item}`,
  remove: (item) => `Удалить: ${item}`,
  moved: (item, position, total) => `${item}: позиция ${position} из ${total}.`,
  removed: (item) => `${item}: удалено.`,
  listEmpty: "Элементов нет.",
  stepStatus: {
    waiting: "Ожидает",
    running: "Выполняется",
    done: "Готово",
    awaiting: "Ждёт решения",
    skipped: "Пропущено",
    undone: "Отменено",
    error: "Ошибка",
  },
  noChartData: "Данных для показа нет.",
  axisNotZero: (from, to) => `Ось значений начинается не с нуля: от ${from} до ${to}.`,
  dataTable: "Таблица данных",
  seriesSummary: (name, first, firstAt, last, lastAt, low, high) =>
    `${name}: от ${first} (${firstAt}) до ${last} (${lastAt}), минимум ${low}, максимум ${high}`,
  seriesList: (parts) => `${parts.join("; ")}.`,
  timeLeftToRight: "Время идёт слева направо.",
  timeRightToLeft: "Время идёт справа налево.",
  coupon: "Купон",
  amortisation: "Амортизация",
  offer: "Оферта",
  maturity: "Погашение",
  eventCount: (kind, count) => `${kind}: ${count}`,
  eventOn: (kind, date) => `${kind}: ${date}`,
  eventSummary: (from, to, parts) => `С ${from} по ${to}: ${parts.join("; ")}.`,
  eventItem: (date, kind) => `${date}: ${kind}`,
  noEvents: "Событий для показа нет.",
  gridSelectAll: "Выбрать все строки",
  gridSelectRow: (row) => `Выбрать строку ${row}`,
  gridSortedAscending: (column) => `Сортировка по столбцу ${column}, по возрастанию`,
  gridSortedDescending: (column) => `Сортировка по столбцу ${column}, по убыванию`,
  gridSortCleared: "Сортировка снята",
  gridCounts: (rows, selected) => `Строк: ${rows}${selected ? `, выбрано: ${selected}` : ""}.`,
  gridNoRows: "Строк для показа нет.",
  gridLoading: "Загрузка строк",
};

/** A value set into a sentence, as a first-strong isolate (FSI ... PDI):
 * it takes the direction of its own first letter, and the sentence's
 * direction does not split it. "1.8 MB" or "-0.5%" inside an Arabic
 * sentence would otherwise be reordered by the bidi algorithm, its sign
 * or unit drawn on the wrong side of its number. */
export function isolate(text: string): string {
  return `\u2068${text}\u2069`;
}

/** Stoa's words for a locale: Arabic for any "ar" tag, Russian for any
 * "ru" tag, English otherwise. */
export function messagesFor(locale: string): StoaMessages {
  const language = locale.split("-")[0]?.toLowerCase();
  return language === "ar" ? AR : language === "ru" ? RU : EN;
}

export type StoaFormat = {
  locale: string;
  messages: StoaMessages;
  /** A number with a fixed count of decimals, in the locale's digits. */
  decimal(value: number, fractionDigits: number): string;
  /** A whole number with the locale's grouping and digits. */
  integer(value: number): string;
  /** A preformatted string (a time of day, for example) with its Latin
   * digits rewritten in the locale's, and the decimal point of each
   * decimal number ("17.200", "2.5") in the locale's decimal separator.
   * Any other full stop stays: one after a word ("сент."), and those of a
   * dotted sequence of numbers ("04.09.2026", "1.2.3"). */
  digits(text: string): string;
};

const formats = new Map<string, StoaFormat>();

/** A decimal number in Latin digits: digits, one full stop, digits, and
 * not part of a longer dotted sequence. */
const DECIMAL_NUMBER = /(?<![\d.])\d+\.\d+(?!\.?\d)/g;

/** The formats for a locale, built once per locale. */
export function stoaFormat(locale: string): StoaFormat {
  const cached = formats.get(locale);
  if (cached) return cached;
  const decimals = new Map<number, Intl.NumberFormat>();
  const decimalFormat = (fractionDigits: number) => {
    let format = decimals.get(fractionDigits);
    if (!format) {
      format = new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
      decimals.set(fractionDigits, format);
    }
    return format;
  };
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const plain = new Intl.NumberFormat(locale, { useGrouping: false });
  const digitMap = new Map<string, string>(Array.from({ length: 10 }, (_, d) => [String(d), plain.format(d)]));
  const point = decimalFormat(1).formatToParts(1.5).find((part) => part.type === "decimal")?.value ?? ".";
  const format: StoaFormat = {
    locale,
    messages: messagesFor(locale),
    decimal: (value, fractionDigits) => decimalFormat(fractionDigits).format(value),
    integer: (value) => integer.format(value),
    digits: (text) =>
      text.replace(DECIMAL_NUMBER, (number) => number.replace(".", point)).replace(/[0-9]/g, (digit) => digitMap.get(digit) ?? digit),
  };
  formats.set(locale, format);
  return format;
}

/** The formats for the locale React Aria is set to. */
export function useStoaFormat(): StoaFormat {
  const { locale } = useLocale();
  return useMemo(() => stoaFormat(locale), [locale]);
}
