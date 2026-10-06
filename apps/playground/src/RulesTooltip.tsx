// The checks that read a token, shown beside the side panel while that
// token's field is being edited. It is drawn in the document, outside the
// side panel's scrolling box, at the height of the field, and follows the
// field when either scrolls.
//
// Screen readers do not need it: the field is already described by the
// same list (see TokenControl), so this copy is hidden from them.
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { TokenRuleRef } from "./browserChecks";

/** Space between the tooltip and the panel, the field or the window edge. */
const GAP = 8;
/** Narrower than this beside the panel, and the tooltip goes under the
 * field instead (a narrow window, where the panel sits above the frames). */
const MIN_WIDTH = 240;
const MAX_WIDTH = 360;

type Place = { top: number; left: number; width: number };

export function RulesTooltip({ anchor, title, rules }: { anchor: RefObject<HTMLElement | null>; title: string; rules: TokenRuleRef[] }) {
  const tip = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const field = anchor.current;
      if (!field) return;
      const box = field.getBoundingClientRect();
      const panel = field.closest(".pg-side")?.getBoundingClientRect() ?? box;
      const room = window.innerWidth - panel.right - GAP * 2;
      const height = tip.current?.offsetHeight ?? 0;
      const next =
        room >= MIN_WIDTH
          ? { top: box.top, left: panel.right + GAP, width: Math.min(MAX_WIDTH, room) }
          : { top: box.bottom + GAP / 2, left: box.left, width: box.width };
      // Kept inside the window: a field near the bottom lifts its tooltip.
      next.top = Math.max(GAP, Math.min(next.top, window.innerHeight - GAP - height));
      setPlace((previous) =>
        previous && previous.top === next.top && previous.left === next.left && previous.width === next.width ? previous : next,
      );
    };
    update();
    // Measured once more after the first paint, when the height is known.
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor]);

  return createPortal(
    <div
      ref={tip}
      className="pg-rules-tip"
      aria-hidden="true"
      data-testid="rules-tooltip"
      style={place ? { top: place.top, left: place.left, inlineSize: place.width } : { visibility: "hidden" }}
    >
      <p className="pg-rules-tip__title">{title}</p>
      <ul className="pg-rules-tip__list">
        {rules.map((rule, index) => (
          <li key={index}>
            {rule.rule}
            {rule.theme ? ` (${rule.theme})` : ""}: {rule.subject}
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  );
}
