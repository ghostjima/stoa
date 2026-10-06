/** The one chevron Stoa draws: in a Select's button, on a Disclosure's
 * summary. It points down; a component that needs another direction
 * rotates it in CSS. Decorative, so hidden from assistive technology. */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={`stoa-chevron ${className ?? ""}`.trim()}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 10 6"
      width="10"
      height="6"
    >
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
