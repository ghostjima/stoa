// What goes around a DataGrid: a column chooser and a bar of actions on
// the selected rows.
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./Controls";
import { Sheet } from "./Dialog";
import { ReorderableList } from "./ReorderableList";
import { Checkbox } from "./Toggles";
import { Toolbar } from "./Toolbar";
import { keepFocusInPlace } from "./focus";
import { useStoaFormat } from "./locale";

export type DataGridColumnChooserProps = {
  /** The grid's columns (a DataGrid's `columns` will do): their ids and
   * the names their headers show. */
  columns: readonly { id: string; header: string }[];
  /** Every column's id, in the order shown; a DataGrid's `columnOrder`. */
  order: readonly string[];
  /** The ids of the columns not shown; a DataGrid's `hiddenColumns`. */
  hidden: readonly string[];
  onOrderChange: (order: string[]) => void;
  onHiddenChange: (hidden: string[]) => void;
  /** The button's label and the sheet's title; the locale's "Columns" by
   * default. */
  label?: string;
};

/** The columns in `order` first, then any the order leaves out, in the
 * order of `columns`. */
function ordered(columns: readonly { id: string; header: string }[], order: readonly string[]) {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const first = order.flatMap((id) => {
    const column = byId.get(id);
    return column ? [column] : [];
  });
  return [...first, ...columns.filter((c) => !order.includes(c.id))];
}

/**
 * Which columns a DataGrid shows, and in what order: a "Columns" button
 * that opens a sheet with every column, each with a check box that shows
 * or hides it and Move up and Move down buttons named after it (a
 * ReorderableList, which also takes a drag). The list is one tab stop:
 * the up and down arrows move between columns, the left and right arrows
 * between a column's check box and buttons, and every move is announced
 * with the column's new position. The last column shown cannot be hidden.
 * Closing the sheet returns the focus to the button.
 */
export function DataGridColumnChooser({ columns, order, hidden, onOrderChange, onHiddenChange, label }: DataGridColumnChooserProps) {
  const { messages } = useStoaFormat();
  const title = label ?? messages.gridColumns;
  const items = ordered(columns, order).map((c) => ({ id: c.id, textValue: c.header }));
  const shownCount = items.filter((item) => !hidden.includes(item.id)).length;
  return (
    <Sheet trigger={<Button>{title}</Button>} title={title}>
      <ReorderableList
        label={messages.gridColumnsList}
        items={items}
        allowsDragging={false}
        onReorder={(next) => onOrderChange(next.map((item) => item.id))}
        renderItem={(item) => {
          const shown = !hidden.includes(item.id);
          return (
            <Checkbox
              isSelected={shown}
              isDisabled={shown && shownCount === 1}
              onChange={(on) => onHiddenChange(on ? hidden.filter((id) => id !== item.id) : [...hidden, item.id])}
            >
              {item.textValue}
            </Checkbox>
          );
        }}
      />
    </Sheet>
  );
}

export type DataGridAction = {
  /** Stable key. */
  id: string;
  /** What the action does to the selected rows ("Assign", "Export"). */
  label: ReactNode;
  onPress: () => void;
  variant?: ButtonProps["variant"];
};

export type DataGridSelectionBarProps = {
  /** How many rows are selected. At 0 the bar is not drawn. */
  count: number;
  /** The actions on the selected rows, in order. */
  actions: DataGridAction[];
  /** Unselects every row; the bar's last button. */
  onClear: () => void;
  /** The bar's name; the locale's "Selection" by default. */
  label?: string;
};

/**
 * The actions on a DataGrid's selected rows, while there are some: how
 * many are selected, a button per action and Clear selection, as one
 * Toolbar (one tab stop, the arrow keys between its buttons). Place it
 * just before the grid.
 *
 * An action or Clear selection that ends the selection removes the bar
 * with the button that had the focus; the focus then goes to the tab stop
 * that stands where the bar was (`keepFocusInPlace`), which is the grid's
 * active cell when the bar is placed just before the grid, never the
 * page's body.
 */
export function DataGridSelectionBar({ count, actions, onClear, label }: DataGridSelectionBarProps) {
  const { messages, integer } = useStoaFormat();
  if (count <= 0) return null;
  return (
    <div className="stoa-selection-bar">
      <Toolbar label={label ?? messages.gridSelection}>
        <span className="stoa-selection-bar__count">{messages.gridSelected(integer(count))}</span>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            size="small"
            onPress={(e) => {
              keepFocusInPlace(e.target);
              action.onPress();
            }}
          >
            {action.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="small"
          onPress={(e) => {
            keepFocusInPlace(e.target);
            onClear();
          }}
        >
          {messages.gridClearSelection}
        </Button>
      </Toolbar>
    </div>
  );
}
