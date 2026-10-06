import type { ReactNode } from "react";
import { ListBox, ListBoxItem, Text } from "react-aria-components";
import { useStoaFormat } from "./locale";

export type RecordListItem = {
  /** Stable id, reported by `onChange`. */
  id: string;
  /** The record's name ("RU000A1234"): the row's accessible name, and
   * what typing a letter jumps to. */
  label: string;
  /** A second line under the name ("Gazprom, 2027"), read as the row's
   * description. */
  description?: ReactNode;
  /** A short value at the end of the row ("7.52%"), in the numeric face. */
  meta?: ReactNode;
  isDisabled?: boolean;
};

export type RecordListProps = {
  /** Names the list for assistive technology ("Bonds"). */
  label: string;
  items: RecordListItem[];
  /** The id of the record the detail shows; null for none yet. */
  value: string | null;
  onChange: (id: string) => void;
  /** What the list says with no items; the locale's "No items." by
   * default. */
  emptyText?: ReactNode;
};

/** The list of a master-detail view: records to pick one from, the
 * picked one shown in a detail beside the list. A listbox (React Aria's
 * ListBox) with single selection: the arrow keys, Home and End move the
 * focus, Enter, Space or a click picks the focused record, and typing a
 * name jumps to it. The picked record is the selected option
 * (aria-selected), marked with a bar at its start edge and a heavier
 * name, not by colour alone; it stays picked when it is pressed again.
 * One Tab stop for the whole list. */
export function RecordList({ label, items, value, onChange, emptyText }: RecordListProps) {
  const { messages } = useStoaFormat();
  return (
    <ListBox
      aria-label={label}
      className="stoa-record-list"
      items={items}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={value === null ? [] : [value]}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const [first] = keys;
        if (first !== undefined) onChange(String(first));
      }}
      disabledKeys={items.filter((item) => item.isDisabled).map((item) => item.id)}
      renderEmptyState={() => <div className="stoa-record-list__empty">{emptyText ?? messages.listEmpty}</div>}
    >
      {(item) => (
        <ListBoxItem id={item.id} textValue={item.label} className="stoa-record-list__row">
          <span className="stoa-record-list__text">
            <Text slot="label" className="stoa-record-list__label">
              {item.label}
            </Text>
            {item.description !== undefined && (
              <Text slot="description" className="stoa-record-list__description">
                {item.description}
              </Text>
            )}
          </span>
          {item.meta !== undefined && <span className="stoa-record-list__meta">{item.meta}</span>}
        </ListBoxItem>
      )}
    </ListBox>
  );
}
