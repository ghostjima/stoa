import type { ReactNode } from "react";

export type EmptyStateProps = {
  /** What is missing, in a few words ("No orders yet"). */
  title: ReactNode;
  /** Why it is empty, or what fills it. */
  description?: ReactNode;
  /** A control that fills the region, for example a Button that loads a
   * session. */
  action?: ReactNode;
};

/** A region with nothing to show yet: a title, a description and an
 * optional action, centred in the space the content will take. For
 * regions drawn in HTML; the canvas views (Ladder, Heatmap) draw their
 * own empty text. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="stoa-empty-state">
      <p className="stoa-empty-state__title">{title}</p>
      {description && <p className="stoa-empty-state__description">{description}</p>}
      {action && <div className="stoa-empty-state__action">{action}</div>}
    </div>
  );
}
