import type { Key, ReactNode } from "react";

export type DescriptionItem = {
  /** A stable key for the pair; the term itself when it is a string. */
  id?: Key;
  /** What the value is ("Coupon"). */
  term: ReactNode;
  /** The value ("7.5%, twice a year"). */
  description: ReactNode;
  /** A number or an amount: drawn in the numeric face with tabular
   * figures, so values in a column line up. */
  numeric?: boolean;
};

export type DescriptionListProps = {
  items: DescriptionItem[];
  /** "columns" (the default): the terms in one column, each value beside
   * its term, for a pane with room. "stacked": each value under its term,
   * for a narrow pane. */
  layout?: "columns" | "stacked";
};

/** A read-only record as terms and values: a description list (dl), each
 * term (dt) with its value (dd), in the density's type size and spacing.
 * Not interactive, and never a tab stop. The columns are laid out with
 * logical properties, so the terms are at the right in a right-to-left
 * page. Each value takes the direction of its own text (`dir="auto"`,
 * from its first letter), so "4 Sep 2027" reads left to right in a
 * right-to-left list and an Arabic value right to left in a left-to-right
 * one; it still lines up at the list's start edge, beside its term. An
 * empty list draws nothing. */
export function DescriptionList({ items, layout = "columns" }: DescriptionListProps) {
  if (items.length === 0) return null;
  return (
    <dl className={`stoa-description-list stoa-description-list--${layout}`}>
      {items.map((item, index) => (
        <div key={item.id ?? (typeof item.term === "string" ? item.term : index)} className="stoa-description-list__item">
          <dt className="stoa-description-list__term">{item.term}</dt>
          <dd
            dir="auto"
            className={item.numeric ? "stoa-description-list__value stoa-description-list__value--numeric" : "stoa-description-list__value"}
          >
            {item.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}
