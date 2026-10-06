import { useEffect, useRef, type ReactNode } from "react";
import { ListBox, ListBoxItem, Text } from "react-aria-components";
import { keepFocusInPlace } from "./focus";
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
 * One Tab stop for the whole list. Its rows are drawn from the first
 * frame, never after a frame of "No items."
 *
 * A pick may remove the list (on a narrow screen the detail replaces it):
 * a pointer picks on release, once the press is over, so the release does
 * not land on whatever took the list's place; Enter's own default action
 * is cancelled, so it does not press the control that takes the focus;
 * and if the list leaves the document with the focus in it, the focus
 * goes to the tab stop that stands where it was, never to the page's
 * body. */
export function RecordList({ label, items, value, onChange, emptyText }: RecordListProps) {
  const { messages } = useStoaFormat();
  const list = useRef<HTMLDivElement>(null);
  // A pick from the keyboard happens on Enter's key down. React Aria
  // leaves Enter's default action in place on macOS, and that action
  // clicks whatever button has the focus once the event is over: the one
  // the focus moved to, when the pick removed the list.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") e.preventDefault();
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <ListBox
      ref={list}
      aria-label={label}
      className="stoa-record-list"
      items={items}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={value === null ? [] : [value]}
      shouldSelectOnPressUp
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const [first] = keys;
        if (first === undefined) return;
        if (list.current) keepFocusInPlace(list.current);
        onChange(String(first));
      }}
      disabledKeys={items.filter((item) => item.isDisabled).map((item) => item.id)}
      renderEmptyState={() =>
        items.length > 0 ? (
          // React Aria builds the rows from a first, hidden render, so on a
          // page's first load the list's first commit has none yet, and the
          // browser could paint "No items." for a frame before the rows. The
          // rows are drawn as they will be until then, hidden from assistive
          // technology, which reads the real ones a commit later.
          <div className="stoa-record-list__drawn" aria-hidden="true">
            {items.map((item) => (
              <div
                key={item.id}
                className="stoa-record-list__row"
                data-selected={item.id === value || undefined}
                data-disabled={item.isDisabled || undefined}
              >
                <span className="stoa-record-list__text">
                  <span className="stoa-record-list__label">{item.label}</span>
                  {item.description !== undefined && <span className="stoa-record-list__description">{item.description}</span>}
                </span>
                {item.meta !== undefined && <span className="stoa-record-list__meta">{item.meta}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="stoa-record-list__empty">{emptyText ?? messages.listEmpty}</div>
        )
      }
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
