import { useEffect, useRef, useState, type ComponentProps } from "react";

export type VisuallyHiddenProps = ComponentProps<"span">;

/** Text for assistive technology only: kept in the accessibility tree and
 * read in order, but drawn nowhere (Stoa's `stoa-visually-hidden` class). */
export function VisuallyHidden({ className, ...rest }: VisuallyHiddenProps) {
  return <span {...rest} className={`stoa-visually-hidden ${className ?? ""}`.trim()} />;
}

export type LiveRegionProps = {
  /** The text to announce. Each change is read out, at most once every
   * `announceEvery` milliseconds. */
  children?: string;
  /** "polite" waits for the screen reader to finish what it is saying
   * (role status); "assertive" interrupts it (role alert), for errors that
   * need attention now. */
  politeness?: "polite" | "assertive";
  /** Least time between two announcements, in milliseconds. A value that
   * changes many times a second (a price, a counter) would otherwise flood
   * the screen reader; the region follows at most this often and always
   * ends on the latest text. */
  announceEvery?: number;
  /** Draw the text as well. Off by default: the region is for assistive
   * technology, and the same information is shown elsewhere. */
  visible?: boolean;
};

/** A live region: text that screen readers read out when it changes,
 * without moving focus.
 *
 * The region is in the document before its first text, which is set from
 * an effect after mount: a live region that arrives together with its
 * text is not announced by every screen reader. */
export function LiveRegion({ children = "", politeness = "polite", announceEvery = 500, visible = false }: LiveRegionProps) {
  const [text, setText] = useState("");
  const latest = useRef(children);
  const lastPublished = useRef(Number.NEGATIVE_INFINITY);
  const trailing = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = children;
    const publish = () => {
      trailing.current = null;
      lastPublished.current = performance.now();
      setText(latest.current);
    };
    const wait = announceEvery - (performance.now() - lastPublished.current);
    if (wait <= 0) publish();
    else trailing.current ??= setTimeout(publish, wait);
  }, [children, announceEvery]);
  useEffect(
    () => () => {
      if (trailing.current) clearTimeout(trailing.current);
      // Cleared, so a remount (strict mode runs effects twice) schedules again.
      trailing.current = null;
    },
    [],
  );

  return (
    <div
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
      className={visible ? "stoa-live-region" : "stoa-visually-hidden"}
    >
      {text}
    </div>
  );
}
