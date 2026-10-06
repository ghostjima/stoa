import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Button } from "./Controls";
import { useStoaFormat } from "./locale";

/** How long the result of a copy stays on screen, in ms. */
const COPY_STATUS_MS = 4000;

/** How close to its end, in CSS pixels, a log counts as read to the end:
 * a scroll position can stop a fraction of a pixel short. */
const END_SLACK = 2;

/** The invisible bidi controls: LRM, RLM, ALM, the embeddings and
 * overrides, and the isolates. */
const BIDI_CONTROLS = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;

type FrameProps = {
  label: string;
  /** The text the Copy button copies. */
  text: string;
  copyable: boolean;
  maxLines: number;
  className: string;
  style?: CSSProperties;
  /** The scroll area, for a view that scrolls it itself. */
  scrollRef?: RefObject<HTMLPreElement | null>;
  onScroll?: () => void;
  /** A control in the bar before Copy. */
  action?: ReactNode;
  children: ReactNode;
};

/** The frame LogView and CodeView share: a label, the Copy button and its
 * polite status, and a scroll area that keyboard users can focus and
 * scroll. The scroll area is a region named by the label. */
function Frame({ label, text, copyable, maxLines, className, style, scrollRef, onScroll, action, children }: FrameProps) {
  const { messages } = useStoaFormat();
  const labelId = useId();
  const [status, setStatus] = useState<"copied" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      // No clipboard (an insecure page, a denied permission): say so.
      setStatus("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), COPY_STATUS_MS);
  };

  return (
    <div className={`stoa-code ${className}`.trim()}>
      <div className="stoa-code__bar">
        <span id={labelId} className="stoa-code__label">
          {label}
        </span>
        <span role="status" className="stoa-code__status">
          {status === "copied" ? messages.copied : status === "failed" ? messages.copyFailed : ""}
        </span>
        {action}
        {copyable && (
          <Button className="stoa-code__copy" aria-describedby={labelId} onPress={copy}>
            {messages.copy}
          </Button>
        )}
      </div>
      <pre
        ref={scrollRef}
        onScroll={onScroll}
        className="stoa-code__scroll"
        role="region"
        aria-labelledby={labelId}
        tabIndex={0}
        dir="ltr"
        style={{ ...style, "--code-lines": maxLines } as CSSProperties}
      >
        {children}
      </pre>
    </div>
  );
}

/** A log line: plain text, or its parts. Each part is isolated, so the
 * parts keep their order from left to right whatever their script: the
 * time left to right (its digits may be Arabic-Indic), the level and the
 * message (`bdi`) each in the direction of its own first letter, so an
 * Arabic message reads right to left, its punctuation in place, while the
 * time and level before it stay at the left. */
export type LogLine = string | { time?: string; level?: string; text: string };

const lineText = (line: LogLine) => (typeof line === "string" ? line : [line.time, line.level, line.text].filter(Boolean).join(" "));

export type LogViewProps = {
  /** Names the log, visibly and for assistive technology. */
  label: string;
  /** One entry per line, oldest first. */
  lines: LogLine[];
  /** A Copy button for the whole log. On by default. */
  copyable?: boolean;
  /** Lines shown before the log scrolls. 12 by default. */
  maxLines?: number;
  /** Keep the newest line in view as lines arrive, while the reader is at
   * the end of the log. On by default; the log then opens at its end. */
  follow?: boolean;
};

/** Log lines, left to right even in a right-to-left page. A plain line is
 * laid out left to right as a whole, in the monospace face; give a line
 * its parts (LogLine) to isolate a message that may be in another script:
 * the time and level stay in the monospace face, the message, which is
 * words, is in the sans face. A long line wraps inside the log.
 *
 * The log follows its newest line while the reader is at its end. Scrolled
 * up, it stays where the reader is, and a "Jump to latest" button in its
 * bar scrolls back to the end and gives focus to the log, so the focus
 * has somewhere to go when the button disappears. Copy puts plain text on
 * the clipboard, without any invisible bidi control the lines carry. */
export function LogView({ label, lines, copyable = true, maxLines = 12, follow = true }: LogViewProps) {
  const { messages } = useStoaFormat();
  const region = useRef<HTMLPreElement>(null);
  // Whether the newest line is kept in view: true while the reader is at
  // the end. A ref, so a scroll does not render; `away` shows the button.
  const following = useRef(true);
  const [away, setAway] = useState(false);

  const toEnd = () => {
    const el = region.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  const onScroll = () => {
    const el = region.current;
    if (!el) return;
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < END_SLACK;
    following.current = atEnd;
    setAway(!atEnd);
  };
  // New lines: back to the end, before the frame is painted, if the reader
  // was there.
  useLayoutEffect(() => {
    if (follow && following.current) toEnd();
  }, [lines, follow]);
  // A box that changes width wraps its lines anew, and its end moves.
  useEffect(() => {
    const el = region.current;
    const View = el?.ownerDocument.defaultView;
    if (!follow || !el || !View || typeof View.ResizeObserver !== "function") return;
    const observer = new View.ResizeObserver(() => {
      if (following.current) toEnd();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [follow]);

  const jump = () => {
    following.current = true;
    setAway(false);
    toEnd();
    region.current?.focus({ preventScroll: true });
  };

  return (
    <Frame
      label={label}
      text={lines.map(lineText).join("\n").replace(BIDI_CONTROLS, "")}
      copyable={copyable}
      maxLines={maxLines}
      className="stoa-code--log"
      scrollRef={region}
      onScroll={follow ? onScroll : undefined}
      action={
        follow && away ? (
          <Button className="stoa-code__jump" onPress={jump}>
            {messages.jumpToLatest}
          </Button>
        ) : null
      }
    >
      {lines.map((line, i) => (
        <span key={i} className="stoa-code__line">
          {typeof line === "string" ? (
            line
          ) : (
            <>
              {line.time && (
                <>
                  <span className="stoa-code__time" dir="ltr">
                    {line.time}
                  </span>{" "}
                </>
              )}
              {line.level && (
                <>
                  <bdi className="stoa-code__level">{line.level}</bdi>{" "}
                </>
              )}
              <bdi className="stoa-code__message">{line.text}</bdi>
            </>
          )}
          {i < lines.length - 1 && "\n"}
        </span>
      ))}
    </Frame>
  );
}

export type CodeViewProps = {
  /** Names the code, visibly and for assistive technology. */
  label: string;
  code: string;
  /** Line numbers before each line, hidden from assistive technology and
   * left out of a copy. */
  lineNumbers?: boolean;
  /** A Copy button for the code. On by default. */
  copyable?: boolean;
  /** Lines shown before the code scrolls. 20 by default. */
  maxLines?: number;
};

/** Code in the monospace face, always left to right. */
export function CodeView({ label, code, lineNumbers = false, copyable = true, maxLines = 20 }: CodeViewProps) {
  const lines = code.split("\n");
  const digits = String(lines.length).length;
  return (
    <Frame
      label={label}
      text={code}
      copyable={copyable}
      maxLines={maxLines}
      className={lineNumbers ? "stoa-code--numbered" : ""}
      style={{ "--code-digits": digits } as CSSProperties}
    >
      <code>
        {lines.map((line, i) => (
          <span key={i} className="stoa-code__line">
            {lineNumbers && (
              <span className="stoa-code__number" aria-hidden="true">
                {i + 1}
              </span>
            )}
            {line}
            {i < lines.length - 1 && "\n"}
          </span>
        ))}
      </code>
    </Frame>
  );
}
