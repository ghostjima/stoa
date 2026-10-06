// Resolved design tokens for canvas drawing: canvases cannot read CSS
// variables, so components read them once per theme change.

import { useEffect, useRef, type RefObject } from "react";

export type CanvasTokens = {
  surface: string;
  text: string;
  muted: string;
  border: string;
  bid: string;
  ask: string;
  bidWash: string;
  askWash: string;
  accent: string;
  rowHeight: number;
  /** Numbers: the density's type size in the numeric face. */
  font: string;
  /** Words (an empty state, a side marker that is a word): the same size
   * in the sans face, so running Arabic text is never set in the numeric
   * face. */
  wordFont: string;
};

export function readCanvasTokens(el: Element): CanvasTokens {
  // Resolve through the element's own window: a preview portalled into an
  // iframe lives in another realm, whose styles the top-level
  // `getComputedStyle` is not guaranteed to resolve.
  const s = (el.ownerDocument.defaultView ?? window).getComputedStyle(el);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    surface: v("--stoa-color-surface"),
    text: v("--stoa-color-text"),
    muted: v("--stoa-color-text-muted"),
    border: v("--stoa-color-border"),
    bid: v("--stoa-color-bid"),
    ask: v("--stoa-color-ask"),
    bidWash: v("--stoa-color-up-wash"),
    askWash: v("--stoa-color-down-wash"),
    accent: v("--stoa-color-accent"),
    // Without the token, the regular density's row height.
    rowHeight: parseFloat(v("--stoa-density-row-height")) || 28,
    font: `${v("--stoa-density-font-size") || "12px"} ${v("--stoa-font-family-mono") || "monospace"}`,
    wordFont: `${v("--stoa-density-font-size") || "12px"} ${v("--stoa-font-family-sans") || "sans-serif"}`,
  };
}

/** Custom event type dispatched on a preview root to tell every canvas
 * component whose element sits under that root to re-read its tokens and
 * redraw, even while paused. Any ancestor of the component works, since
 * listeners key off `Node.contains`, not the exact target, and listen in
 * the capture phase, so the event arrives whether or not it bubbles and
 * whether or not some other listener stops its propagation. Carries no
 * `detail`: it is a signal to re-read tokens, not a diff of what changed. */
export const TOKENS_EVENT = "stoa:tokens";

/** Dispatches {@link TOKENS_EVENT} on `root`. Call this after changing
 * token CSS variables on `root` (for example when a playground re-themes
 * one preview frame). `bubbles` is not required for `useTokenSignal`
 * listeners, which use the capture phase, but is left on in case a
 * caller also wants a bubble-phase listener of its own. */
export function signalTokensChanged(root: Element): void {
  root.dispatchEvent(new CustomEvent(TOKENS_EVENT, { bubbles: true }));
}

/** Whether `target` is a node that has `node` inside it. `target instanceof
 * Node` would be false for an event target from another realm (a preview
 * portalled into an iframe brings its own `Node` constructor), so this
 * tests for the method rather than for the constructor. */
function containsNode(target: EventTarget | null, node: Node): boolean {
  const candidate = target as Node | null;
  return candidate !== null && typeof candidate.contains === "function" && candidate.contains(node);
}

/**
 * Subscribes a canvas component to every source that can change the
 * tokens it reads from `el.current`, and calls `redraw` each time:
 *
 * - a {@link TOKENS_EVENT} dispatched on an ancestor of `el.current`
 *   (the primary mechanism: it needs no plumbing through intermediate
 *   components, and one dispatch on a preview root reaches every canvas
 *   underneath it, however deeply nested);
 * - `tokensVersion` changing (an alternative for a React caller that
 *   already tracks a version number in state and would rather bump a
 *   prop than dispatch a DOM event);
 * - the existing `<html>` `data-theme`/`data-density` attributes, and the
 *   OS colour scheme, so that global theming keeps working unchanged.
 *
 * The event listener is registered in the capture phase, on
 * `el.current`'s own `ownerDocument` rather than the top-level
 * `document`, so a preview rendered inside an iframe still gets the
 * signal, and so does a listener whose event does not bubble or whose
 * propagation an ancestor stops during its own bubble-phase handling
 * (that happens on the way back up, after this listener has already
 * fired on the way down).
 *
 * `redraw` is read through a ref, so subscribing does not depend on its
 * identity being stable across renders, and nothing here dispatches
 * {@link TOKENS_EVENT} itself, so there is no feedback loop.
 */
export function useTokenSignal(el: RefObject<Element | null>, tokensVersion: number | undefined, redraw: () => void): void {
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  useEffect(() => {
    const doc = el.current?.ownerDocument ?? document;
    const onEvent = (e: Event) => {
      const child = el.current;
      if (child && containsNode(e.target, child)) redrawRef.current();
    };
    const onChange = () => redrawRef.current();
    doc.addEventListener(TOKENS_EVENT, onEvent, true);
    // Read `matchMedia` from the element's own window, not the top-level
    // one, so a preview inside an iframe listens in its own realm. jsdom
    // (used in tests) has no matchMedia; skip the OS listener there.
    const view = doc.defaultView;
    const mq = typeof view?.matchMedia === "function" ? view.matchMedia("(prefers-color-scheme: dark)") : null;
    mq?.addEventListener("change", onChange);
    const mo = new MutationObserver(onChange);
    mo.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-density"] });
    return () => {
      doc.removeEventListener(TOKENS_EVENT, onEvent, true);
      mq?.removeEventListener("change", onChange);
      mo.disconnect();
    };
  }, [el]);

  useEffect(() => {
    if (tokensVersion !== undefined) redrawRef.current();
  }, [tokensVersion]);
}

/**
 * Calls `invalidate` once whenever `tokensVersion` changes, from an effect
 * that runs before the ones declared after it. A component declares this
 * above the effect that draws from its data prop, so that a version bump
 * arriving together with a data prop drops the cached tokens first and the
 * data draw reads fresh ones. Without it, such a render drew twice: once
 * with the stale cached tokens from the data effect, then again from
 * {@link useTokenSignal}'s own redraw.
 *
 * The comparison is kept in a ref written from the effect, not during
 * render, so a render that React throws away leaves nothing behind.
 */
export function useInvalidateOnTokensVersion(tokensVersion: number | undefined, invalidate: () => void): void {
  const seen = useRef(tokensVersion);
  // No dependency array: the effect runs after every render with that
  // render's own `invalidate`, so the callback is never a stale closure.
  useEffect(() => {
    if (tokensVersion !== seen.current) {
      seen.current = tokensVersion;
      invalidate();
    }
  });
}

/**
 * Calls `redraw` when a canvas's box no longer matches its bitmap: the box
 * changed size (a window resized, a panel opened beside it) or the device
 * pixel ratio changed (a window moved to another screen, the page zoomed).
 * A canvas is only drawn when its data changes, so without this a paused
 * view keeps its old bitmap, stretched or squeezed to the new box.
 * `redraw` is read through a ref; it is the component's to skip while it
 * has drawn nothing yet. jsdom has neither observer; nothing runs there.
 */
export function useCanvasRefit(canvas: RefObject<HTMLCanvasElement | null>, redraw: () => void): void {
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;
  useEffect(() => {
    const el = canvas.current;
    const View = el?.ownerDocument.defaultView;
    if (!el || !View || typeof View.ResizeObserver !== "function") return;
    const stale = () => el.width !== Math.round(el.clientWidth * (View.devicePixelRatio || 1));
    const observer = new View.ResizeObserver(() => {
      if (stale()) redrawRef.current();
    });
    observer.observe(el);
    // A media query that matches the current ratio, renewed each time it
    // stops matching.
    let ratio: MediaQueryList | null = null;
    const onRatio = () => {
      watchRatio();
      redrawRef.current();
    };
    const watchRatio = () => {
      ratio?.removeEventListener("change", onRatio);
      ratio = typeof View.matchMedia === "function" ? View.matchMedia(`(resolution: ${View.devicePixelRatio || 1}dppx)`) : null;
      ratio?.addEventListener("change", onRatio);
    };
    watchRatio();
    return () => {
      observer.disconnect();
      ratio?.removeEventListener("change", onRatio);
    };
  }, [canvas]);
}

/** Size a canvas for its CSS box and the device pixel ratio; returns the
 * 2D context with the transform set to CSS pixels. */
export function fitCanvas(canvas: HTMLCanvasElement, cssHeight: number): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(cssHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.height = `${cssHeight}px`;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** The empty state, centred on the canvas in text-muted on surface. */
export function drawEmpty(ctx: CanvasRenderingContext2D, t: CanvasTokens, text: string, width: number, height: number) {
  ctx.font = t.wordFont;
  ctx.fillStyle = t.muted;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
}
