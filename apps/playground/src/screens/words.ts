// The words of the component screens, in English, Russian and Arabic, the
// way screenText.ts holds the market screen's. Stoa's components bring
// their own words (Close, Dismiss, the grid's counts, the chart's
// summaries); these are the screens': panel titles, labels, the data's
// names and the sentences of callouts and empty states.
//
// A key that ends in `Text` holds a sentence; one that ends in `Part` is a
// piece of a sentence around a control (a key drawn with Kbd); `units`
// are written after a number. Every other string is a title or a label,
// which starts with a capital letter and has no full stop at the end.
// screens/words.test.ts holds the dictionaries to these rules.
// Numbers reach a function already in the frame's digits.
import type { Language } from "../screenText";

/** The Russian form of a count: one, few or many ("1 уровень", "2
 * уровня", "5 уровней"). */
const ruPlural = (count: number, one: string, few: string, many: string) => {
  const form = new Intl.PluralRules("ru").select(count);
  return form === "one" ? one : form === "few" ? few : many;
};

export type OrderStatus = "new" | "working" | "filled" | "cancelled" | "rejected";

export type ComponentWords = {
  retry: string;
  status: Record<OrderStatus, string>;
  buy: string;
  sell: string;
  /** Shortcuts run while the focus is inside the frame they belong to. */
  focusHintText: string;
  controls: {
    blotterTitle: string;
    toolbarLabel: string;
    orderActionsLabel: string;
    newOrder: string;
    amend: string;
    exportOrders: string;
    cancelAll: string;
    statusFilterLabel: string;
    onlyMine: string;
    marketOpen: string;
    delayed: string;
    paperTrading: string;
    settlement: string;
    closingAuction: string;
    feedLost: string;
    noOrders: string;
    columnsTitle: string;
    columnsLabel: string;
    allColumns: string;
    columnsText: string;
    columnNames: { price: string; quantity: string; notional: string; fee: string; venue: string };
    feedTitle: string;
    liveUpdates: string;
    liveUpdatesText: string;
    connectingText: string;
    needsFeedText: string;
    soundOnFill: string;
    depth: string;
    depthValue: (count: number, shown: string) => string;
    band: string;
    bandHintText: string;
    preferencesTitle: string;
    preferencesText: string;
    themeDrawn: string;
    direction: string;
    leftToRight: string;
    rightToLeft: string;
    keyboardTitle: string;
    blotterGroup: string;
    feedGroup: string;
    otherGroup: string;
    toggleLive: string;
    toggleMine: string;
    fewerLevels: string;
    moreLevels: string;
    feedErrorTitle: string;
    feedErrorText: (time: string) => string;
  };
  feedback: {
    appTitle: string;
    appSubtitle: string;
    appNote: string;
    footerText: string;
    importTitle: string;
    importLabel: string;
    megabytes: (shown: string) => string;
    reconcileLabel: string;
    loadingLabel: string;
    noticesTitle: string;
    delayedTitle: string;
    delayedText: string;
    marginTitle: string;
    marginText: (percent: string) => string;
    reconciledTitle: string;
    reconciledText: (count: string) => string;
    errorTitle: string;
    errorText: string;
    emptyTitle: string;
    emptyText: string;
    importAction: string;
    notificationsTitle: string;
    reportFill: string;
    reportDelay: string;
    reportRejection: string;
    reportSaved: string;
    fillText: (quantity: string, price: string) => string;
    delayText: (seconds: string) => string;
    rejectionText: (order: string) => string;
    savedText: string;
    undo: string;
    lastTradeTitle: string;
    lastTradeText: (price: string, time: string) => string;
    /** The currency read after a price that is drawn bare. */
    units: { currency: string };
    announceLabel: string;
  };
  overlays: {
    orderTitle: string;
    orderToolbarLabel: string;
    details: string;
    filters: string;
    cancelAll: string;
    shortcuts: string;
    pressBeforePart: string;
    pressAfterPart: string;
    detailsTitle: (order: string) => string;
    symbol: string;
    side: string;
    limitPrice: string;
    quantity: string;
    filled: string;
    venue: string;
    amend: string;
    cancelOrder: string;
    venuesLabel: string;
    apply: string;
    reset: string;
    cancelTitle: string;
    cancelText: (count: string) => string;
    confirmCancel: string;
    keepOrders: string;
    shortcutsTitle: string;
    ordersGroup: string;
    helpGroup: string;
    openDetails: string;
    openFilters: string;
    cancelAllShortcut: string;
    showShortcuts: string;
    watchlistTitle: string;
    watchlistLabel: string;
    watchlistEmptyText: string;
    ordersTitle: string;
    ordersLabel: string;
    ordersEmptyText: string;
    tifTerm: string;
    tifText: string;
    tifDay: string;
    sectors: { technology: string; energy: string; banks: string; retail: string; staples: string };
    stepsTitle: string;
    stepsLabel: string;
    steps: { match: string; confirm: string; instruct: string; approve: string; book: string; report: string };
    matchedText: (matched: string, total: string) => string;
    instructText: string;
    approveText: (amount: string) => string;
    reportSkippedText: string;
    instructErrorText: string;
    approve: string;
    reject: string;
    logTitle: string;
    logLabel: string;
    logLines: string[];
    codeTitle: string;
    codeLabel: string;
    loadingLabel: string;
    emptyTitle: string;
    emptyText: string;
    errorTitle: string;
    errorText: string;
  };
  charts: {
    /** Units written after a number: values, not labels, so they keep the
     * case and the abbreviation point their language gives them. */
    units: { years: string; ofPar: string; rub: string; basisPoints: string };
    figuresTitle: string;
    figuresLabel: string;
    yieldLabel: string;
    durationLabel: string;
    priceLabel: string;
    couponLabel: string;
    todayBasis: string;
    nextBasis: (date: string) => string;
    aboveTarget: string;
    withinLimit: string;
    spreadLabel: string;
    spreadBasis: string;
    aboveLimit: string;
    chartTitle: string;
    chartLabel: string;
    chartDescriptionText: string;
    dateLabel: string;
    couponAxis: string;
    rateDown: string;
    rateFlat: string;
    rateUp: string;
    stripTitle: string;
    stripLabel: string;
    tableTitle: string;
    tableCaption: string;
    bond: string;
    quantity: string;
    price: string;
    yieldPercent: string;
    value: string;
    change: string;
    bonds: string[];
    tableEmptyText: string;
    loadingLabel: string;
    emptyTitle: string;
    emptyText: string;
    errorTitle: string;
    errorText: string;
    notLoadedText: string;
  };
  grid: {
    title: string;
    label: string;
    searchLabel: string;
    searchText: string;
    rows: (shown: string) => string;
    order: string;
    symbol: string;
    side: string;
    status: string;
    quantity: string;
    price: string;
    filledCannotCancelText: string;
    emptyTitle: string;
    emptyText: string;
    errorTitle: string;
    errorText: (time: string) => string;
  };
};

const EN: ComponentWords = {
  retry: "Retry",
  status: { new: "New", working: "Working", filled: "Filled", cancelled: "Cancelled", rejected: "Rejected" },
  buy: "Buy",
  sell: "Sell",
  focusHintText: "Shortcuts work while the focus is inside this preview.",
  controls: {
    blotterTitle: "Blotter",
    toolbarLabel: "Blotter actions",
    orderActionsLabel: "Order actions",
    newOrder: "New order",
    amend: "Amend",
    exportOrders: "Export",
    cancelAll: "Cancel all",
    statusFilterLabel: "Order status",
    onlyMine: "Only my orders",
    marketOpen: "Market open",
    delayed: "Delayed 15 min",
    paperTrading: "Paper trading",
    settlement: "T+1",
    closingAuction: "Closing auction",
    feedLost: "Feed lost",
    noOrders: "No orders today",
    columnsTitle: "Columns",
    columnsLabel: "Show columns",
    allColumns: "All columns",
    columnsText: "Hidden columns stay in the export.",
    columnNames: { price: "Price", quantity: "Quantity", notional: "Notional", fee: "Fee", venue: "Venue" },
    feedTitle: "Feed",
    liveUpdates: "Live updates",
    liveUpdatesText: "Prices change as trades arrive.",
    connectingText: "The feed is still connecting.",
    needsFeedText: "Needs a live feed.",
    soundOnFill: "Sound on fill",
    depth: "Book depth",
    depthValue: (count, shown) => `${shown} ${count === 1 ? "level" : "levels"}`,
    band: "Price band",
    bandHintText: "Orders priced outside the band are held for review.",
    preferencesTitle: "Preferences",
    preferencesText: "A sample of an application's switches; the frame's own view is set in its header.",
    themeDrawn: "Theme",
    direction: "Direction",
    leftToRight: "Left to right",
    rightToLeft: "Right to left",
    keyboardTitle: "Keyboard",
    blotterGroup: "Blotter",
    feedGroup: "Feed",
    otherGroup: "Other",
    toggleLive: "Turn live updates on or off",
    toggleMine: "Show only my orders",
    fewerLevels: "Fewer book levels",
    moreLevels: "More book levels",
    feedErrorTitle: "Feed disconnected",
    feedErrorText: (time) => `No prices since ${time}. Working orders can still be cancelled.`,
  },
  feedback: {
    appTitle: "Settlement desk",
    appSubtitle: "Session 14, paper trading",
    appNote: "Synthetic data",
    footerText: "Prices on this screen are synthetic and for review only.",
    importTitle: "Import",
    importLabel: "Settlement file",
    megabytes: (shown) => `${shown} MB`,
    reconcileLabel: "Reconciling trades",
    loadingLabel: "Loading positions",
    noticesTitle: "Notices",
    delayedTitle: "Delayed prices",
    delayedText: "Prices on this screen are 15 minutes behind the exchange.",
    marginTitle: "Margin",
    marginText: (percent) => `Margin use is at ${percent} of the limit.`,
    reconciledTitle: "Positions reconciled",
    reconciledText: (count) => `All ${count} positions match the custodian's file.`,
    errorTitle: "Positions could not be loaded",
    errorText: "The position service did not answer within 10 seconds.",
    emptyTitle: "No positions yet",
    emptyText: "Positions appear here after the first fill.",
    importAction: "Import positions",
    notificationsTitle: "Notifications",
    reportFill: "Report a fill",
    reportDelay: "Report a delay",
    reportRejection: "Report a rejection",
    reportSaved: "Save the view",
    fillText: (quantity, price) => `Bought ${quantity} AAPL at ${price}.`,
    delayText: (seconds) => `The feed is ${seconds} s behind.`,
    rejectionText: (order) => `Order ${order} was rejected: price outside the band.`,
    savedText: "View saved.",
    undo: "Undo",
    lastTradeTitle: "Last trade",
    lastTradeText: (price, time) => `Mid price ${price} at ${time}.`,
    units: { currency: "US dollars" },
    announceLabel: "Announced",
  },
  overlays: {
    orderTitle: "Working order",
    orderToolbarLabel: "Order",
    details: "Order details",
    filters: "Filters",
    cancelAll: "Cancel all orders",
    shortcuts: "Keyboard shortcuts",
    pressBeforePart: "Press",
    pressAfterPart: "for the keyboard shortcuts",
    detailsTitle: (order) => `Order ${order}`,
    symbol: "Symbol",
    side: "Side",
    limitPrice: "Limit price",
    quantity: "Quantity",
    filled: "Filled",
    venue: "Venue",
    amend: "Amend",
    cancelOrder: "Cancel order",
    venuesLabel: "Venues",
    apply: "Apply",
    reset: "Reset",
    cancelTitle: "Cancel all working orders?",
    cancelText: (count) => `${count} working orders will be cancelled at the exchange. This cannot be undone.`,
    confirmCancel: "Cancel orders",
    keepOrders: "Keep orders",
    shortcutsTitle: "Keyboard shortcuts",
    ordersGroup: "Orders",
    helpGroup: "Help",
    openDetails: "Open the order details",
    openFilters: "Open the filters",
    cancelAllShortcut: "Cancel all orders",
    showShortcuts: "Show this list",
    watchlistTitle: "Watchlist",
    watchlistLabel: "Watchlist order",
    watchlistEmptyText: "No symbols on the watchlist.",
    ordersTitle: "Today's orders",
    ordersLabel: "Today's orders",
    ordersEmptyText: "No orders today.",
    tifTerm: "Time in force",
    tifText: "How long the order stays working: until the close of today's session.",
    tifDay: "Day",
    sectors: { technology: "Technology", energy: "Energy", banks: "Banks", retail: "Retail", staples: "Consumer staples" },
    stepsTitle: "Settlement",
    stepsLabel: "Settlement steps",
    steps: {
      match: "Match trades",
      confirm: "Confirm with the broker",
      instruct: "Send settlement instructions",
      approve: "Approve the cash transfer",
      book: "Book positions",
      report: "Send the client report",
    },
    matchedText: (matched, total) => `${matched} of ${total} trades matched.`,
    instructText: "Sending to the custodian.",
    approveText: (amount) => `${amount} USD leaves the trading account.`,
    reportSkippedText: "Reports are off for paper trading.",
    instructErrorText: "The custodian refused the file: line 14 has no account.",
    approve: "Approve",
    reject: "Reject",
    logTitle: "Session log",
    logLabel: "Session log",
    logLines: [
      "Session opened",
      "Subscribed to 12 symbols",
      "Order ORD-000214 accepted",
      "Partial fill, 200 of 500",
      "Feed lag 1.2 s",
      "Order ORD-000215 rejected",
    ],
    codeTitle: "Order payload",
    codeLabel: "Order payload, JSON",
    loadingLabel: "Loading settlement",
    emptyTitle: "Nothing to settle",
    emptyText: "Steps appear when the first trade of the day is matched.",
    errorTitle: "Settlement service unavailable",
    errorText: "The steps below are from the last answer, 4 minutes ago.",
  },
  charts: {
    units: { years: "years", ofPar: "% of par", rub: "RUB", basisPoints: "bp" },
    figuresTitle: "OFZ 26238",
    figuresLabel: "Bond figures",
    yieldLabel: "Yield to maturity",
    durationLabel: "Duration",
    priceLabel: "Price",
    couponLabel: "Next coupon",
    todayBasis: "Clean price, today",
    nextBasis: (date) => `Paid on ${date}`,
    aboveTarget: "Above target",
    withinLimit: "Within limit",
    spreadLabel: "Spread to the curve",
    spreadBasis: "Against the zero-coupon curve",
    aboveLimit: "Above limit",
    chartTitle: "Coupon scenarios",
    chartLabel: "Coupon per period under three key-rate scenarios",
    chartDescriptionText: "The quarterly coupon of a floating-rate bond if the key rate falls, holds or rises.",
    dateLabel: "Date",
    couponAxis: "Coupon, RUB",
    rateDown: "Rate -2 pp",
    rateFlat: "Rate unchanged",
    rateUp: "Rate +2 pp",
    stripTitle: "Payments",
    stripLabel: "Payments from today to maturity",
    tableTitle: "Positions",
    tableCaption: "Open bond positions",
    bond: "Bond",
    quantity: "Quantity",
    price: "Price",
    yieldPercent: "Yield, %",
    value: "Value, RUB",
    change: "Change",
    bonds: ["OFZ 26238", "OFZ 26243", "OFZ 29025", "OFZ 26244", "OFZ 26240", "OFZ 26246"],
    tableEmptyText: "No open positions.",
    loadingLabel: "Loading bond data",
    emptyTitle: "No bond selected",
    emptyText: "Pick a bond on the watchlist to see its figures.",
    errorTitle: "Bond data unavailable",
    errorText: "The reference data service answered with an error.",
    notLoadedText: "Not loaded: the service did not answer.",
  },
  grid: {
    title: "Orders",
    label: "Orders",
    searchLabel: "Search orders",
    searchText: "Marks matching text in every cell.",
    rows: (shown) => `Rows: ${shown}`,
    order: "Order",
    symbol: "Symbol",
    side: "Side",
    status: "Status",
    quantity: "Qty",
    price: "Price",
    filledCannotCancelText: "A filled order cannot be cancelled.",
    emptyTitle: "No orders yet",
    emptyText: "Orders appear here as they are sent.",
    errorTitle: "Orders could not be loaded",
    errorText: (time) => `The order service is not answering. The last update was at ${time}.`,
  },
};

const RU: ComponentWords = {
  retry: "Повторить",
  status: { new: "Новая", working: "В работе", filled: "Исполнена", cancelled: "Отменена", rejected: "Отклонена" },
  buy: "Покупка",
  sell: "Продажа",
  focusHintText: "Сочетания клавиш работают, пока фокус внутри этого превью.",
  controls: {
    blotterTitle: "Заявки",
    toolbarLabel: "Действия с заявками",
    orderActionsLabel: "Действия с заявкой",
    newOrder: "Новая заявка",
    amend: "Изменить",
    exportOrders: "Выгрузить",
    cancelAll: "Отменить все",
    statusFilterLabel: "Статус заявки",
    onlyMine: "Только мои заявки",
    marketOpen: "Торги идут",
    delayed: "Задержка 15 мин",
    paperTrading: "Учебный счёт",
    settlement: "T+1",
    closingAuction: "Аукцион закрытия",
    feedLost: "Поток потерян",
    noOrders: "Сегодня заявок нет",
    columnsTitle: "Столбцы",
    columnsLabel: "Показывать столбцы",
    allColumns: "Все столбцы",
    columnsText: "Скрытые столбцы остаются в выгрузке.",
    columnNames: { price: "Цена", quantity: "Количество", notional: "Объём", fee: "Комиссия", venue: "Площадка" },
    feedTitle: "Поток данных",
    liveUpdates: "Обновление в реальном времени",
    liveUpdatesText: "Цены меняются по мере поступления сделок.",
    connectingText: "Поток данных ещё подключается.",
    needsFeedText: "Нужен живой поток данных.",
    soundOnFill: "Звук при исполнении",
    depth: "Глубина стакана",
    depthValue: (count, shown) => `${shown} ${ruPlural(count, "уровень", "уровня", "уровней")}`,
    band: "Ценовой коридор",
    bandHintText: "Заявки с ценой вне коридора уходят на проверку.",
    preferencesTitle: "Настройки",
    preferencesText: "Образец переключателей приложения; вид самого фрейма задаётся в его заголовке.",
    themeDrawn: "Тема",
    direction: "Направление",
    leftToRight: "Слева направо",
    rightToLeft: "Справа налево",
    keyboardTitle: "Клавиатура",
    blotterGroup: "Заявки",
    feedGroup: "Поток данных",
    otherGroup: "Прочее",
    toggleLive: "Включить или выключить обновление",
    toggleMine: "Показать только мои заявки",
    fewerLevels: "Меньше уровней стакана",
    moreLevels: "Больше уровней стакана",
    feedErrorTitle: "Поток данных отключён",
    feedErrorText: (time) => `Цен нет с ${time}. Активные заявки по-прежнему можно отменить.`,
  },
  feedback: {
    appTitle: "Расчётный стол",
    appSubtitle: "Сессия 14, учебный счёт",
    appNote: "Синтетические данные",
    footerText: "Цены на этом экране синтетические и только для проверки.",
    importTitle: "Загрузка",
    importLabel: "Расчётный файл",
    megabytes: (shown) => `${shown} МБ`,
    reconcileLabel: "Сверка сделок",
    loadingLabel: "Загрузка позиций",
    noticesTitle: "Уведомления",
    delayedTitle: "Цены с задержкой",
    delayedText: "Цены на этом экране отстают от биржи на 15 минут.",
    marginTitle: "Маржа",
    marginText: (percent) => `Использовано ${percent} лимита маржи.`,
    reconciledTitle: "Позиции сверены",
    reconciledText: (count) => `Все позиции (${count}) совпадают с файлом депозитария.`,
    errorTitle: "Не удалось загрузить позиции",
    errorText: "Сервис позиций не ответил за 10 секунд.",
    emptyTitle: "Позиций пока нет",
    emptyText: "Позиции появятся здесь после первого исполнения.",
    importAction: "Загрузить позиции",
    notificationsTitle: "Оповещения",
    reportFill: "Сообщить об исполнении",
    reportDelay: "Сообщить о задержке",
    reportRejection: "Сообщить об отказе",
    reportSaved: "Сохранить вид",
    fillText: (quantity, price) => `Куплено ${quantity} AAPL по ${price}.`,
    delayText: (seconds) => `Поток отстаёт на ${seconds} с.`,
    rejectionText: (order) => `Заявка ${order} отклонена: цена вне коридора.`,
    savedText: "Вид сохранён.",
    undo: "Отменить",
    lastTradeTitle: "Последняя сделка",
    lastTradeText: (price, time) => `Средняя цена ${price} на ${time}.`,
    units: { currency: "долларов США" },
    announceLabel: "Озвучено",
  },
  overlays: {
    orderTitle: "Активная заявка",
    orderToolbarLabel: "Заявка",
    details: "Подробности заявки",
    filters: "Фильтры",
    cancelAll: "Отменить все заявки",
    shortcuts: "Сочетания клавиш",
    pressBeforePart: "Нажмите",
    pressAfterPart: "для списка сочетаний клавиш",
    detailsTitle: (order) => `Заявка ${order}`,
    symbol: "Тикер",
    side: "Направление",
    limitPrice: "Лимитная цена",
    quantity: "Количество",
    filled: "Исполнено",
    venue: "Площадка",
    amend: "Изменить",
    cancelOrder: "Отменить заявку",
    venuesLabel: "Площадки",
    apply: "Применить",
    reset: "Сбросить",
    cancelTitle: "Отменить все активные заявки?",
    cancelText: (count) => `Активные заявки (${count}) будут отменены на бирже. Это действие нельзя отменить.`,
    confirmCancel: "Отменить заявки",
    keepOrders: "Оставить заявки",
    shortcutsTitle: "Сочетания клавиш",
    ordersGroup: "Заявки",
    helpGroup: "Справка",
    openDetails: "Открыть подробности заявки",
    openFilters: "Открыть фильтры",
    cancelAllShortcut: "Отменить все заявки",
    showShortcuts: "Показать этот список",
    watchlistTitle: "Список наблюдения",
    watchlistLabel: "Порядок списка наблюдения",
    watchlistEmptyText: "В списке наблюдения нет тикеров.",
    ordersTitle: "Заявки за день",
    ordersLabel: "Заявки за день",
    ordersEmptyText: "Сегодня заявок нет.",
    tifTerm: "Срок действия",
    tifText: "Сколько заявка остаётся активной: до конца сегодняшней сессии.",
    tifDay: "День",
    sectors: { technology: "Технологии", energy: "Энергетика", banks: "Банки", retail: "Розница", staples: "Товары первой необходимости" },
    stepsTitle: "Расчёты",
    stepsLabel: "Шаги расчётов",
    steps: {
      match: "Сверить сделки",
      confirm: "Подтвердить у брокера",
      instruct: "Отправить расчётные поручения",
      approve: "Одобрить перевод денег",
      book: "Учесть позиции",
      report: "Отправить отчёт клиенту",
    },
    matchedText: (matched, total) => `Сверено сделок: ${matched} из ${total}.`,
    instructText: "Отправка в депозитарий.",
    approveText: (amount) => `С торгового счёта уйдёт ${amount} USD.`,
    reportSkippedText: "Для учебного счёта отчёты отключены.",
    instructErrorText: "Депозитарий отклонил файл: в строке 14 нет счёта.",
    approve: "Одобрить",
    reject: "Отклонить",
    logTitle: "Журнал сессии",
    logLabel: "Журнал сессии",
    logLines: [
      "Сессия открыта",
      "Подписка на 12 тикеров",
      "Заявка ORD-000214 принята",
      "Частичное исполнение, 200 из 500",
      "Задержка потока 1,2 с",
      "Заявка ORD-000215 отклонена",
    ],
    codeTitle: "Тело заявки",
    codeLabel: "Тело заявки, JSON",
    loadingLabel: "Загрузка расчётов",
    emptyTitle: "Рассчитывать нечего",
    emptyText: "Шаги появятся, когда будет сверена первая сделка дня.",
    errorTitle: "Сервис расчётов недоступен",
    errorText: "Шаги ниже взяты из последнего ответа, 4 минуты назад.",
  },
  charts: {
    units: { years: "года", ofPar: "% от номинала", rub: "₽", basisPoints: "б. п." },
    figuresTitle: "ОФЗ 26238",
    figuresLabel: "Показатели облигации",
    yieldLabel: "Доходность к погашению",
    durationLabel: "Дюрация",
    priceLabel: "Цена",
    couponLabel: "Следующий купон",
    todayBasis: "Чистая цена, сегодня",
    nextBasis: (date) => `Выплата ${date}`,
    aboveTarget: "Выше цели",
    withinLimit: "В пределах лимита",
    spreadLabel: "Спред к кривой",
    spreadBasis: "К кривой бескупонной доходности",
    aboveLimit: "Выше лимита",
    chartTitle: "Сценарии купона",
    chartLabel: "Купон за период при трёх сценариях ключевой ставки",
    chartDescriptionText: "Квартальный купон флоатера, если ключевая ставка снизится, сохранится или вырастет.",
    dateLabel: "Дата",
    couponAxis: "Купон, ₽",
    rateDown: "Ставка ниже на 2 пункта",
    rateFlat: "Ставка без изменений",
    rateUp: "Ставка выше на 2 пункта",
    stripTitle: "Выплаты",
    stripLabel: "Выплаты с сегодняшнего дня до погашения",
    tableTitle: "Позиции",
    tableCaption: "Открытые позиции по облигациям",
    bond: "Облигация",
    quantity: "Количество",
    price: "Цена",
    yieldPercent: "Доходность, %",
    value: "Стоимость, ₽",
    change: "Изменение",
    bonds: ["ОФЗ 26238", "ОФЗ 26243", "ОФЗ 29025", "ОФЗ 26244", "ОФЗ 26240", "ОФЗ 26246"],
    tableEmptyText: "Открытых позиций нет.",
    loadingLabel: "Загрузка данных облигации",
    emptyTitle: "Облигация не выбрана",
    emptyText: "Выберите облигацию в списке наблюдения, чтобы увидеть её показатели.",
    errorTitle: "Данные облигации недоступны",
    errorText: "Сервис справочных данных ответил ошибкой.",
    notLoadedText: "Не загружено: сервис не ответил.",
  },
  grid: {
    title: "Заявки",
    label: "Заявки",
    searchLabel: "Поиск по заявкам",
    searchText: "Отмечает совпадения в каждой ячейке.",
    rows: (shown) => `Строк: ${shown}`,
    order: "Заявка",
    symbol: "Тикер",
    side: "Направление",
    status: "Статус",
    quantity: "Кол-во",
    price: "Цена",
    filledCannotCancelText: "Исполненную заявку нельзя отменить.",
    emptyTitle: "Заявок пока нет",
    emptyText: "Заявки появятся здесь по мере отправки.",
    errorTitle: "Не удалось загрузить заявки",
    errorText: (time) => `Сервис заявок не отвечает. Последнее обновление было в ${time}.`,
  },
};

const AR: ComponentWords = {
  retry: "إعادة المحاولة",
  status: { new: "جديد", working: "قيد التنفيذ", filled: "منفذ", cancelled: "ملغى", rejected: "مرفوض" },
  buy: "شراء",
  sell: "بيع",
  focusHintText: "تعمل الاختصارات ما دام التركيز داخل هذه المعاينة.",
  controls: {
    blotterTitle: "سجل الأوامر",
    toolbarLabel: "إجراءات سجل الأوامر",
    orderActionsLabel: "إجراءات الأمر",
    newOrder: "أمر جديد",
    amend: "تعديل",
    exportOrders: "تصدير",
    cancelAll: "إلغاء الكل",
    statusFilterLabel: "حالة الأمر",
    onlyMine: "أوامري فقط",
    marketOpen: "السوق مفتوحة",
    delayed: "تأخير ١٥ دقيقة",
    paperTrading: "تداول تجريبي",
    settlement: "T+1",
    closingAuction: "مزاد الإغلاق",
    feedLost: "انقطع البث",
    noOrders: "لا أوامر اليوم",
    columnsTitle: "الأعمدة",
    columnsLabel: "إظهار الأعمدة",
    allColumns: "كل الأعمدة",
    columnsText: "تبقى الأعمدة المخفية في الملف المصدَّر.",
    columnNames: { price: "السعر", quantity: "الكمية", notional: "القيمة الاسمية", fee: "الرسوم", venue: "منصة التداول" },
    feedTitle: "بث الأسعار",
    liveUpdates: "التحديث المباشر",
    liveUpdatesText: "تتغير الأسعار مع وصول الصفقات.",
    connectingText: "ما زال البث قيد الاتصال.",
    needsFeedText: "يحتاج إلى بث مباشر.",
    soundOnFill: "صوت عند التنفيذ",
    depth: "عمق دفتر الأوامر",
    depthValue: (_count, shown) => `المستويات: ${shown}`,
    band: "نطاق السعر",
    bandHintText: "تُحتجز للمراجعة الأوامر المسعّرة خارج النطاق.",
    preferencesTitle: "التفضيلات",
    preferencesText: "نموذج لمفاتيح تطبيق؛ أما عرض الإطار نفسه فيُضبط في رأسه.",
    themeDrawn: "المظهر",
    direction: "الاتجاه",
    leftToRight: "من اليسار إلى اليمين",
    rightToLeft: "من اليمين إلى اليسار",
    keyboardTitle: "لوحة المفاتيح",
    blotterGroup: "سجل الأوامر",
    feedGroup: "بث الأسعار",
    otherGroup: "أخرى",
    toggleLive: "تشغيل التحديث المباشر أو إيقافه",
    toggleMine: "إظهار أوامري فقط",
    fewerLevels: "مستويات أقل في الدفتر",
    moreLevels: "مستويات أكثر في الدفتر",
    feedErrorTitle: "انقطع بث الأسعار",
    feedErrorText: (time) => `لا أسعار منذ ${time}. ما زال بالإمكان إلغاء الأوامر القائمة.`,
  },
  feedback: {
    appTitle: "مكتب التسوية",
    appSubtitle: "الجلسة ١٤، تداول تجريبي",
    appNote: "بيانات اصطناعية",
    footerText: "الأسعار في هذه الشاشة اصطناعية وللمراجعة فقط.",
    importTitle: "الاستيراد",
    importLabel: "ملف التسوية",
    megabytes: (shown) => `${shown} ميغابايت`,
    reconcileLabel: "مطابقة الصفقات",
    loadingLabel: "تحميل المراكز",
    noticesTitle: "التنبيهات",
    delayedTitle: "أسعار متأخرة",
    delayedText: "تتأخر الأسعار في هذه الشاشة ١٥ دقيقة عن البورصة.",
    marginTitle: "الهامش",
    marginText: (percent) => `استُخدم ${percent} من حد الهامش.`,
    reconciledTitle: "تمت مطابقة المراكز",
    reconciledText: (count) => `تطابق المراكز كلها (${count}) ملف أمين الحفظ.`,
    errorTitle: "تعذّر تحميل المراكز",
    errorText: "لم تُجب خدمة المراكز خلال ١٠ ثوانٍ.",
    emptyTitle: "لا مراكز بعد",
    emptyText: "تظهر المراكز هنا بعد أول تنفيذ.",
    importAction: "استيراد المراكز",
    notificationsTitle: "الإشعارات",
    reportFill: "الإبلاغ عن تنفيذ",
    reportDelay: "الإبلاغ عن تأخير",
    reportRejection: "الإبلاغ عن رفض",
    reportSaved: "حفظ العرض",
    fillText: (quantity, price) => `تم شراء ${quantity} من AAPL بسعر ${price}.`,
    delayText: (seconds) => `يتأخر البث ${seconds} ث.`,
    rejectionText: (order) => `رُفض الأمر ${order}: السعر خارج النطاق.`,
    savedText: "تم حفظ العرض.",
    undo: "تراجع",
    lastTradeTitle: "آخر صفقة",
    lastTradeText: (price, time) => `السعر الأوسط ${price} عند ${time}.`,
    units: { currency: "دولار أمريكي" },
    announceLabel: "المُعلَن",
  },
  overlays: {
    orderTitle: "أمر قائم",
    orderToolbarLabel: "الأمر",
    details: "تفاصيل الأمر",
    filters: "عوامل التصفية",
    cancelAll: "إلغاء كل الأوامر",
    shortcuts: "اختصارات لوحة المفاتيح",
    pressBeforePart: "اضغط",
    pressAfterPart: "لعرض اختصارات لوحة المفاتيح",
    detailsTitle: (order) => `الأمر ${order}`,
    symbol: "الرمز",
    side: "الاتجاه",
    limitPrice: "السعر المحدد",
    quantity: "الكمية",
    filled: "المنفذ",
    venue: "منصة التداول",
    amend: "تعديل",
    cancelOrder: "إلغاء الأمر",
    venuesLabel: "منصات التداول",
    apply: "تطبيق",
    reset: "إعادة الضبط",
    cancelTitle: "إلغاء كل الأوامر القائمة؟",
    cancelText: (count) => `ستُلغى الأوامر القائمة (${count}) في البورصة. لا يمكن التراجع عن ذلك.`,
    confirmCancel: "إلغاء الأوامر",
    keepOrders: "إبقاء الأوامر",
    shortcutsTitle: "اختصارات لوحة المفاتيح",
    ordersGroup: "الأوامر",
    helpGroup: "المساعدة",
    openDetails: "فتح تفاصيل الأمر",
    openFilters: "فتح عوامل التصفية",
    cancelAllShortcut: "إلغاء كل الأوامر",
    showShortcuts: "عرض هذه القائمة",
    watchlistTitle: "قائمة المتابعة",
    watchlistLabel: "ترتيب قائمة المتابعة",
    watchlistEmptyText: "لا رموز في قائمة المتابعة.",
    ordersTitle: "أوامر اليوم",
    ordersLabel: "أوامر اليوم",
    ordersEmptyText: "لا أوامر اليوم.",
    tifTerm: "مدة السريان",
    tifText: "المدة التي يبقى فيها الأمر قائمًا: حتى نهاية جلسة اليوم.",
    tifDay: "يوم",
    sectors: { technology: "التقنية", energy: "الطاقة", banks: "المصارف", retail: "التجزئة", staples: "السلع الأساسية" },
    stepsTitle: "التسوية",
    stepsLabel: "خطوات التسوية",
    steps: {
      match: "مطابقة الصفقات",
      confirm: "التأكيد مع الوسيط",
      instruct: "إرسال تعليمات التسوية",
      approve: "الموافقة على التحويل النقدي",
      book: "قيد المراكز",
      report: "إرسال تقرير العميل",
    },
    matchedText: (matched, total) => `تمت مطابقة ${matched} من ${total} صفقة.`,
    instructText: "جارٍ الإرسال إلى أمين الحفظ.",
    approveText: (amount) => `سيخرج ${amount} دولار من حساب التداول.`,
    reportSkippedText: "التقارير متوقفة في التداول التجريبي.",
    instructErrorText: "رفض أمين الحفظ الملف: السطر ١٤ بلا حساب.",
    approve: "موافقة",
    reject: "رفض",
    logTitle: "سجل الجلسة",
    logLabel: "سجل الجلسة",
    logLines: [
      "فُتحت الجلسة",
      "اشتراك في ١٢ رمزاً",
      "قُبل الأمر ORD-000214",
      "تنفيذ جزئي، ٢٠٠ من ٥٠٠",
      "تأخر البث ١٫٢ ث",
      "رُفض الأمر ORD-000215",
    ],
    codeTitle: "محتوى الأمر",
    codeLabel: "محتوى الأمر، JSON",
    loadingLabel: "تحميل التسوية",
    emptyTitle: "لا شيء للتسوية",
    emptyText: "تظهر الخطوات عند مطابقة أول صفقة في اليوم.",
    errorTitle: "خدمة التسوية غير متاحة",
    errorText: "الخطوات أدناه من آخر رد، قبل ٤ دقائق.",
  },
  charts: {
    units: { years: "سنة", ofPar: "% من القيمة الاسمية", rub: "روبل", basisPoints: "نقطة أساس" },
    figuresTitle: "OFZ 26238",
    figuresLabel: "أرقام السند",
    yieldLabel: "العائد حتى الاستحقاق",
    durationLabel: "المدة",
    priceLabel: "السعر",
    couponLabel: "القسيمة التالية",
    todayBasis: "السعر النظيف، اليوم",
    nextBasis: (date) => `تُدفع في ${date}`,
    aboveTarget: "فوق الهدف",
    withinLimit: "ضمن الحد",
    spreadLabel: "الفارق عن المنحنى",
    spreadBasis: "مقابل منحنى القسيمة الصفرية",
    aboveLimit: "فوق الحد",
    chartTitle: "سيناريوهات القسيمة",
    chartLabel: "القسيمة لكل فترة في ثلاثة سيناريوهات لسعر الفائدة الرئيسي",
    chartDescriptionText: "القسيمة الفصلية لسند بعائد متغير إذا انخفض سعر الفائدة الرئيسي أو ثبت أو ارتفع.",
    dateLabel: "التاريخ",
    couponAxis: "القسيمة، روبل",
    rateDown: "الفائدة -٢ نقطة مئوية",
    rateFlat: "الفائدة دون تغيير",
    rateUp: "الفائدة +٢ نقطة مئوية",
    stripTitle: "المدفوعات",
    stripLabel: "المدفوعات من اليوم حتى الاستحقاق",
    tableTitle: "المراكز",
    tableCaption: "مراكز السندات المفتوحة",
    bond: "السند",
    quantity: "الكمية",
    price: "السعر",
    yieldPercent: "العائد، %",
    value: "القيمة، روبل",
    change: "التغير",
    bonds: ["OFZ 26238", "OFZ 26243", "OFZ 29025", "OFZ 26244", "OFZ 26240", "OFZ 26246"],
    tableEmptyText: "لا مراكز مفتوحة.",
    loadingLabel: "تحميل بيانات السند",
    emptyTitle: "لم يُختر سند",
    emptyText: "اختر سنداً من قائمة المتابعة لترى أرقامه.",
    errorTitle: "بيانات السند غير متاحة",
    errorText: "ردّت خدمة البيانات المرجعية بخطأ.",
    notLoadedText: "لم يُحمَّل: لم تُجب الخدمة.",
  },
  grid: {
    title: "الأوامر",
    label: "الأوامر",
    searchLabel: "البحث في الأوامر",
    searchText: "يميّز النص المطابق في كل خلية.",
    rows: (shown) => `الصفوف: ${shown}`,
    order: "الأمر",
    symbol: "الرمز",
    side: "الاتجاه",
    status: "الحالة",
    quantity: "الكمية",
    price: "السعر",
    filledCannotCancelText: "لا يمكن إلغاء أمر منفذ.",
    emptyTitle: "لا أوامر بعد",
    emptyText: "تظهر الأوامر هنا عند إرسالها.",
    errorTitle: "تعذّر تحميل الأوامر",
    errorText: (time) => `خدمة الأوامر لا تستجيب. كان آخر تحديث عند ${time}.`,
  },
};

export const COMPONENT_WORDS: Record<Language, ComponentWords> = { en: EN, ru: RU, ar: AR };
