import type { ComponentProps, ReactNode } from "react";
import { Chevron } from "./Chevron";

export type DisclosureProps = Omit<ComponentProps<"details">, "children" | "open"> & {
  /** What the summary row says; the chevron is drawn before it. */
  summary: ReactNode;
  children: ReactNode;
  /** Open on first render. The person opens and closes it after that. */
  defaultOpen?: boolean;
};

/** A section that opens and closes, on the native details element: the
 * summary is a button to assistive technology, and Enter or Space toggles
 * it. The chevron is the Select's, pointing to the end of the line while
 * closed and down while open. */
export function Disclosure({ summary, children, defaultOpen = false, className, ...rest }: DisclosureProps) {
  return (
    <details {...rest} className={`stoa-disclosure ${className ?? ""}`.trim()} open={defaultOpen}>
      <summary className="stoa-disclosure__summary">
        <Chevron className="stoa-disclosure__chevron" />
        {summary}
      </summary>
      <div className="stoa-disclosure__content">{children}</div>
    </details>
  );
}
