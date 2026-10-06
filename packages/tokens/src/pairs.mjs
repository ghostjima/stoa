// What Stoa promises about colour and size, as data.
//
// Every entry names one measurement and the reason it exists, so the docs
// can claim exactly this list and nothing wider. A pair that no component
// uses yet says so in its reason rather than being left out: the token is
// a promise whether or not something has taken it up.
//
// `enforced` defaults to true. An entry marked `enforced: false` is
// measured and reported but its failure does not fail a test, either
// because WCAG does not require the ratio for that use or because the
// threshold is a project decision rather than a standard. Nothing in
// `docs` or a test may describe a reported-only entry as a WCAG failure.
//
// Colour names are semantic token names without the `color-` prefix. A
// `bgOver` names the opaque colour a translucent `bg` is composited over
// before the measurement, for the case of text drawn on top of a wash.

/** WCAG 2.2 contrast minimum for normal-size text (1.4.3, AA). */
export const TEXT_AA = 4.5;
/** WCAG 2.2 contrast minimum for normal-size text at AAA (1.4.6). The
 * pairs that ask for it are the ones the tests already asked it of. */
export const TEXT_AAA = 7;
/** WCAG 2.2 non-text contrast minimum (1.4.11). */
export const NON_TEXT = 3;
/** WCAG 2.2 target size (minimum) (2.5.8), in CSS pixels. */
export const TARGET_SIZE_PX = 24;
/** Smallest CIEDE2000 difference this project wants between the rising
 * and falling colours, under normal vision and under each simulated
 * dichromacy. Not a standard: a project decision, set well above the
 * roughly 2.3 unit difference usually cited as just noticeable, so the two
 * are told apart at a glance in a dense grid. Reported, not enforced,
 * until Stage 2 decides the colours. */
export const UP_DOWN_MIN_DELTA_E = 10;
/** Smallest WCAG 2 contrast ratio this project wants between the rising
 * and falling colours themselves, so that the two can be told apart
 * without hue: in greyscale, on a failing display, or by a monochromat.
 * Also a project decision rather than a WCAG requirement, and reported
 * rather than enforced; 3:1 is borrowed from 1.4.11 as a starting point. */
export const UP_DOWN_MIN_CONTRAST = NON_TEXT;

/** Text-role colours against the surfaces they sit on. */
export const TEXT_PAIRS = [
  { fg: "text", bg: "bg", min: TEXT_AAA, reason: "Body text on the page background; the preview stylesheet sets both on `body`." },
  { fg: "text", bg: "surface", min: TEXT_AAA, reason: "Body text inside a panel, a table cell or the ladder; also a chart legend and the maturity marker of an event strip." },
  { fg: "text", bg: "surface-hover", min: TEXT_AA, reason: "Button label while the pointer is over the button." },
  { fg: "text", bg: "surface-sunken", min: TEXT_AA, reason: "Body text in a sunken well, the label of a secondary button, and a key drawn by Kbd." },
  { fg: "surface", bg: "accent", min: TEXT_AA, reason: "Label of a primary button, a selected choice or filter chip, or an accent Tag: the surface colour reversed out of the accent fill. The check mark of a checkbox and the thumb of a switch that is on are the same colour on the same fill; they are non-text marks, held here to the stricter text ratio." },
  { fg: "surface", bg: "down", min: TEXT_AA, reason: "Label of a danger button: the surface colour reversed out of the danger fill, which is the falling colour." },
  { fg: "text-muted", bg: "surface", min: TEXT_AA, reason: "Panel title, field label, table header, statbar term, and the heatmap price labels on their surface plates; also chart axis labels and notes, the neutral series line of a line chart and the coupon marker of an event strip." },
  { fg: "text-muted", bg: "bg", min: TEXT_AA, reason: "The same muted labels, chart lines and markers when a table, chart or statbar sits straight on the page background." },
  { fg: "text-muted", bg: "surface-sunken", min: TEXT_AA, reason: "Muted labels in a sunken well." },
  { fg: "text-subtle", bg: "surface", min: TEXT_AA, reason: "The third text role: the description of a disabled shortcut in ShortcutList and ShortcutsDialog." },
  { fg: "text-subtle", bg: "bg", min: TEXT_AA, reason: "The same, on the page background." },
  { fg: "accent", bg: "surface", min: TEXT_AA, reason: "Accent used as text or an icon inside a panel; also the accent series line of a line chart and the amortisation marker of an event strip." },
  { fg: "accent", bg: "bg", min: TEXT_AA, reason: "The same, on the page background." },
  { fg: "up", bg: "surface", min: TEXT_AA, reason: "A rising price or change, in a table cell or a badge, or a rising series line in a chart." },
  { fg: "down", bg: "surface", min: TEXT_AA, reason: "A falling price or change, in a table cell or a badge, or a falling series line in a chart; the danger colour as text, in a Tag of negative tone." },
  { fg: "up", bg: "bg", min: TEXT_AA, reason: "The same badge in a toolbar on the page background." },
  { fg: "down", bg: "bg", min: TEXT_AA, reason: "The same badge in a toolbar on the page background." },
  { fg: "bid", bg: "surface", min: TEXT_AA, reason: "Bid prices and the B marker the ladder draws over its own surface fill." },
  { fg: "ask", bg: "surface", min: TEXT_AA, reason: "Ask prices and the A marker the ladder draws over its own surface fill." },
  { fg: "warning", bg: "surface", min: TEXT_AA, reason: "The warning glyph of a status badge; the badge draws it as a character, so it is text. Also the warning series line of a line chart and the offer marker of an event strip." },
  { fg: "warning", bg: "bg", min: TEXT_AA, reason: "The same glyph, line and marker on the page background." },
  {
    fg: "text",
    bg: "up-wash",
    bgOver: "surface",
    min: TEXT_AA,
    reason: "Size at the right of a ladder row, drawn in text over the bid depth bar: the wash composited over the ladder surface at its own alpha.",
  },
  {
    fg: "text",
    bg: "down-wash",
    bgOver: "surface",
    min: TEXT_AA,
    reason: "The same size over the ask depth bar.",
  },
];

/** Borders, focus and non-text marks against the surfaces behind them.
 *
 * The up, down, bid and ask marks against a surface are the same colour
 * pairs the text rule already measures at 4.5:1, which is the stricter of
 * the two, so they are not repeated here. What is listed is the part of
 * those marks the text rule cannot see: the translucent washes. The same
 * holds for chart marks: a line chart's series lines (accent, text-muted,
 * warning, up, down) and an event strip's markers (text-muted, accent,
 * warning, text) are measured by the text pairs above at 4.5:1 or more,
 * which is stricter than 1.4.11's 3:1, so they are named in those reasons
 * rather than repeated here. The accent
 * pairs are repeated, because the selected tab is a different promise from
 * accent used as text and Stage 2 may want to move only one of them. */
export const NON_TEXT_PAIRS = [
  { fg: "border-strong", bg: "surface", min: NON_TEXT, reason: "Boundary of a text field, a button, a checkbox, the track of a switch and the slider track inside a panel: it is what identifies the control, so 1.4.11 applies. Also the time axis of a line chart and an event strip, which the markers and lines are read against." },
  { fg: "border-strong", bg: "bg", min: NON_TEXT, reason: "The same controls and axes when they sit straight on the page background." },
  { fg: "focus", bg: "surface", min: NON_TEXT, reason: "Focus ring around a control inside a panel." },
  { fg: "focus", bg: "bg", min: NON_TEXT, reason: "Focus ring around a control on the page background." },
  { fg: "accent", bg: "surface", min: NON_TEXT, reason: "Underline of the selected tab, the fill of a checked checkbox and of a switch that is on, and the filled part of a slider track: how the selected state or the value is shown." },
  { fg: "accent", bg: "bg", min: NON_TEXT, reason: "The same tab indicator when the tab list sits straight on the page background." },
  { fg: "accent", bg: "surface-sunken", min: NON_TEXT, reason: "The bar at the start edge of the picked row of a RecordList while that row is hovered or focused, on the row's sunken fill: it shows which record the detail shows." },
  {
    fg: "up-wash",
    bg: "surface",
    min: NON_TEXT,
    enforced: false,
    reason: "Bid depth bar the ladder fills over its surface, composited at the wash alpha; the bar length carries the quantity, so 1.4.11 is not claimed, and the ratio is reported only.",
  },
  {
    fg: "down-wash",
    bg: "surface",
    min: NON_TEXT,
    enforced: false,
    reason: "Ask depth bar, same reasoning as the bid bar.",
  },
  {
    fg: "border",
    bg: "surface",
    min: NON_TEXT,
    enforced: false,
    reason: "Panel boundary, table header rule, tab-list rule and the gridlines of a line chart. They identify no control and carry no state, so 1.4.11 does not require 3:1; reported because a boundary nobody can see still costs scanning speed.",
  },
  {
    fg: "border",
    bg: "bg",
    min: NON_TEXT,
    enforced: false,
    reason: "The same rules on the page background; reported for the same reason.",
  },
  {
    fg: "scrollbar-thumb",
    bg: "scrollbar-track",
    min: NON_TEXT,
    enforced: false,
    reason: "The thumb of every scrollbar on a Stoa page. Stoa sets its colour, so the exemption 1.4.11 gives unmodified browser controls does not apply; the thumb is kept quiet on purpose and 3:1 is not claimed. Reported so the shortfall stays visible.",
  },
];

/** The rising and falling colours, which have to stay apart under every
 * colour-vision model the checks simulate. The bid and ask colours are the
 * same two token values in both themes, so measuring them again would add
 * no number. */
export const UP_DOWN = {
  a: "up",
  b: "down",
  reason: "Rising against falling: the pair a trader reads first, and the one red-green dichromacy hits hardest.",
  contrastReason: "Rising against falling with hue removed: how far apart the two are in luminance alone.",
};

/** Size tokens measured against the target-size minimum, per density mode.
 *
 * Only row height is listed. Ladder and TradeTable have no pointer handlers
 * today, so no row is a pointer target yet and 2.5.8 does not apply to them
 * as drawn; the token is measured because row height is what the target will
 * be as soon as a row becomes interactive, and a mode that starts under the
 * minimum stays under it. Control sizes are not checked at all: there are no
 * control size tokens yet, so there is nothing for the rule to read. */
export const TARGETS = [
  {
    token: "density-row-height",
    min: TARGET_SIZE_PX,
    reason: "Height of a table and ladder row. It becomes the pointer target the moment a row is made interactive, so it is measured against 2.5.8 now rather than after the handler is added.",
  },
];
