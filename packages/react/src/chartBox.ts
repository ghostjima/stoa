import { useLayoutEffect, useState, type RefObject } from "react";

export type ChartBox = {
  /** The element's content width, in CSS pixels. */
  width: number;
  /** Its computed font size, in CSS pixels: the axis labels' size, which
   * the stylesheet sets from the type tokens. */
  fontSize: number;
};

/** Width before the first measurement, and where nothing can be measured
 * (jsdom has no layout). */
const FALLBACK: ChartBox = { width: 480, fontSize: 11 };

/** The width and font size of a chart's drawing area, kept current as it
 * resizes, so an SVG chart draws in CSS pixels at its real width rather
 * than scaling a fixed drawing (which would shrink its text on a phone). */
export function useChartBox(el: RefObject<HTMLElement | null>): ChartBox {
  const [box, setBox] = useState<ChartBox>(FALLBACK);
  useLayoutEffect(() => {
    const node = el.current;
    const view = node?.ownerDocument.defaultView;
    if (!node || !view) return;
    const measure = () => {
      const width = node.clientWidth;
      const fontSize = parseFloat(view.getComputedStyle(node).fontSize);
      if (width <= 0) return;
      setBox((old) =>
        old.width === width && old.fontSize === (fontSize || old.fontSize) ? old : { width, fontSize: fontSize || old.fontSize },
      );
    };
    measure();
    if (typeof view.ResizeObserver !== "function") return;
    const observer = new view.ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [el]);
  return box;
}
