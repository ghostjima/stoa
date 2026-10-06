// The block size of the region the page scrolls in. PageShell keeps the
// header at the top of the window and scrolls the region under it, so a
// sticky side panel has to fit that region, whose height is the window's
// less the header's; the header wraps on a narrow window, so the height is
// measured rather than assumed.
import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** A ref for an element inside the shell's scrolling region, and that
 * region's client block size in CSS pixels (0 until it is measured). */
export function useRegionBlockSize(): [RefObject<HTMLDivElement | null>, number] {
  const inside = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  useLayoutEffect(() => {
    const region = inside.current?.closest<HTMLElement>(".stoa-page-shell__scroll");
    if (!region) return;
    const measure = () => setSize(region.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);
  return [inside, size];
}
