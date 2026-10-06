import type { ReactNode } from "react";
import { ToggleButton, ToggleButtonGroup, type Key } from "react-aria-components";
import { useGroupLabel, type ControlSize } from "./Controls";
import { useStoaFormat } from "./locale";

export type TagTone = "neutral" | "info" | "positive" | "warning" | "negative" | "accent";

export type TagProps = {
  /** The words carry the meaning ("Delayed", "Paper trading"); the tone
   * only repeats it in colour. */
  children: ReactNode;
  tone?: TagTone;
  size?: ControlSize;
};

/** A short static label beside a value or a heading. Not interactive: a
 * label that filters is a FilterChip. The tone colours the border and the
 * text (accent fills the tag), so a tag reads the same without colour as
 * long as its words say what the tone says. */
export function Tag({ children, tone = "neutral", size = "regular" }: TagProps) {
  return <span className={`stoa-tag stoa-tag--${tone} stoa-tag--${size}`}>{children}</span>;
}

/** The inside of a filter chip: a check mark while it is on, so the state
 * is not told by the fill alone, then the label and the count in the
 * locale's digits. The mark is hidden from assistive technology, which
 * reads aria-pressed instead. */
function ChipContent({ label, count, isSelected }: { label: ReactNode; count?: number; isSelected: boolean }) {
  const { integer } = useStoaFormat();
  return (
    <>
      {isSelected && (
        <span className="stoa-filter-chip__check" aria-hidden="true">
          ✓
        </span>
      )}
      <span className="stoa-filter-chip__label">{label}</span>
      {/* The space keeps label and count two words in the accessible name;
          the flex gap draws it, so the text space itself is not rendered. */}
      {count !== undefined && (
        <>
          {" "}
          <span className="stoa-filter-chip__count">{integer(count)}</span>
        </>
      )}
    </>
  );
}

export type FilterChipProps = {
  /** What the chip filters by ("Filled"). */
  children: ReactNode;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  /** How many items the filter matches, read after the label. */
  count?: number;
  isDisabled?: boolean;
  size?: ControlSize;
};

/** One filter turned on or off on its own: a button that stays pressed
 * while the filter is on (aria-pressed). Several filters over one list
 * belong in a FilterChipGroup. */
export function FilterChip({ children, isSelected, onChange, count, isDisabled, size = "regular" }: FilterChipProps) {
  return (
    <ToggleButton
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      className={`stoa-button stoa-choice stoa-filter-chip stoa-filter-chip--${size}`}
    >
      {({ isSelected: on }) => <ChipContent label={children} count={count} isSelected={on} />}
    </ToggleButton>
  );
}

export type FilterChipItem<T extends Key> = { id: T; label: ReactNode; count?: number; isDisabled?: boolean };

export type FilterChipGroupProps<T extends Key> = {
  /** The name of the group ("Order status"), shown above the chips. */
  label: string;
  /** Keep the label for assistive technology only, where the chips name
   * themselves or sit under a visible heading. */
  hideLabel?: boolean;
  chips: FilterChipItem<T>[];
  /** The ids of the chips that are on. */
  value: T[];
  /** Called with the ids that are on, in the order of `chips`. */
  onChange: (value: T[]) => void;
  /** A row too long for its container wraps onto more lines, or scrolls
   * sideways inside itself ("scroll"); the page never scrolls sideways. */
  overflow?: "wrap" | "scroll";
  size?: ControlSize;
};

/** Filters over one list, any number on at once: a labelled toolbar of
 * pressed or unpressed buttons. Tab enters and leaves it in one stop, and
 * the arrow keys move between chips (mirrored in a right-to-left locale).
 * A "clear all" button, when there is one, sits after the group. */
export function FilterChipGroup<T extends Key>({
  label,
  hideLabel = false,
  chips,
  value,
  onChange,
  overflow = "wrap",
  size = "regular",
}: FilterChipGroupProps<T>) {
  const { groupProps, frame } = useGroupLabel(label, hideLabel, undefined);
  return frame(
    <ToggleButtonGroup
      {...groupProps}
      selectionMode="multiple"
      selectedKeys={value}
      onSelectionChange={(keys) => onChange(chips.map((chip) => chip.id).filter((id) => keys.has(id)))}
      className={`stoa-filter-chips stoa-filter-chips--${overflow}`}
    >
      {chips.map((chip) => (
        <ToggleButton
          key={String(chip.id)}
          id={chip.id}
          isDisabled={chip.isDisabled}
          className={`stoa-button stoa-choice stoa-filter-chip stoa-filter-chip--${size}`}
        >
          {({ isSelected }) => <ChipContent label={chip.label} count={chip.count} isSelected={isSelected} />}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
