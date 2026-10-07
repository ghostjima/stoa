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

/** The unit a deadline's time left is counted in: working days (by the
 * caller's own calendar), calendar days or hours. */
export type DeadlineUnit = "workingDays" | "days" | "hours";

/** A count's plural category in the locale (Intl.PluralRules), which
 * picks the word's form: "1 рабочий день", "2 рабочих дня", "5 рабочих
 * дней". */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/** How much a finding matters, most severe first: an error to fix, a
 * warning for a person to weigh, a note. */
export type FindingSeverity = "error" | "warning" | "info";

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
  /** FilterBar: the word for the filters, on the button that opens them
   * on a narrow screen and as the sheet's title. */
  filters: string;
  /** FilterBar: read after "Filters" on that button, with how many are
   * on. */
  filtersOn: (count: string) => string;
  /** FilterBar: the button that turns every filter off and empties the
   * search. */
  clearAll: string;
  /** FilterBar: how many items the filters leave, out of all of them. */
  filterShown: (shown: string, total: string) => string;
  /** FilterBar: the empty state when nothing matches, and what to do. */
  noMatches: string;
  noMatchesHint: string;
  /** FilterBar: the button that closes the filters sheet, with how many
   * items they leave. */
  showResults: (count: string) => string;
  /** The word for each step status, shown beside its symbol (StepList's
   * `StepStatus` is this record's keys). */
  stepStatus: Record<"waiting" | "running" | "done" | "awaiting" | "skipped" | "notRun" | "undone" | "error", string>;
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
  /** Countdown: time left before a deadline, the count already in the
   * locale's digits and `plural` its plural category. */
  deadlineLeft: (count: string, unit: DeadlineUnit, plural: PluralCategory) => string;
  /** Countdown: how long ago a deadline passed. */
  deadlineOverdue: (count: string, unit: DeadlineUnit, plural: PluralCategory) => string;
  /** Countdown: a deadline that falls now: today in days, this hour in
   * hours. */
  deadlineDue: (unit: DeadlineUnit) => string;
  /** DerivationTable: its column headers. */
  derivationStep: string;
  derivationFormula: string;
  derivationValue: string;
  derivationSource: string;
  /** DerivationTable: a source's revision ("revision 2025-12-01"). */
  derivationRevision: (revision: string) => string;
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
  /** DataGridColumnChooser: the button that opens it and its title. */
  gridColumns: string;
  /** DataGridColumnChooser: the name of its list, which says what the
   * order and the check boxes are. */
  gridColumnsList: string;
  /** DataGridSelectionBar: its name, and how many rows are selected. */
  gridSelection: string;
  gridSelected: (count: string) => string;
  /** DataGridSelectionBar: the button that unselects every row. */
  gridClearSelection: string;
  // Timeline.
  /** Timeline: what an empty timeline says, unless the caller gives its
   * own words. */
  timelineEmpty: string;
  /** Timeline: read before an emphasised entry (a deadline still to
   * come), whose start bar and symbol are drawn, not read. */
  timelineEmphasis: string;
  // DetailHeader.
  /** DetailHeader: the button that goes back to where the record was
   * opened from, unless the caller names it. */
  back: string;
  // TextArea.
  /** TextArea: the count of characters used, read as part of the field's
   * description; both counts in the locale's digits. */
  textCount: (used: string, max: string) => string;
  /** TextArea: the characters left, announced once they are few; `count`
   * in the locale's digits and `plural` its plural category. */
  textLeft: (count: string, plural: PluralCategory) => string;
  // Letter.
  /** Letter: the line above the grounds the letter cites. */
  letterGrounds: string;
  // FindingsList.
  /** FindingsList: a finding's severity as a word, beside its symbol. */
  findingSeverity: Record<FindingSeverity, string>;
  /** FindingsList: the heading of a severity's group, with how many
   * findings it holds, already in the locale's digits. */
  findingGroup: (severity: FindingSeverity, count: string) => string;
  /** FindingsList: the word before a finding's source. */
  findingSource: string;
  /** FindingsList: what an empty list says, unless the caller gives its
   * own words. */
  findingsNone: string;
  // TextDiff.
  /** TextDiff: read at the start and at the end of an insertion and of a
   * deletion, which are drawn underlined and struck through. */
  diffInserted: string;
  diffInsertedEnd: string;
  diffDeleted: string;
  diffDeletedEnd: string;
  /** TextDiff: the summary. `percent` is the share of changed characters
   * (deleted plus inserted, over the characters of both texts), the
   * counts are in the locale's digits. */
  diffSummary: (percent: string, deleted: string, inserted: string, total: string) => string;
  /** TextDiff: the summary of two texts that are the same. */
  diffNone: string;
  /** TextDiff: the summary row of the list of changes, with their count. */
  diffChanges: (count: string) => string;
  /** TextDiff: what each item of the list of changes did. */
  diffKind: Record<"replaced" | "deleted" | "inserted", string>;
  /** TextDiff: a change of spaces or line breaks only, which has no
   * letters to show. */
  diffWhitespace: string;
  // ScatterChart.
  /** ScatterChart's text alternative: how many points it draws, then one
   * part per category (`scatterCount`). */
  scatterSummary: (total: string, parts: string[]) => string;
  /** A category of points with its count. */
  scatterCount: (category: string, count: string) => string;
  /** The range an axis spans, from its lowest to its highest value, or
   * from its first category to its last. */
  scatterRange: (axis: string, from: string, to: string) => string;
  /** Which way values grow along a scatter chart's horizontal axis. */
  scatterXLeftToRight: string;
  scatterXRightToLeft: string;
  /** How the keyboard moves between the points, read with the chart. */
  scatterKeys: string;
  /** Read when a point is focused or hovered: the caller's label for it,
   * its category, and its place in the order the arrow keys walk. */
  scatterActive: (label: string, category: string, position: string, total: string) => string;
  /** Headers of a scatter chart's data table: the point and its category. */
  scatterPoint: string;
  scatterCategory: string;
  // SourceNote.
  /** SourceNote: read before the source's tag, not drawn ("Source:"). */
  sourceNoteLabel: string;
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
  filters: "Filters",
  filtersOn: (count) => `, ${count} on`,
  clearAll: "Clear all",
  filterShown: (shown, total) => `${shown} of ${total} shown`,
  noMatches: "Nothing matches the filters.",
  noMatchesHint: "Change the search or clear the filters.",
  showResults: (count) => `Show results (${count})`,
  stepStatus: {
    waiting: "Waiting",
    running: "Running",
    done: "Done",
    awaiting: "Awaiting decision",
    skipped: "Skipped",
    notRun: "Not run",
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
  deadlineLeft: (count, unit, plural) =>
    `${count} ${{ workingDays: plural === "one" ? "working day" : "working days", days: plural === "one" ? "day" : "days", hours: plural === "one" ? "hour" : "hours" }[unit]} left`,
  deadlineOverdue: (count, unit, plural) =>
    `${count} ${{ workingDays: plural === "one" ? "working day" : "working days", days: plural === "one" ? "day" : "days", hours: plural === "one" ? "hour" : "hours" }[unit]} overdue`,
  deadlineDue: (unit) => (unit === "hours" ? "Due within the hour" : "Due today"),
  derivationStep: "Step",
  derivationFormula: "Formula",
  derivationValue: "Value",
  derivationSource: "Source",
  derivationRevision: (revision) => `revision ${revision}`,
  gridSelectAll: "Select all rows",
  gridSelectRow: (row) => `Select row ${row}`,
  gridSortedAscending: (column) => `Sorted by ${column}, ascending`,
  gridSortedDescending: (column) => `Sorted by ${column}, descending`,
  gridSortCleared: "Sort cleared",
  gridCounts: (rows, selected) => `${rows} ${rows === "1" ? "row" : "rows"}${selected ? `, ${selected} selected` : ""}.`,
  gridNoRows: "No rows to show.",
  gridLoading: "Loading rows",
  gridColumns: "Columns",
  gridColumnsList: "Columns: shown when checked, in this order",
  gridSelection: "Selection",
  gridSelected: (count) => `${count} selected`,
  gridClearSelection: "Clear selection",
  // Timeline.
  timelineEmpty: "Nothing has happened yet.",
  timelineEmphasis: "Important:",
  // DetailHeader.
  back: "Back",
  // TextArea.
  textCount: (used, max) => `Characters: ${used} of ${max}`,
  textLeft: (count, plural) => `${count} ${plural === "one" ? "character" : "characters"} left`,
  // Letter.
  letterGrounds: "Grounds cited",
  // FindingsList.
  findingSeverity: { error: "Error", warning: "Warning", info: "Note" },
  findingGroup: (severity, count) => `${{ error: "Errors", warning: "Warnings", info: "Notes" }[severity]}: ${count}`,
  findingSource: "Source",
  findingsNone: "No findings.",
  // TextDiff.
  diffInserted: "inserted:",
  diffInsertedEnd: "end of insertion",
  diffDeleted: "deleted:",
  diffDeletedEnd: "end of deletion",
  diffSummary: (percent, deleted, inserted, total) =>
    `${isolate(percent)} of the characters changed: ${deleted} deleted and ${inserted} inserted, out of ${total} in the two texts together.`,
  diffNone: "No changes: the texts are the same.",
  diffChanges: (count) => `Changes: ${count}`,
  diffKind: { replaced: "Replaced", deleted: "Deleted", inserted: "Inserted" },
  diffWhitespace: "spaces or line breaks",
  scatterSummary: (total, parts) => `Points: ${total}; ${parts.join("; ")}.`,
  scatterCount: (category, count) => `${category}: ${count}`,
  scatterRange: (axis, from, to) => `${axis}: from ${from} to ${to}.`,
  scatterXLeftToRight: "Values on the horizontal axis grow from left to right.",
  scatterXRightToLeft: "Values on the horizontal axis grow from right to left.",
  scatterKeys: "Arrow keys move from point to point, Home and End go to the first and the last, Escape clears.",
  scatterActive: (label, category, position, total) => `${label} (${category}), point ${position} of ${total}`,
  scatterPoint: "Point",
  scatterCategory: "Category",
  // SourceNote.
  sourceNoteLabel: "Source:",
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
  filters: "عوامل التصفية",
  filtersOn: (count) => `، المفعّلة: ${count}`,
  clearAll: "مسح الكل",
  filterShown: (shown, total) => `المعروض ${shown} من ${total}`,
  noMatches: "لا شيء يطابق عوامل التصفية.",
  noMatchesHint: "غيّر البحث أو امسح عوامل التصفية.",
  showResults: (count) => `عرض النتائج (${count})`,
  stepStatus: {
    waiting: "في الانتظار",
    running: "قيد التنفيذ",
    done: "تم",
    awaiting: "بانتظار قرار",
    skipped: "تم التخطي",
    notRun: "لم يُنفَّذ",
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
  // A count before its noun would need the noun's number to agree with
  // it; a label and a colon need none.
  deadlineLeft: (count, unit, _plural) => `${{ workingDays: "أيام العمل المتبقية", days: "الأيام المتبقية", hours: "الساعات المتبقية" }[unit]}: ${count}`,
  deadlineOverdue: (count, unit, _plural) => `${{ workingDays: "أيام عمل التأخير", days: "أيام التأخير", hours: "ساعات التأخير" }[unit]}: ${count}`,
  deadlineDue: (unit) => (unit === "hours" ? "الموعد خلال الساعة" : "الموعد اليوم"),
  derivationStep: "الخطوة",
  derivationFormula: "الصيغة",
  derivationValue: "القيمة",
  derivationSource: "المصدر",
  derivationRevision: (revision) => `المراجعة ${revision}`,
  gridSelectAll: "تحديد كل الصفوف",
  gridSelectRow: (row) => `تحديد الصف ${row}`,
  gridSortedAscending: (column) => `مرتب حسب ${column} تصاعديًا`,
  gridSortedDescending: (column) => `مرتب حسب ${column} تنازليًا`,
  gridSortCleared: "أُلغي الترتيب",
  gridCounts: (rows, selected) => `الصفوف: ${rows}${selected ? `، المحددة: ${selected}` : ""}.`,
  gridNoRows: "لا صفوف لعرضها.",
  gridLoading: "جارٍ تحميل الصفوف",
  gridColumns: "الأعمدة",
  gridColumnsList: "الأعمدة: تظهر المحددة منها بهذا الترتيب",
  gridSelection: "التحديد",
  gridSelected: (count) => `المحدد: ${count}`,
  gridClearSelection: "إلغاء التحديد",
  // Timeline.
  timelineEmpty: "لم يحدث شيء بعد.",
  timelineEmphasis: "مهم:",
  // DetailHeader.
  back: "رجوع",
  // TextArea.
  textCount: (used, max) => `الأحرف: ${used} من ${max}`,
  textLeft: (count, _plural) => `الأحرف المتبقية: ${count}`,
  // Letter.
  letterGrounds: "الأسس المستند إليها",
  // FindingsList.
  findingSeverity: { error: "خطأ", warning: "تحذير", info: "ملاحظة" },
  findingGroup: (severity, count) => `${{ error: "الأخطاء", warning: "التحذيرات", info: "الملاحظات" }[severity]}: ${count}`,
  findingSource: "المصدر",
  findingsNone: "لا توجد ملاحظات.",
  // TextDiff.
  diffInserted: "مضاف:",
  diffInsertedEnd: "نهاية الإضافة",
  diffDeleted: "محذوف:",
  diffDeletedEnd: "نهاية الحذف",
  // Labels and colons, as for deadlines: a count before its noun would
  // need the noun's number to agree with it.
  diffSummary: (percent, deleted, inserted, total) =>
    `نسبة الأحرف المتغيرة: ${isolate(percent)}؛ المحذوفة: ${deleted}؛ المضافة: ${inserted}؛ مجموع أحرف النصين: ${total}.`,
  diffNone: "لا تغييرات: النصان متطابقان.",
  diffChanges: (count) => `التغييرات: ${count}`,
  diffKind: { replaced: "استبدال", deleted: "حذف", inserted: "إضافة" },
  diffWhitespace: "مسافات أو فواصل أسطر",
  scatterSummary: (total, parts) => `النقاط: ${total}؛ ${parts.join("؛ ")}.`,
  scatterCount: (category, count) => `${category}: ${count}`,
  scatterRange: (axis, from, to) => `${axis}: من ${from} إلى ${to}.`,
  scatterXLeftToRight: "تزداد القيم على المحور الأفقي من اليسار إلى اليمين.",
  scatterXRightToLeft: "تزداد القيم على المحور الأفقي من اليمين إلى اليسار.",
  scatterKeys: "تنتقل مفاتيح الأسهم من نقطة إلى أخرى، وينتقل Home وEnd إلى الأولى والأخيرة، ويلغي Escape التحديد.",
  scatterActive: (label, category, position, total) => `${label} (${category})، النقطة ${position} من ${total}`,
  scatterPoint: "النقطة",
  scatterCategory: "الفئة",
  // SourceNote.
  sourceNoteLabel: "المصدر:",
};

/** A Russian unit in the form its count asks for: "1 рабочий день",
 * "2 рабочих дня", "5 рабочих дней"; the same form after "Осталось" and
 * after "на". A fraction takes the "few" form's genitive singular, which
 * Intl reports as "other": "1,5 рабочего дня". */
function ruUnit(unit: DeadlineUnit, plural: PluralCategory): string {
  const forms: Record<DeadlineUnit, Record<"one" | "few" | "many" | "other", string>> = {
    workingDays: { one: "рабочий день", few: "рабочих дня", many: "рабочих дней", other: "рабочего дня" },
    days: { one: "день", few: "дня", many: "дней", other: "дня" },
    hours: { one: "час", few: "часа", many: "часов", other: "часа" },
  };
  const form = plural === "one" || plural === "few" || plural === "many" ? plural : "other";
  return forms[unit][form];
}

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
  filters: "Фильтры",
  filtersOn: (count) => `, включено: ${count}`,
  clearAll: "Сбросить все",
  filterShown: (shown, total) => `Показано ${shown} из ${total}`,
  noMatches: "По этим фильтрам ничего не найдено.",
  noMatchesHint: "Измените поиск или сбросьте фильтры.",
  showResults: (count) => `Показать результаты (${count})`,
  stepStatus: {
    waiting: "Ожидает",
    running: "Выполняется",
    done: "Готово",
    awaiting: "Ждёт решения",
    skipped: "Пропущено",
    notRun: "Не запускалось",
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
  deadlineLeft: (count, unit, plural) => `${plural === "one" ? "Остался" : "Осталось"} ${count} ${ruUnit(unit, plural)}`,
  deadlineOverdue: (count, unit, plural) => `Просрочено на ${count} ${ruUnit(unit, plural)}`,
  deadlineDue: (unit) => (unit === "hours" ? "Срок истекает в течение часа" : "Срок сегодня"),
  derivationStep: "Шаг",
  derivationFormula: "Формула",
  derivationValue: "Значение",
  derivationSource: "Источник",
  derivationRevision: (revision) => `редакция от ${revision}`,
  gridSelectAll: "Выбрать все строки",
  gridSelectRow: (row) => `Выбрать строку ${row}`,
  gridSortedAscending: (column) => `Сортировка по столбцу ${column}, по возрастанию`,
  gridSortedDescending: (column) => `Сортировка по столбцу ${column}, по убыванию`,
  gridSortCleared: "Сортировка снята",
  gridCounts: (rows, selected) => `Строк: ${rows}${selected ? `, выбрано: ${selected}` : ""}.`,
  gridNoRows: "Строк для показа нет.",
  gridLoading: "Загрузка строк",
  gridColumns: "Столбцы",
  gridColumnsList: "Столбцы: отмеченные показаны в этом порядке",
  gridSelection: "Выбор",
  gridSelected: (count) => `Выбрано: ${count}`,
  gridClearSelection: "Снять выбор",
  // Timeline.
  timelineEmpty: "Пока ничего не произошло.",
  timelineEmphasis: "Важно:",
  // DetailHeader.
  back: "Назад",
  // TextArea.
  textCount: (used, max) => `Символов: ${used} из ${max}`,
  textLeft: (count, plural) =>
    `${plural === "one" ? "Остался" : "Осталось"} ${count} ${{ one: "символ", few: "символа", many: "символов", other: "символа" }[plural === "one" || plural === "few" || plural === "many" ? plural : "other"]}`,
  // Letter.
  letterGrounds: "Приведённые основания",
  // FindingsList.
  findingSeverity: { error: "Ошибка", warning: "Предупреждение", info: "Примечание" },
  findingGroup: (severity, count) => `${{ error: "Ошибки", warning: "Предупреждения", info: "Примечания" }[severity]}: ${count}`,
  findingSource: "Источник",
  findingsNone: "Замечаний нет.",
  // TextDiff.
  diffInserted: "вставлено:",
  diffInsertedEnd: "конец вставки",
  diffDeleted: "удалено:",
  diffDeletedEnd: "конец удаления",
  diffSummary: (percent, deleted, inserted, total) =>
    `Изменено ${isolate(percent)} символов: удалено ${deleted}, вставлено ${inserted}, из ${total} в обоих текстах вместе.`,
  diffNone: "Изменений нет: тексты совпадают.",
  diffChanges: (count) => `Изменения: ${count}`,
  diffKind: { replaced: "Заменено", deleted: "Удалено", inserted: "Вставлено" },
  diffWhitespace: "пробелы или переносы строк",
  scatterSummary: (total, parts) => `Точек: ${total}; ${parts.join("; ")}.`,
  scatterCount: (category, count) => `${category}: ${count}`,
  scatterRange: (axis, from, to) => `${axis}: от ${from} до ${to}.`,
  scatterXLeftToRight: "Значения по горизонтальной оси растут слева направо.",
  scatterXRightToLeft: "Значения по горизонтальной оси растут справа налево.",
  scatterKeys: "Стрелки переводят от точки к точке, Home и End к первой и последней, Escape снимает выбор.",
  scatterActive: (label, category, position, total) => `${label} (${category}), точка ${position} из ${total}`,
  scatterPoint: "Точка",
  scatterCategory: "Категория",
  // SourceNote.
  sourceNoteLabel: "Источник:",
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
