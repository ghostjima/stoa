import { useRef, type ReactNode } from "react";
import type { Key } from "react-aria-components";
import { FilterChipGroup, Tag, type FilterChipItem } from "./Chips";
import { Button } from "./Controls";
import { Sheet } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { TextField } from "./Form";
import { LiveRegion, VisuallyHidden } from "./LiveRegion";
import { keepFocusInPlace } from "./focus";
import { useStoaFormat } from "./locale";

export type FilterGroup<T extends Key> = {
  /** Stable key of the group. */
  id: string;
  /** The group's name ("Coupon"), shown above its chips. */
  label: string;
  /** Its chips, each with how many items it matches. */
  chips: FilterChipItem<T>[];
};

export type FilterBarSearch = {
  /** The search box's name ("Find an issue"). */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Keep the label for assistive technology only. */
  hideLabel?: boolean;
};

export type FilterBarProps<T extends Key> = {
  /** Names the filters as a search landmark ("Issue filters"). */
  label: string;
  /** A search box before the chips; leave it out for chips alone. */
  search?: FilterBarSearch;
  /** Chip groups, in the order shown. */
  groups: FilterGroup<T>[];
  /** The ids of the chips that are on, across every group. */
  value: T[];
  /** Called with the ids that are on, in the order of the groups and their
   * chips. */
  onChange: (value: T[]) => void;
  /** Clear all: by default every chip off and the search empty. Give it
   * to clear more (a sort, a saved view) as well. */
  onClear?: () => void;
  /** How many items the filters leave, out of all: shown after the
   * chips, read out politely as it changes, and with `shown` at 0 the
   * empty state takes the results' place. */
  results?: { shown: number; total: number };
  /** The empty state's title and hint; the locale's "Nothing matches the
   * filters." and "Change the search or clear the filters." by default. */
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  /** The results: a list or a table, shown while something matches. */
  children?: ReactNode;
};

/**
 * Search, chip groups with counts and Clear all over one set of results,
 * and the empty state when nothing matches.
 *
 * The bar is a search landmark named by `label`. Each group is a
 * FilterChipGroup: one tab stop, the arrow keys between its chips, each
 * chip a pressed or unpressed button with its count read after its
 * label. The count of results is shown and read out politely, at most
 * once a second while it changes. Clear all appears while a chip is on or
 * the search holds text; after it, the focus goes to the search box (or
 * to the tab stop where the button was), never to the page's body.
 *
 * On a narrow screen (up to the narrow breakpoint, 40rem) the groups fold
 * into a "Filters" button with how many chips are on; it opens them in a
 * Sheet, from the bottom, which a "Show results" button closes, returning
 * the focus to the button. The search box stays in view.
 */
export function FilterBar<T extends Key>({
  label,
  search,
  groups,
  value,
  onChange,
  onClear,
  results,
  emptyTitle,
  emptyDescription,
  children,
}: FilterBarProps<T>) {
  const locale = useStoaFormat();
  const words = locale.messages;
  const searchBox = useRef<HTMLInputElement>(null);
  const active = value.length > 0 || (search !== undefined && search.value !== "");

  const groupValue = (group: FilterGroup<T>) => value.filter((id) => group.chips.some((chip) => chip.id === id));
  /** The group's chips that are on become `on`; the others' stay. Reported
   * in the order of the groups and their chips. */
  const setGroup = (group: FilterGroup<T>, on: T[]) => {
    const mine = new Set(group.chips.map((chip) => chip.id));
    const next = new Set([...value.filter((id) => !mine.has(id)), ...on]);
    onChange(groups.flatMap((g) => g.chips.map((chip) => chip.id)).filter((id) => next.has(id)));
  };

  const clearAll = (pressed?: Element) => {
    // The button goes away with the filters: the focus goes to the search
    // box, the field the person most likely types in next, or else to the
    // tab stop where the button was.
    if (pressed && !searchBox.current) keepFocusInPlace(pressed);
    if (onClear) onClear();
    else {
      onChange([]);
      search?.onChange("");
    }
    searchBox.current?.focus();
  };

  const chipGroups = groups.map((group) => (
    <FilterChipGroup<T> key={group.id} label={group.label} chips={group.chips} value={groupValue(group)} onChange={(on) => setGroup(group, on)} size="small" />
  ));
  const count = (n: number) => locale.integer(n);
  const shownText = results ? words.filterShown(count(results.shown), count(results.total)) : null;
  const empty = results !== undefined && results.shown === 0;

  return (
    <div className="stoa-filter-bar">
      <div role="search" aria-label={label} className="stoa-filter-bar__bar">
        {search && (
          <div className="stoa-filter-bar__search">
            <TextField
              ref={searchBox}
              type="search"
              label={search.label}
              hideLabel={search.hideLabel}
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
            />
          </div>
        )}
        <div className="stoa-filter-bar__sheet">
          <Sheet
            title={words.filters}
            placement="bottom"
            trigger={
              <Button className="stoa-filter-bar__open">
                {words.filters}
                {value.length > 0 && (
                  <>
                    <span aria-hidden="true">
                      <Tag tone="accent" size="small">
                        {count(value.length)}
                      </Tag>
                    </span>
                    <VisuallyHidden>{words.filtersOn(count(value.length))}</VisuallyHidden>
                  </>
                )}
              </Button>
            }
            actions={(close) => (
              <>
                {active && (
                  <Button variant="ghost" onPress={() => clearAll()}>
                    {words.clearAll}
                  </Button>
                )}
                <Button variant="primary" onPress={close}>
                  {words.showResults(count(results?.shown ?? 0))}
                </Button>
              </>
            )}
          >
            <div className="stoa-filter-bar__groups-in-sheet">{chipGroups}</div>
          </Sheet>
        </div>
        <div className="stoa-filter-bar__groups">{chipGroups}</div>
        {(shownText || active) && (
          <div className="stoa-filter-bar__summary">
            {shownText && (
              <p className="stoa-filter-bar__count" aria-hidden="true">
                {shownText}
              </p>
            )}
            {active && (
              <Button variant="ghost" size="small" onPress={(e) => clearAll(e.target)}>
                {words.clearAll}
              </Button>
            )}
          </div>
        )}
        {shownText && <LiveRegion announceEvery={1000}>{shownText}</LiveRegion>}
      </div>
      {empty ? (
        <EmptyState
          title={emptyTitle ?? words.noMatches}
          description={emptyDescription ?? words.noMatchesHint}
          action={active ? <Button onPress={(e) => clearAll(e.target)}>{words.clearAll}</Button> : undefined}
        />
      ) : (
        children
      )}
    </div>
  );
}
