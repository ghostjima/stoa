import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Controls";
import { DescriptionList } from "./DescriptionList";
import { useStoaFormat } from "./locale";

/** How long the result of a copy stays on screen, in ms. */
const COPY_STATUS_MS = 2000;

export type LetterGround = {
  /** Stable key. */
  id: string;
  /** The ground as the letter cites it ("161-FZ, art. 8, part 3.4"): kept
   * in its own direction. */
  citation: string;
  /** What the ground says, briefly. */
  text: ReactNode;
};

export type LetterProps = {
  /** Names the letter ("Reply to the client"): its caption, and what the
   * Copy button copies. */
  label: string;
  /** Keep the label for assistive technology only, under a visible
   * heading. */
  hideLabel?: boolean;
  /** The letter, one sentence a line, as it will be sent. */
  lines: string[];
  /** The letter's language ("ru"): set on the quotation, so it is read
   * and hyphenated in its own language whatever the page's. */
  lang: string;
  /** The grounds the letter cites, listed under it: each citation with
   * what it says. */
  grounds?: LetterGround[];
  /** The line above the grounds; the locale's "Grounds cited" by
   * default. */
  groundsLabel?: string;
  /** A Copy button that puts the letter on the clipboard as plain text.
   * On by default. */
  copyable?: boolean;
};

/** Direction marks and embeddings (LRM, RLM, ALM, LRE to RLO, LRI to
 * PDI): invisible, and kept out of a copy. */
const DIRECTION_MARKS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** The letter as plain text: its lines, one a line, without invisible
 * direction marks, so it is pasted as it reads. The grounds are not part
 * of it: they are for the reader of the page, not for the addressee. */
export function letterText(lines: string[]): string {
  return lines.map((line) => line.replace(DIRECTION_MARKS, "")).join("\n");
}

/**
 * A letter as it will be sent, one sentence a line, set off as a
 * quotation (a blockquote in the letter's own language, inside a figure
 * that its label names), with the grounds it cites as a description list
 * under it: each citation and what it says. Copy puts the letter on the
 * clipboard as plain text, announcing that it did, politely.
 */
export function Letter({ label, hideLabel = false, lines, lang, grounds = [], groundsLabel, copyable = true }: LetterProps) {
  const { messages } = useStoaFormat();
  const labelId = useId();
  const [status, setStatus] = useState<"copied" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letterText(lines));
      setStatus("copied");
    } catch {
      // No clipboard (an insecure page, a denied permission): say so.
      setStatus("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), COPY_STATUS_MS);
  };

  return (
    <figure className="stoa-letter" aria-labelledby={labelId}>
      <figcaption id={labelId} className={hideLabel ? "stoa-visually-hidden" : "stoa-letter__label"}>
        {label}
      </figcaption>
      {copyable && (
        <div className="stoa-letter__bar">
          <span role="status" className="stoa-letter__status">
            {status === "copied" ? messages.copied : status === "failed" ? messages.copyFailed : ""}
          </span>
          <Button size="small" aria-describedby={labelId} onPress={copy}>
            {messages.copy}
          </Button>
        </div>
      )}
      <blockquote className="stoa-letter__text" lang={lang} dir="auto">
        {lines.map((line, i) => (
          <p key={i} dir="auto">
            {line}
          </p>
        ))}
      </blockquote>
      {grounds.length > 0 && (
        <div className="stoa-letter__grounds">
          <p className="stoa-letter__grounds-label">{groundsLabel ?? messages.letterGrounds}</p>
          <DescriptionList
            layout="stacked"
            items={grounds.map((ground) => ({ id: ground.id, term: <bdi>{ground.citation}</bdi>, description: ground.text }))}
          />
        </div>
      )}
    </figure>
  );
}
