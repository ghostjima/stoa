import { createContext, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useStoaFormat } from "./locale";
import { isTypingTarget } from "./Shortcuts";

export type PageShellProps = {
  /** The bar at the top, usually an AppHeader (the banner landmark). */
  header?: ReactNode;
  /** The page's content, inside its one main landmark. */
  children: ReactNode;
  /** Small print at the bottom: sources, terms (the contentinfo landmark). */
  footer?: ReactNode;
  /** "fixed" (the default) keeps the header at the top of the window: the
   * shell is the window's height and the region under the header scrolls,
   * so the scrollbar starts below the header and its lane is reserved.
   * "static" lets the header scroll away with the page. */
  headerPosition?: "fixed" | "static";
};

const SCROLL_KEYS = new Set(["PageDown", "PageUp", " ", "Home", "End", "ArrowDown", "ArrowUp"]);
/** The keys that scroll the page while a control in the header has focus:
 * a button or a switch there does nothing with them. Space and the arrows
 * stay with the control. */
const PAGE_KEYS = new Set(["PageDown", "PageUp", "Home", "End"]);
/** What takes focus from the keyboard. Main itself (tabindex -1, the skip
 * link's target) does not count. */
const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, summary, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';
/** How far a page key moves, as a share of the region's height, and how
 * far an arrow key moves, in pixels: close to what browsers do for a page. */
const PAGE_FRACTION = 0.875;
const LINE = 40;

/** Locks the scrolling of the page shell around it, while a modal overlay
 * is open, and returns the function that unlocks it. React Aria locks the
 * document's scrolling, but the page scrolls in the shell's region, which
 * would go on scrolling behind the overlay (and, for an overlay portalled
 * into the region, scroll the overlay out of view). Null outside a page
 * shell. */
export const PageScrollLock = createContext<(() => () => void) | null>(null);

/** The frame of an application page: a skip link, the header, the main
 * region and an optional footer, as landmarks. The skip link is the first
 * Tab stop, hidden until focused; it moves focus to the main region, past
 * the header's controls, and from there the keyboard scrolls the page.
 * Gutters come from the space tokens; logical properties only, so it
 * mirrors in a right-to-left page. */
export function PageShell({ header, children, footer, headerPosition = "fixed" }: PageShellProps) {
  const { messages } = useStoaFormat();
  const id = useId();
  const main = useRef<HTMLElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const fixed = headerPosition === "fixed";
  // Modal overlays open now; the region does not scroll while any is.
  const [locks, setLocks] = useState(0);
  const locked = useRef(false);
  locked.current = locks > 0;
  const lock = useCallback(() => {
    setLocks((n) => n + 1);
    let held = true;
    return () => {
      if (held) setLocks((n) => n - 1);
      held = false;
    };
  }, []);
  // A region that scrolls must be reachable from the keyboard. When the
  // page holds a control, Tab reaches it and the keys scroll from there;
  // when it holds only text, the region itself becomes a Tab stop, as
  // Chrome and Firefox make such a scroller on their own and Safari does
  // not. A page with controls gets no extra stop.
  const [ownStop, setOwnStop] = useState(false);
  useEffect(() => {
    const region = scroll.current;
    if (!fixed || !region) return;
    const update = () => setOwnStop(region.scrollHeight > region.clientHeight && region.querySelector(FOCUSABLE) === null);
    update();
    const mutations = new MutationObserver(update);
    mutations.observe(region, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["tabindex", "disabled", "href", "contenteditable", "controls"],
    });
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    sizes?.observe(region);
    for (const child of Array.from(region.children)) sizes?.observe(child);
    return () => {
      mutations.disconnect();
      sizes?.disconnect();
    };
  }, [fixed]);
  // A layout effect, so the listener is in place before the page is first
  // painted: a scroll key pressed as soon as the page shows is not lost.
  useLayoutEffect(() => {
    if (!fixed) return;
    // The page scrolls in the region under the header, not the document, and
    // a browser sends a scroll key to the document when nothing is focused,
    // or to the header when one of its controls is, and neither scrolls. So
    // the region scrolls itself by the distances a page would, once every
    // listener has seen the key: an application's own shortcut (Space to
    // play) or a control (Home in a list box) claims it by preventing the
    // default, and focus never moves. Inside the region the browser's own
    // scrolling runs; a dialog portalled outside the shell is left alone.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!SCROLL_KEYS.has(event.key)) return;
      const active = document.activeElement;
      const nothing = !active || active === document.body || active === document.documentElement;
      if (!nothing) {
        if (!shell.current?.contains(active) || scroll.current?.contains(active)) return;
        if (!PAGE_KEYS.has(event.key) || isTypingTarget(active)) return;
      }
      setTimeout(() => {
        const region = scroll.current;
        if (event.defaultPrevented || !region || locked.current) return;
        const page = region.clientHeight * PAGE_FRACTION;
        const back = event.key === "PageUp" || event.key === "ArrowUp" || (event.key === " " && event.shiftKey);
        const by =
          event.key === "Home"
            ? -region.scrollTop
            : event.key === "End"
              ? region.scrollHeight
              : (event.key.startsWith("Arrow") ? LINE : page) * (back ? -1 : 1);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        region.scrollBy({ top: by, behavior: reduce ? "auto" : "smooth" });
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fixed]);
  return (
    <PageScrollLock.Provider value={lock}>
      <div ref={shell} className={`stoa-page-shell${fixed ? " stoa-page-shell--fixed-header" : ""}`}>
        <a
          className="stoa-skip-link"
          href={`#${id}`}
          onClick={(e) => {
            // Focus the target directly: a fragment link moves focus only in
            // some browsers, and would change the URL of a routed page.
            e.preventDefault();
            main.current?.focus();
          }}
        >
          {messages.skipToMain}
        </a>
        {header}
        <div
          ref={scroll}
          className="stoa-page-shell__scroll"
          tabIndex={fixed && ownStop ? 0 : undefined}
          data-scroll-locked={locks > 0 || undefined}
        >
          <main ref={main} id={id} tabIndex={-1} className="stoa-page-shell__main">
            {children}
          </main>
          {footer && <footer className="stoa-page-shell__footer">{footer}</footer>}
        </div>
      </div>
    </PageScrollLock.Provider>
  );
}
