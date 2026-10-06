// @vitest-environment jsdom
// FilterBar: the search landmark, chip groups with counts, the order of
// what it reports, Clear all and where the focus goes after it, the count
// of results and the empty state, in English and Russian.
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FilterBar, I18nProvider, type FilterGroup } from "./index";

afterEach(cleanup);

type Id = "a" | "b" | "c" | "d";
const GROUPS: FilterGroup<Id>[] = [
  { id: "one", label: "Sector", chips: [{ id: "a", label: "Government", count: 3 }, { id: "b", label: "Corporate", count: 5 }] },
  { id: "two", label: "Coupon", chips: [{ id: "c", label: "Fixed", count: 6 }, { id: "d", label: "Floating", count: 2 }] },
];

function Harness({ initial = [] as Id[], query = "", shown = 4, withSearch = true, onChange }: { initial?: Id[]; query?: string; shown?: number; withSearch?: boolean; onChange?: (v: Id[]) => void }) {
  const [value, setValue] = useState<Id[]>(initial);
  const [search, setSearch] = useState(query);
  return (
    <div>
      <FilterBar<Id>
        label="Bond filters"
        search={withSearch ? { label: "Find a bond", value: search, onChange: setSearch } : undefined}
        groups={GROUPS}
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
        results={{ shown, total: 8 }}
      >
        <p>The results</p>
      </FilterBar>
      <button type="button">After</button>
    </div>
  );
}

describe("FilterBar", () => {
  it("is a search landmark named by its label, with a search box and labelled chip groups whose chips read their counts", () => {
    render(<Harness />);
    const bar = screen.getByRole("search", { name: "Bond filters" });
    expect(within(bar).getByRole("searchbox", { name: "Find a bond" })).toBeTruthy();
    const groups = within(bar).getAllByRole("toolbar");
    expect(groups.map((g) => g.getAttribute("aria-labelledby") && document.getElementById(g.getAttribute("aria-labelledby")!)?.textContent)).toEqual(["Sector", "Coupon"]);
    expect(within(groups[0]!).getByRole("button", { name: "Government 3" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("reports the chips that are on in the order of the groups and their chips", () => {
    const onChange = vi.fn();
    render(<Harness initial={["d"]} onChange={onChange} />);
    const groups = within(screen.getByRole("search")).getAllByRole("toolbar");
    fireEvent.click(within(groups[0]!).getByRole("button", { name: /Corporate/ }));
    expect(onChange).toHaveBeenLastCalledWith(["b", "d"]);
    fireEvent.click(within(groups[1]!).getByRole("button", { name: /Fixed/ }));
    expect(onChange).toHaveBeenLastCalledWith(["b", "c", "d"]);
  });

  it("shows Clear all only while something is on, and clearing leaves the focus in the search box", async () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
    cleanup();
    render(<Harness initial={["a"]} query="ural" />);
    const clear = screen.getByRole("button", { name: "Clear all" });
    act(() => clear.focus());
    fireEvent.click(clear);
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
    const box = screen.getByRole("searchbox", { name: "Find a bond" }) as HTMLInputElement;
    expect(box.value).toBe("");
    expect(within(screen.getByRole("search")).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    await waitFor(() => expect(document.activeElement).toBe(box));
  });

  it("without a search box, leaves the focus on the tab stop where Clear all was", async () => {
    render(<Harness initial={["a"]} withSearch={false} />);
    const clear = screen.getByRole("button", { name: "Clear all" });
    act(() => clear.focus());
    fireEvent.click(clear);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("After"));
  });

  it("shows how many results are left, and reads it out politely", async () => {
    render(<Harness shown={4} />);
    const count = document.querySelector(".stoa-filter-bar__count")!;
    expect([count.textContent, count.getAttribute("aria-hidden")]).toEqual(["4 of 8 shown", "true"]);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("4 of 8 shown"));
    expect(screen.getByText("The results")).toBeTruthy();
  });

  it("puts the empty state in the results' place when nothing matches, with Clear all", () => {
    render(<Harness shown={0} initial={["a", "d"]} />);
    expect(screen.queryByText("The results")).toBeNull();
    expect(screen.getByText("Nothing matches the filters.")).toBeTruthy();
    expect(screen.getByText("Change the search or clear the filters.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Clear all" })).toHaveLength(2);
  });

  it("speaks Russian under a Russian locale", () => {
    render(
      <I18nProvider locale="ru-RU">
        <Harness shown={0} initial={["a"]} />
      </I18nProvider>,
    );
    expect(document.querySelector(".stoa-filter-bar__count")?.textContent).toBe("Показано 0 из 8");
    expect(screen.getByText("По этим фильтрам ничего не найдено.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Сбросить все" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Фильтры, включено: 1" })).toBeTruthy();
  });

  it("has a Filters button for narrow screens that says how many chips are on", () => {
    render(<Harness initial={["a", "c"]} />);
    const open = screen.getByRole("button", { name: "Filters, 2 on" });
    expect(open.closest(".stoa-filter-bar__sheet")).toBeTruthy();
  });
});
