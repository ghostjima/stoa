import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button as AriaButton, DropIndicator, GridList, GridListItem, useDragAndDrop, type Key } from "react-aria-components";
import { Chevron } from "./Chevron";
import { Button } from "./Controls";
import { useStoaFormat } from "./locale";

export type ReorderableItem = {
  /** Stable key. */
  id: string;
  /** The item as plain text: names its buttons and the announcements. */
  textValue: string;
};

export type ReorderableListProps<T extends ReorderableItem> = {
  /** Names the list for assistive technology. */
  label: string;
  items: T[];
  /** Called with the items in their new order. */
  onReorder: (items: T[]) => void;
  /** The visible content of one item. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Shows a Remove button on each item when given. */
  onRemove?: (item: T) => void;
  /** Drag and drop as well as the move buttons. On by default. */
  allowsDragging?: boolean;
  /** What the list says while it has no items; the locale's "No items." by
   * default. */
  emptyText?: ReactNode;
  /** Extra classes on one item's row. */
  itemClassName?: (item: T) => string;
};

/** Moves the items whose keys are in `keys` before or after `target`,
 * keeping their order. Items not found are left where they are. */
export function reorderItems<T extends ReorderableItem>(items: T[], keys: Set<Key>, target: Key, position: "before" | "after"): T[] {
  const moving = items.filter((item) => keys.has(item.id));
  const rest = items.filter((item) => !keys.has(item.id));
  const at = rest.findIndex((item) => item.id === target);
  if (moving.length === 0 || at < 0) return items;
  const index = position === "after" ? at + 1 : at;
  return [...rest.slice(0, index), ...moving, ...rest.slice(index)];
}

type MoveControl = "up" | "down";

/** A list whose order the person sets: each item has Move up and Move down
 * buttons named after it, rows can be dragged with a pointer or, from
 * their drag button, with the keyboard (React Aria's GridList), and every
 * move is announced politely with the item's new position.
 *
 * Keyboard: the list is one tab stop; the up and down arrows move between
 * items, the left and right arrows between an item's buttons. When a move
 * takes an item to an end of the list, the button that moved it is
 * disabled there, so focus goes to the other move button. */
export function ReorderableList<T extends ReorderableItem>({
  label,
  items,
  onReorder,
  renderItem,
  onRemove,
  allowsDragging = true,
  emptyText,
  itemClassName,
}: ReorderableListProps<T>) {
  const { messages, integer } = useStoaFormat();
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ id: string; control: MoveControl } | null>(null);

  const announceMove = (next: T[], item: T) => {
    setAnnouncement(messages.moved(item.textValue, integer(next.indexOf(item) + 1), integer(next.length)));
  };

  const move = (index: number, control: MoveControl) => {
    const item = items[index];
    const to = control === "up" ? index - 1 : index + 1;
    if (!item || to < 0 || to >= items.length) return;
    const next = items.filter((other) => other !== item);
    next.splice(to, 0, item);
    const atEnd = control === "up" ? to === 0 : to === items.length - 1;
    if (atEnd) pendingFocus.current = { id: item.id, control: control === "up" ? "down" : "up" };
    onReorder(next);
    announceMove(next, item);
  };

  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const buttons = root.current?.querySelectorAll<HTMLElement>("[data-move]") ?? [];
    [...buttons].find((button) => button.dataset.item === pending.id && button.dataset.move === pending.control)?.focus();
  });

  const { dragAndDropHooks } = useDragAndDrop<T>({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": items.find((item) => item.id === key)?.textValue ?? String(key) })),
    onReorder: (event) => {
      if (event.target.dropPosition === "on") return;
      const next = reorderItems(items, event.keys, event.target.key, event.target.dropPosition);
      onReorder(next);
      const [first] = event.keys;
      const item = next.find((other) => other.id === first);
      if (item) announceMove(next, item);
    },
    renderDropIndicator: (target) => <DropIndicator target={target} className="stoa-reorder__drop" />,
  });

  return (
    <div ref={root} className="stoa-reorder">
      <GridList
        aria-label={label}
        className="stoa-reorder__list"
        dragAndDropHooks={allowsDragging ? dragAndDropHooks : undefined}
        renderEmptyState={() => <span className="stoa-reorder__empty">{emptyText ?? messages.listEmpty}</span>}
      >
        {items.map((item, index) => (
          <GridListItem
            key={item.id}
            id={item.id}
            textValue={item.textValue}
            className={`stoa-reorder__item ${itemClassName?.(item) ?? ""}`.trim()}
          >
            {allowsDragging && (
              <AriaButton slot="drag" className="stoa-reorder__handle">
                <span aria-hidden="true">⋮⋮</span>
              </AriaButton>
            )}
            <div className="stoa-reorder__content">{renderItem(item, index)}</div>
            <div className="stoa-reorder__controls">
              <Button
                data-item={item.id}
                data-move="up"
                className="stoa-reorder__move stoa-reorder__move--up"
                aria-label={messages.moveUp(item.textValue)}
                isDisabled={index === 0}
                onPress={() => move(index, "up")}
              >
                <Chevron />
              </Button>
              <Button
                data-item={item.id}
                data-move="down"
                className="stoa-reorder__move"
                aria-label={messages.moveDown(item.textValue)}
                isDisabled={index === items.length - 1}
                onPress={() => move(index, "down")}
              >
                <Chevron />
              </Button>
              {onRemove && (
                <Button
                  className="stoa-reorder__remove"
                  aria-label={messages.remove(item.textValue)}
                  onPress={() => {
                    onRemove(item);
                    setAnnouncement(messages.removed(item.textValue));
                  }}
                >
                  <span aria-hidden="true">×</span>
                </Button>
              )}
            </div>
          </GridListItem>
        ))}
      </GridList>
      <div role="status" className="stoa-visually-hidden">
        {announcement}
      </div>
    </div>
  );
}
