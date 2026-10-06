// The viewport's width class, from Stoa's breakpoint tokens, and media
// queries as React state.
import { useEffect, useState } from "react";

/** Up to "narrow" a phone; from "wide" a desktop with panes side by side;
 * "medium" between them. */
export type Breakpoint = "narrow" | "medium" | "wide";

/** The breakpoint tokens' values (`--stoa-breakpoint-narrow` and
 * `--stoa-breakpoint-wide` in tokens.css), for where the stylesheet is not
 * loaded. A media query cannot read a CSS variable, so `useBreakpoint`
 * reads the variables once and builds its queries from them. */
export const BREAKPOINTS = { narrow: "40rem", wide: "64rem" } as const;

/** The media queries for the breakpoints: narrow is a width up to
 * `narrow`, wide one from `wide`. They read the tokens from the document
 * when tokens.css is loaded, else `BREAKPOINTS`. */
export function breakpointQueries(doc: Document | undefined = typeof document === "undefined" ? undefined : document): Record<"narrow" | "wide", string> {
  const style = doc?.defaultView?.getComputedStyle(doc.documentElement);
  const read = (name: string, fallback: string) => style?.getPropertyValue(name).trim() || fallback;
  return {
    narrow: `(max-width: ${read("--stoa-breakpoint-narrow", BREAKPOINTS.narrow)})`,
    wide: `(min-width: ${read("--stoa-breakpoint-wide", BREAKPOINTS.wide)})`,
  };
}

const matches = (query: string) => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;

/** Whether a media query matches now, kept current as it changes. False
 * where there is no window or no matchMedia. */
export function useMediaQuery(query: string): boolean {
  const [matched, setMatched] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const follow = () => setMatched(list.matches);
    follow();
    list.addEventListener("change", follow);
    return () => list.removeEventListener("change", follow);
  }, [query]);
  return matched;
}

/** The viewport's width class: "narrow", "medium" or "wide", kept current
 * as the window is resized. "medium" where nothing can be measured. */
export function useBreakpoint(): Breakpoint {
  const [queries] = useState(() => breakpointQueries());
  const narrow = useMediaQuery(queries.narrow);
  const wide = useMediaQuery(queries.wide);
  return narrow ? "narrow" : wide ? "wide" : "medium";
}
