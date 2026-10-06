import type { ReactNode } from "react";

export type ScrollAreaProps = {
  children: ReactNode;
  /** Names the area as a region and makes it a Tab stop, so it can be
   * scrolled from the keyboard. Give one when the content holds nothing
   * focusable; leave it out when the content's own controls take focus. */
  label?: string;
  /** Sizes the area (a maximum block size, a grid cell); the area itself
   * sets none. */
  className?: string;
};

/** A box that scrolls, with its scrollbar in a reserved lane so the
 * content does not move when it starts or stops overflowing. The
 * scrollbar is drawn like every other scrollbar on a Stoa page. */
export function ScrollArea({ children, label, className }: ScrollAreaProps) {
  return (
    <div
      className={`stoa-scroll-area ${className ?? ""}`.trim()}
      role={label ? "region" : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      {children}
    </div>
  );
}
