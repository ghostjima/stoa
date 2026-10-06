import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FilterChip, FilterChipGroup, Tag } from "./Chips";
import { AppHeader } from "./AppHeader";
import { Button, ChoiceGroup, Select } from "./Controls";
import { LanguageSwitch, ThemeSwitch, useLanguagePreference, useThemePreference, type ThemeChoice } from "./Preferences";
import { Kbd, useShortcuts } from "./Shortcuts";
import { Slider } from "./Slider";
import { ButtonGroup, Toolbar, ToolbarSeparator } from "./Toolbar";
import { Checkbox, CheckboxGroup, Switch } from "./Toggles";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Controls/Inputs" };
export default meta;

const row = { display: "flex", gap: "var(--stoa-space-3)", alignItems: "center", flexWrap: "wrap" } as const;

/** The five variants at rest. Hover, press and keyboard focus are drawn by
 * each variant's own rules; Tab to a button to see its ring. Danger says
 * what it destroys in its label, so the colour is not the only sign. */
export const ButtonVariants: StoryObj = {
  render: () => (
    <div style={row}>
      <Button>Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Delete 3 orders</Button>
    </div>
  ),
};

/** Disabled reads the same in every variant: no fill, subtle text. */
export const ButtonsDisabled: StoryObj = {
  render: () => (
    <div style={row}>
      <Button isDisabled>Default</Button>
      <Button variant="primary" isDisabled>
        Primary
      </Button>
      <Button variant="secondary" isDisabled>
        Secondary
      </Button>
      <Button variant="ghost" isDisabled>
        Ghost
      </Button>
      <Button variant="danger" isDisabled>
        Delete 3 orders
      </Button>
    </div>
  ),
};

/** The small size beside the other small controls of a header: the same
 * height and type size. */
export const ButtonSmall: StoryObj = {
  render: () => {
    const [view, setView] = useState("table");
    const [range, setRange] = useState("1d");
    const [mine, setMine] = useState(false);
    return (
      <div style={row}>
        <Button size="small">Export</Button>
        <Button size="small" variant="primary">
          New order
        </Button>
        <Button size="small" variant="ghost">
          Refresh
        </Button>
        <ChoiceGroup
          label="View"
          hideLabel
          size="small"
          value={view}
          onChange={setView}
          choices={[
            { id: "table", label: "Table" },
            { id: "chart", label: "Chart" },
          ]}
        />
        <Select
          label="Range"
          hideLabel
          size="small"
          value={range}
          onChange={setRange}
          options={[
            { id: "1d", label: "1 day" },
            { id: "1w", label: "1 week" },
          ]}
        />
        <FilterChip size="small" isSelected={mine} onChange={setMine}>
          Mine
        </FilterChip>
      </div>
    );
  },
};

/** Every tone, each saying in words what its colour says. Accent fills the
 * tag; the others colour border and text. */
export const TagTones: StoryObj = {
  render: () => (
    <div style={row}>
      <Tag>Paper</Tag>
      <Tag tone="info">Delayed 15 min</Tag>
      <Tag tone="positive">Market open</Tag>
      <Tag tone="warning">Halted</Tag>
      <Tag tone="negative">Rejected</Tag>
      <Tag tone="accent">New</Tag>
    </div>
  ),
};

/** The small size, for a dense row or a table cell. */
export const TagsSmall: StoryObj = {
  render: () => (
    <div style={row}>
      <Tag size="small">Paper</Tag>
      <Tag size="small" tone="info">Delayed 15 min</Tag>
      <Tag size="small" tone="positive">Market open</Tag>
      <Tag size="small" tone="warning">Halted</Tag>
      <Tag size="small" tone="negative">Rejected</Tag>
      <Tag size="small" tone="accent">New</Tag>
    </div>
  ),
};

/** A single chip off, on, and disabled. On shows a check mark as well as
 * the fill; the count follows the label. */
export const FilterChipStates: StoryObj = {
  render: () => {
    const [on, setOn] = useState(true);
    const [off, setOff] = useState(false);
    return (
      <div style={row}>
        <FilterChip isSelected={off} onChange={setOff} count={3}>
          Open
        </FilterChip>
        <FilterChip isSelected={on} onChange={setOn} count={12}>
          Filled
        </FilterChip>
        <FilterChip isSelected={false} onChange={() => {}} count={0} isDisabled>
          Cancelled
        </FilterChip>
      </div>
    );
  },
};

const STATUS = [
  { id: "open", label: "Open", count: 3 },
  { id: "partial", label: "Partly filled", count: 2 },
  { id: "filled", label: "Filled", count: 12 },
  { id: "cancelled", label: "Cancelled", count: 0, isDisabled: true },
  { id: "rejected", label: "Rejected", count: 1 },
  { id: "expired", label: "Expired", count: 4 },
];

/** Filters over one list. The "clear all" pattern: a ghost button after
 * the group, its own Tab stop outside the chips' arrow keys. It stays in
 * place and enabled while nothing is on (pressing it then changes
 * nothing): a button that disappeared or turned disabled under the press
 * would drop the keyboard focus to the page. */
export const FilterChipsClearAll: StoryObj = {
  render: () => {
    const [value, setValue] = useState(["open", "filled"]);
    return (
      <div style={row}>
        <FilterChipGroup label="Order status" hideLabel chips={STATUS} value={value} onChange={setValue} />
        <Button variant="ghost" onPress={() => setValue([])}>
          Clear all
        </Button>
      </div>
    );
  },
};

/** In a narrow container the row scrolls sideways inside itself; the page
 * does not. The small size, for a toolbar or a header. */
export const FilterChipsScroll: StoryObj = {
  render: () => {
    const [value, setValue] = useState(["filled"]);
    return (
      <div style={{ maxInlineSize: 280, border: "1px solid var(--stoa-color-border)" }}>
        <FilterChipGroup label="Order status" hideLabel chips={STATUS} value={value} onChange={setValue} overflow="scroll" size="small" />
      </div>
    );
  },
};

const column = { display: "grid", gap: "var(--stoa-space-3)", justifyItems: "start" } as const;

/** The group's label shown above the chips, as it is by default. */
export const FilterChipsLabelled: StoryObj = {
  render: () => {
    const [value, setValue] = useState<string[]>(["working"]);
    return (
      <FilterChipGroup
        label="Order status"
        value={value}
        onChange={setValue}
        chips={[
          { id: "working", label: "Working", count: 12 },
          { id: "filled", label: "Filled", count: 31 },
          { id: "rejected", label: "Rejected", count: 2 },
        ]}
      />
    );
  },
};

/** Off and on, with and without a description. Space toggles a focused
 * switch. */
export const SwitchStates: StoryObj = {
  render: () => {
    const [live, setLive] = useState(true);
    const [sound, setSound] = useState(false);
    return (
      <div style={column}>
        <Switch isSelected={live} onChange={setLive} description="Prices move as trades arrive.">
          Live updates
        </Switch>
        <Switch isSelected={sound} onChange={setSound}>
          Sound on fills
        </Switch>
      </div>
    );
  },
};

/** Disabled, off and on. The reason is shown under the label and announced
 * with the switch, so the state is explained, not only greyed out. */
export const SwitchDisabled: StoryObj = {
  render: () => (
    <div style={column}>
      <Switch isSelected={false} onChange={() => {}} isDisabled disabledReason="Needs a live feed; this is a replay.">
        Live updates
      </Switch>
      <Switch isSelected onChange={() => {}} isDisabled disabledReason="Set by your organisation.">
        Confirm orders
      </Switch>
    </div>
  ),
};

/** The small size, for a toolbar or a settings row. */
export const SwitchSmall: StoryObj = {
  render: () => {
    const [on, setOn] = useState(true);
    return (
      <Switch size="small" isSelected={on} onChange={setOn}>
        Reduced motion
      </Switch>
    );
  },
};

/** Unchecked, checked, mixed and disabled. */
export const CheckboxStates: StoryObj = {
  render: () => {
    const [fees, setFees] = useState(false);
    const [totals, setTotals] = useState(true);
    return (
      <div style={column}>
        <Checkbox isSelected={fees} onChange={setFees} description="Commission and exchange fees.">
          Show fees
        </Checkbox>
        <Checkbox isSelected={totals} onChange={setTotals}>
          Show totals
        </Checkbox>
        <Checkbox isSelected={false} isIndeterminate onChange={() => {}}>
          All columns
        </Checkbox>
        <Checkbox isSelected onChange={() => {}} isDisabled>
          Price (always shown)
        </Checkbox>
      </div>
    );
  },
};

const COLUMNS = [
  { value: "time", label: "Time" },
  { value: "side", label: "Side" },
  { value: "price", label: "Price" },
  { value: "size", label: "Size" },
];

/** A group under one label, with a mixed "all" box above it that checks
 * or clears every column. */
export const CheckboxGroupWithAll: StoryObj = {
  render: () => {
    const [value, setValue] = useState(["time", "price"]);
    const all = value.length === COLUMNS.length;
    return (
      <div style={column}>
        <Checkbox
          isSelected={all}
          isIndeterminate={value.length > 0 && !all}
          onChange={(on) => setValue(on ? COLUMNS.map((c) => c.value) : [])}
        >
          All columns
        </Checkbox>
        <CheckboxGroup label="Show columns" value={value} onChange={setValue} description="Hidden columns stay in the export.">
          {COLUMNS.map((c) => (
            <Checkbox key={c.value} value={c.value}>
              {c.label}
            </Checkbox>
          ))}
        </CheckboxGroup>
      </div>
    );
  },
};

const sliders = { display: "grid", gap: "var(--stoa-space-4)", maxInlineSize: 320 } as const;

/** A plain number, and a formatted one with a hint. The format is what is
 * shown and what is announced (aria-valuetext). */
export const SliderStates: StoryObj = {
  render: () => {
    const [depth, setDepth] = useState(12);
    const [opacity, setOpacity] = useState(60);
    return (
      <div style={sliders}>
        <Slider label="Book depth" min={4} max={40} step={2} value={depth} onChange={setDepth} hint="Levels shown on each side." />
        <Slider label="Heatmap opacity" value={opacity} onChange={setOpacity} step={5} format={(v) => `${v} %`} />
      </div>
    );
  },
};

/** Disabled: the value is still shown, the track and thumb go grey. */
export const SliderDisabled: StoryObj = {
  render: () => (
    <div style={sliders}>
      <Slider label="Book depth" min={4} max={40} value={12} onChange={() => {}} isDisabled hint="Fixed while the replay loads." />
    </div>
  ),
};

/** The small size: smaller text, the same track height, which is the
 * minimum target. */
export const SliderSmall: StoryObj = {
  render: () => {
    const [speed, setSpeed] = useState(1);
    return (
      <div style={sliders}>
        <Slider size="small" label="Speed" min={0.25} max={4} step={0.25} value={speed} onChange={setSpeed} format={(v) => `${v}x`} />
      </div>
    );
  },
};

/** One Tab stop: Tab enters at the control used last and leaves in one
 * press; the arrow keys move through every enabled control, groups
 * included, reversed in a right-to-left page; Home and End go to the
 * ends. A separator stands between groups. */
export const ToolbarTransport: StoryObj = {
  render: () => {
    const [playing, setPlaying] = useState(false);
    return (
      <Toolbar label="Playback">
        <Button variant="primary" onPress={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </Button>
        <ToolbarSeparator />
        <ButtonGroup label="Step">
          <Button>Back 1 min</Button>
          <Button isDisabled>Forward 1 min</Button>
          <Button>Live</Button>
        </ButtonGroup>
        <ToolbarSeparator />
        <Button variant="ghost">Reset view</Button>
      </Toolbar>
    );
  },
};

/** A button group on its own, outside a toolbar: each button is its own
 * Tab stop. */
export const ButtonGroupAlone: StoryObj = {
  render: () => (
    <ButtonGroup label="Zoom">
      <Button>Zoom in</Button>
      <Button>Fit</Button>
      <Button>Zoom out</Button>
    </ButtonGroup>
  ),
};

/** Buttons with their keyboard shortcut: the keys after the label,
 * hidden from assistive technology, which reads the label as the name and
 * the shortcut from aria-keyshortcuts. The keys stay left to right; in a
 * right-to-left page they sit at the label's left, its inline end. */
export const ButtonShortcuts: StoryObj = {
  render: () => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const w = arabic
      ? { stop: "إيقاف", pause: "إيقاف مؤقت", search: "بحث", help: "اختصارات لوحة المفاتيح" }
      : { stop: "Stop", pause: "Pause", search: "Search", help: "Keyboard shortcuts" };
    return (
      <div style={row}>
        <Button variant="danger" shortcut={{ key: "s" }}>
          {w.stop}
        </Button>
        <Button shortcut={{ key: " " }}>{w.pause}</Button>
        <Button variant="primary" shortcut={{ key: "k", modifiers: ["mod"] }}>
          {w.search}
        </Button>
        <Button variant="ghost" size="small" shortcut={{ key: "?" }}>
          {w.help}
        </Button>
      </div>
    );
  },
};

/** One key, and combinations. A combination stays left to right in a
 * right-to-left page. */
export const KbdKeys: StoryObj = {
  render: () => (
    <div style={row}>
      <Kbd>Esc</Kbd>
      <Kbd>?</Kbd>
      <Kbd keys={["Ctrl", "K"]} />
      <Kbd keys={["⇧", "⌘", "P"]} />
    </div>
  ),
};

/** Shortcuts running on this page, and the list useShortcuts returns for a
 * help dialog, drawn here as a plain list. Typing in the field does not
 * trigger them; the disabled one is listed but does not run. */
export const ShortcutList: StoryObj = {
  render: () => {
    const [playing, setPlaying] = useState(false);
    const [minute, setMinute] = useState(570);
    const [note, setNote] = useState("");
    const help = useShortcuts([
      { key: " ", description: "Play or pause", group: "Playback", onTrigger: () => setPlaying((p) => !p) },
      { key: "j", description: "Back one minute", group: "Playback", onTrigger: () => setMinute((m) => m - 1) },
      { key: "l", description: "Forward one minute", group: "Playback", onTrigger: () => setMinute((m) => m + 1) },
      { key: "g", modifiers: ["mod"], description: "Go live", group: "Playback", onTrigger: () => {}, isDisabled: true },
    ]);
    return (
      <div style={column}>
        <p style={{ margin: 0 }} aria-live="polite">
          {playing ? "Playing" : "Paused"} at minute {minute}
        </p>
        <label style={{ display: "grid", gap: "var(--stoa-space-1)" }}>
          <span className="stoa-field__label">Note (shortcuts do not fire here)</span>
          <input className="stoa-field__input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--stoa-space-2) var(--stoa-space-4)", margin: 0 }}>
          {help.map((line) => (
            <div key={line.description} style={{ display: "contents" }}>
              <dt>
                <Kbd keys={line.keys} />
              </dt>
              <dd style={{ margin: 0, color: line.isDisabled ? "var(--stoa-color-text-muted)" : undefined }}>
                {line.description}
                {line.isDisabled ? " (not available in a replay)" : ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  },
};

/** System is the default: no data-theme, so the tokens follow the
 * system's setting. Light and Dark are chosen themes. The words follow the
 * locale (the Language toolbar). */
export const ThemeSwitchStates: StoryObj = {
  render: () => {
    const [first, setFirst] = useState<ThemeChoice>("system");
    const [second, setSecond] = useState<ThemeChoice>("dark");
    return (
      <div style={column}>
        <ThemeSwitch value={first} onChange={setFirst} />
        <ThemeSwitch value={second} onChange={setSecond} label="Theme of the chart" />
      </div>
    );
  },
};

/** The languages by code, the same in every interface. */
export const LanguageSwitchStates: StoryObj = {
  render: () => {
    const [two, setTwo] = useState("en");
    const [three, setThree] = useState("ru");
    return (
      <div style={column}>
        <LanguageSwitch languages={["en", "ar"]} value={two} onChange={setTwo} />
        <LanguageSwitch languages={["en", "ru", "ar"]} value={three} onChange={setThree} label="Language of the report" />
      </div>
    );
  },
};

/** Both switches in an AppHeader, wired to their hooks. A choice goes to
 * the URL (?theme=, ?lang=) and to localStorage; System clears both. In an
 * application the hooks set data-theme, lang and dir on the root element;
 * here Storybook's toolbar owns those, so the hooks run with `apply: false`
 * and the line under the header says what they would set. */
export const HeaderWithSwitches: StoryObj = {
  render: () => {
    const theme = useThemePreference({ apply: false, storageKey: "stoa-storybook-theme" });
    const language = useLanguagePreference({ apply: false, languages: ["en", "ru", "ar"], storageKey: "stoa-storybook-lang" });
    const drawn = theme.choice === "system" ? `none (the system's ${theme.theme})` : theme.choice;
    return (
      <>
        <AppHeader
          title="Tyche Replay"
          subtitle="AAPL on IEX"
          actions={
            <>
              <ThemeSwitch value={theme.choice} onChange={theme.setChoice} />
              <LanguageSwitch languages={["en", "ru", "ar"]} value={language.language} onChange={language.setLanguage} />
            </>
          }
        />
        <p style={{ paddingInline: "var(--stoa-space-4)" }}>
          data-theme: {drawn}; lang: {language.language}; dir: {language.dir}
        </p>
      </>
    );
  },
  parameters: { layout: "fullscreen" },
};

/** The switches of a preview frame, wired to hooks that neither apply nor
 * persist (`apply: false, persist: false`): the choice lives in the
 * frame's own state, and the page's URL and storage stay as they are. */
export const SwitchesWithoutPersistence: StoryObj = {
  render: () => {
    const theme = useThemePreference({ apply: false, persist: false, defaultChoice: "dark" });
    const language = useLanguagePreference({ apply: false, persist: false, languages: ["en", "ru", "ar"], defaultLanguage: "ar" });
    return (
      <div style={column}>
        <ThemeSwitch value={theme.choice} onChange={theme.setChoice} label="Theme of the preview" />
        <LanguageSwitch languages={["en", "ru", "ar"]} value={language.language} onChange={language.setLanguage} label="Language of the preview" />
        <p>
          Preview: {theme.theme}, {language.language}, {language.dir}
        </p>
      </div>
    );
  },
};
