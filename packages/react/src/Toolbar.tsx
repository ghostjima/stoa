import { useEffect, useRef, type ReactNode } from "react";
import { Group, Separator, Toolbar as AriaToolbar } from "react-aria-components";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Home and End go to the first and the last control. React Aria's toolbar
 * moves with the arrow keys only and takes no key handler of its own, so
 * this is a native listener on its element. A control that uses Home and
 * End itself (a text field, a slider) keeps them. */
function onHomeEnd(event: KeyboardEvent) {
  if (event.key !== "Home" && event.key !== "End") return;
  const target = event.target as HTMLElement;
  if (target.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"], [role="slider"]')) return;
  const toolbar = event.currentTarget as HTMLElement;
  const controls = [...toolbar.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const next = event.key === "Home" ? controls[0] : controls[controls.length - 1];
  if (!next) return;
  event.preventDefault();
  next.focus();
}

export type ToolbarProps = {
  /** The name of the toolbar, for assistive technology ("Playback"). */
  label: string;
  /** Buttons, ButtonGroups, ToolbarSeparators, and other controls. */
  children: ReactNode;
};

/** A row of controls that is one Tab stop: Tab enters it (at the control
 * used last) and leaves it in one press, the arrow keys move between its
 * controls, reversed in a right-to-left locale, and Home and End go to the
 * ends. React Aria Toolbar, horizontal; it wraps on a narrow screen. */
export function Toolbar({ label, children }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const toolbar = ref.current;
    if (!toolbar) return;
    toolbar.addEventListener("keydown", onHomeEnd);
    return () => toolbar.removeEventListener("keydown", onHomeEnd);
  }, []);
  return (
    <AriaToolbar ref={ref} aria-label={label} orientation="horizontal" className="stoa-toolbar">
      {children}
    </AriaToolbar>
  );
}

export type ButtonGroupProps = {
  /** A name for the group, when its buttons need one in common
   * ("Zoom"). */
  label?: string;
  children: ReactNode;
};

/** Buttons drawn as one piece: they touch, share their borders, and only
 * the outer corners are rounded. Inside a Toolbar the arrow keys still
 * move through each button; outside one, each is its own Tab stop. */
export function ButtonGroup({ label, children }: ButtonGroupProps) {
  return (
    <Group aria-label={label} className="stoa-button-group">
      {children}
    </Group>
  );
}

/** A line between groups of controls in a Toolbar. */
export function ToolbarSeparator() {
  return <Separator orientation="vertical" className="stoa-toolbar__separator" />;
}
