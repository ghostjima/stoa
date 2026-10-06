import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { describeBook, ladderRows, parseBook, type Book } from "./book";
import { useStoaFormat, type StoaFormat } from "./locale";
import { drawEmpty, fitCanvas, readCanvasTokens, useCanvasRefit, useInvalidateOnTokensVersion, useTokenSignal, type CanvasTokens } from "./tokens";

export type LadderHandle = {
  /** Draw a book in the flat engine form, without a React render. */
  draw(flat: ArrayLike<number> | null): void;
};

export type LadderProps = {
  /** Levels per side. */
  depth?: number;
  /** Book in the flat engine form, when drawn through React. */
  data?: ArrayLike<number> | null;
  label: string;
  formatPrice?: (p: number) => string;
  /** Least time between two announcements of the top of the book, in
   * milliseconds. A live book changes many times a second; reading each
   * change aloud would leave a screen-reader user no room for anything
   * else, so the text follows at most this often and always ends on the
   * latest book. */
  announceEvery?: number;
  /** Bumped to force a token re-read and redraw, as an alternative to
   * dispatching `stoa:tokens` on an ancestor (see `useTokenSignal`). */
  tokensVersion?: number;
  ref?: Ref<LadderHandle>;
};

/** Inset of the side marker and the size from the canvas edges, and the
 * least gap between the marker and the price. */
const PAD = 8;

function draw(
  canvas: HTMLCanvasElement,
  t: CanvasTokens,
  book: Book,
  depth: number,
  fmt: (p: number) => string,
  locale: StoaFormat,
) {
  const width = canvas.clientWidth;
  const height = t.rowHeight * depth * 2;
  const ctx = fitCanvas(canvas, height);
  ctx.fillStyle = t.surface;
  ctx.fillRect(0, 0, width, height);
  ctx.font = t.font;
  ctx.textBaseline = "middle";
  const mid = t.rowHeight / 2;
  const rows = ladderRows(book, depth, t.rowHeight, width * 0.5);
  if (rows.length === 0) {
    drawEmpty(ctx, t, locale.messages.bookEmpty, width, height);
    return;
  }
  const { bidMark, askMark } = locale.messages;
  // The price column ends at 45% of the width, or further right when the
  // side marker and the widest price need more: a marker is a word in
  // some languages ("شراء"), not a letter, so it is set in the sans face.
  ctx.font = t.wordFont;
  const markerWidth = Math.max(ctx.measureText(bidMark).width, ctx.measureText(askMark).width);
  ctx.font = t.font;
  const priceWidth = rows.reduce((widest, r) => Math.max(widest, ctx.measureText(fmt(r.price)).width), 0);
  const priceEnd = Math.max(width * 0.45, PAD + markerWidth + PAD + priceWidth);
  for (const r of rows) {
    const bid = r.side === "bid";
    ctx.fillStyle = bid ? t.bidWash : t.askWash;
    ctx.fillRect(width - r.barWidth, r.y + 1, r.barWidth, t.rowHeight - 2);
    ctx.fillStyle = bid ? t.bid : t.ask;
    ctx.textAlign = "left";
    // The side is also a word or a letter, not only a colour.
    ctx.font = t.wordFont;
    ctx.fillText(bid ? bidMark : askMark, PAD, r.y + mid);
    ctx.font = t.font;
    ctx.textAlign = "right";
    ctx.fillText(fmt(r.price), priceEnd, r.y + mid);
    ctx.fillStyle = t.text;
    ctx.fillText(locale.integer(r.size), width - PAD, r.y + mid);
  }
  ctx.strokeStyle = t.border;
  ctx.beginPath();
  ctx.moveTo(0, depth * t.rowHeight + 0.5);
  ctx.lineTo(width, depth * t.rowHeight + 0.5);
  ctx.stroke();
}

/** An order-book ladder on a canvas: asks above, bids below, a size bar
 * per level, redrawn when its box changes size. Screen readers get the top of the book as text, updated at
 * most every `announceEvery` milliseconds (five seconds by default). Side markers, digits and the text follow the
 * locale (see `locale.ts`); `formatPrice` overrides the price format. */
export function Ladder({
  depth = 12,
  data,
  label,
  formatPrice: priceFormat,
  announceEvery = 5000,
  tokensVersion,
  ref,
}: LadderProps) {
  const locale = useStoaFormat();
  const formatPrice = priceFormat ?? ((p: number) => locale.decimal(p, 2));
  const canvas = useRef<HTMLCanvasElement>(null);
  const tokens = useRef<CanvasTokens | null>(null);
  const [summary, setSummary] = useState(locale.messages.bookEmpty);
  const lastSummary = useRef(0);
  const latest = useRef<Book>({ bids: [], asks: [] });
  // Holds a reference to the caller's buffer, not a copy: a token-triggered
  // redraw draws whatever `lastFlat.current` points to right now. A caller
  // that reuses one buffer across frames (the zero-allocation pattern the
  // `Live` story uses) must not mutate it in place between an animation
  // frame and a later signal, or the redraw will show newer data than what
  // was last drawn through React.
  const lastFlat = useRef<ArrayLike<number> | null>(null);
  const trailing = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nothing is drawn before the first book, so a refit before then draws
  // nothing either.
  const drawn = useRef(false);
  const render = (flat: ArrayLike<number> | null) => {
    const c = canvas.current;
    if (!c) return;
    lastFlat.current = flat;
    drawn.current = true;
    tokens.current ??= readCanvasTokens(c);
    const book = parseBook(flat);
    draw(c, tokens.current, book, depth, formatPrice, locale);
    // The text alternative follows at most every announceEvery ms, and
    // always ends on the latest book: a leading-edge-only throttle left
    // "The book is empty." in place when playback paused right after the
    // first draw.
    latest.current = book;
    const publish = () => {
      trailing.current = null;
      lastSummary.current = performance.now();
      setSummary(describeBook(latest.current, formatPrice, locale));
    };
    const wait = announceEvery - (performance.now() - lastSummary.current);
    if (wait <= 0) publish();
    else trailing.current ??= setTimeout(publish, wait);
  };
  useEffect(() => () => {
    if (trailing.current) clearTimeout(trailing.current);
  }, []);

  useImperativeHandle(ref, () => ({ draw: render }));

  // A box that changed size gets the last book again, without a new
  // announcement.
  useCanvasRefit(canvas, () => {
    const c = canvas.current;
    if (!c || !drawn.current) return;
    tokens.current ??= readCanvasTokens(c);
    draw(c, tokens.current, parseBook(lastFlat.current), depth, formatPrice, locale);
  });

  // Drop the cached tokens when `tokensVersion` changes, from an effect
  // that runs before the one below (which draws on every render whenever
  // `data` is set), so that draw reads fresh tokens. Without this, a
  // `tokensVersion` bump with `data` also set drew twice: once with the
  // still-cached, stale tokens from that effect, then again from
  // `useTokenSignal`'s own redraw.
  useInvalidateOnTokensVersion(tokensVersion, () => {
    tokens.current = null;
  });

  useEffect(() => {
    if (data !== undefined) render(data);
  });
  // The data effect above already redrew with fresh tokens when `data` is
  // set, so the hook only owns the version path when it is not.
  useTokenSignal(canvas, data === undefined ? tokensVersion : undefined, () => {
    tokens.current = null;
    render(lastFlat.current);
  });

  return (
    <figure className="stoa-ladder" aria-label={label}>
      {/* Its height, depth times two rows of the density in effect, is set
          before the first draw (the same sum draw() makes), so the canvas
          does not take its default 2:1 shape and then jump. */}
      <canvas
        ref={canvas}
        className="stoa-ladder__canvas"
        aria-hidden="true"
        style={{ blockSize: `calc(var(--stoa-density-row-height, 28px) * ${depth * 2})` }}
      />
      <figcaption className="stoa-visually-hidden" aria-live="polite">
        {summary}
      </figcaption>
    </figure>
  );
}
