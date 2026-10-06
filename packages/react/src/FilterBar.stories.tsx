import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FilterBar, type FilterGroup } from "./FilterBar";
import { Panel } from "./Panel";
import { RecordList } from "./RecordList";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Controls/FilterBar" };
export default meta;

type ChipId = "ofz" | "corporate" | "fixed" | "floater" | "short" | "long";
type Bond = { id: string; issuer: { en: string; ar: string }; tags: ChipId[]; ytm: number };

const BONDS: Bond[] = [
  { id: "RU000A1001", issuer: { en: "Ministry of Finance", ar: "وزارة المالية" }, tags: ["ofz", "fixed", "long"], ytm: 0.1462 },
  { id: "RU000A1002", issuer: { en: "Ministry of Finance", ar: "وزارة المالية" }, tags: ["ofz", "floater", "short"], ytm: 0.1688 },
  { id: "RU000A1003", issuer: { en: "Northern Rail", ar: "السكك الشمالية" }, tags: ["corporate", "fixed", "short"], ytm: 0.1795 },
  { id: "RU000A1004", issuer: { en: "Volga Energy", ar: "طاقة الفولغا" }, tags: ["corporate", "floater", "long"], ytm: 0.1912 },
  { id: "RU000A1005", issuer: { en: "Ural Metals", ar: "معادن الأورال" }, tags: ["corporate", "fixed", "long"], ytm: 0.2034 },
  { id: "RU000A1006", issuer: { en: "Ministry of Finance", ar: "وزارة المالية" }, tags: ["ofz", "fixed", "short"], ytm: 0.1521 },
];

const WORDS = {
  en: {
    label: "Bond filters",
    search: "Find a bond",
    placeholder: "ISIN or issuer",
    sector: "Sector",
    coupon: "Coupon",
    term: "Term",
    chips: { ofz: "Government", corporate: "Corporate", fixed: "Fixed", floater: "Floating", short: "Up to 3 years", long: "Over 3 years" },
    list: "Bonds",
  },
  ar: {
    label: "عوامل تصفية السندات",
    search: "ابحث عن سند",
    placeholder: "الرمز أو المُصدر",
    sector: "القطاع",
    coupon: "القسيمة",
    term: "الأجل",
    chips: { ofz: "حكومية", corporate: "شركات", fixed: "ثابتة", floater: "متغيرة", short: "حتى ٣ سنوات", long: "أكثر من ٣ سنوات" },
    list: "السندات",
  },
};

const GROUPS: { id: string; key: "sector" | "coupon" | "term"; chips: ChipId[] }[] = [
  { id: "sector", key: "sector", chips: ["ofz", "corporate"] },
  { id: "coupon", key: "coupon", chips: ["fixed", "floater"] },
  { id: "term", key: "term", chips: ["short", "long"] },
];

/** A bond matches when it has, in every group with a chip on, one of the
 * chips that are on, and its id or issuer holds the search. */
function matches(bond: Bond, on: ChipId[], search: string, language: "en" | "ar") {
  const text = `${bond.id} ${bond.issuer[language]}`.toLowerCase();
  if (search && !text.includes(search.toLowerCase())) return false;
  return GROUPS.every((g) => {
    const chosen = g.chips.filter((c) => on.includes(c));
    return chosen.length === 0 || chosen.some((c) => bond.tags.includes(c));
  });
}

function Bonds({ initialChips = [], initialSearch = "", withSearch = true }: { initialChips?: ChipId[]; initialSearch?: string; withSearch?: boolean }) {
  const locale = useStoaFormat();
  const language = locale.locale.startsWith("ar") ? "ar" : "en";
  const w = WORDS[language];
  const [chips, setChips] = useState<ChipId[]>(initialChips);
  const [search, setSearch] = useState(initialSearch);
  const visible = BONDS.filter((b) => matches(b, chips, search, language));
  // A chip's count: the bonds it would leave, with the other groups' chips
  // as they are.
  const groups: FilterGroup<ChipId>[] = GROUPS.map((g) => ({
    id: g.id,
    label: w[g.key],
    chips: g.chips.map((id) => ({
      id,
      label: w.chips[id],
      count: BONDS.filter((b) => matches(b, [...chips.filter((c) => !g.chips.includes(c)), id], search, language)).length,
    })),
  }));
  return (
    <Panel title={w.list}>
      <FilterBar<ChipId>
        label={w.label}
        search={withSearch ? { label: w.search, value: search, onChange: setSearch, placeholder: w.placeholder } : undefined}
        groups={groups}
        value={chips}
        onChange={setChips}
        results={{ shown: visible.length, total: BONDS.length }}
      >
        <RecordList
          label={w.list}
          value={null}
          onChange={() => {}}
          items={visible.map((b) => ({ id: b.id, label: b.id, description: b.issuer[language], meta: <bdi>{locale.decimal(b.ytm * 100, 2)}%</bdi> }))}
        />
      </FilterBar>
    </Panel>
  );
}

/** A search box, three chip groups with how many bonds each chip leaves,
 * and the count of results; nothing on yet. On a phone's width the groups
 * fold into a Filters button that opens them in a sheet. */
export const Default: StoryObj = { render: () => <Bonds /> };

/** Chips on and text in the search: Clear all turns everything off and
 * puts the focus in the search box. */
export const Active: StoryObj = { render: () => <Bonds initialChips={["corporate", "fixed"]} initialSearch="100" /> };

/** Nothing matches: the empty state takes the results' place, with Clear
 * all. */
export const NoMatches: StoryObj = { render: () => <Bonds initialChips={["ofz", "floater", "long"]} /> };

/** Chip groups alone, without a search box. */
export const ChipsOnly: StoryObj = { render: () => <Bonds withSearch={false} initialChips={["short"]} /> };
