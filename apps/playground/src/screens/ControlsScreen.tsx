// Controls: the blotter's toolbar and filters, the feed's switches and
// sliders, the column picker, an application's theme and language
// switches, and the keyboard shortcuts that drive them.
import { memo, useState } from "react";
import {
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  FilterChip,
  FilterChipGroup,
  LanguageSwitch,
  Panel,
  ShortcutList,
  Slider,
  Switch,
  Tag,
  ThemeSwitch,
  Toolbar,
  ToolbarSeparator,
  directionOf,
  groupShortcuts,
  systemTheme,
  useShortcuts,
  useStoaFormat,
  type ThemeChoice,
} from "@ghostjima/stoa-react";
import { ORDER_STATUSES, STATUS_COUNTS } from "./data";
import { ErrorCallout, type ComponentScreenProps } from "./parts";
import { COMPONENT_WORDS, type OrderStatus } from "./words";

const COLUMNS = ["price", "quantity", "notional", "fee", "venue"] as const;
const LANGUAGE_CODES = ["en", "ru", "ar"];

export const ControlsScreen = memo(function ControlsScreen({ language, state, onRetry, shortcutsEnabled }: ComponentScreenProps) {
  const words = COMPONENT_WORDS[language];
  const text = words.controls;
  const locale = useStoaFormat();
  const [statuses, setStatuses] = useState<OrderStatus[]>(["new", "working"]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [live, setLive] = useState(true);
  const [sound, setSound] = useState(false);
  const [depth, setDepth] = useState(20);
  const [band, setBand] = useState(5);
  const [columns, setColumns] = useState<string[]>(["price", "quantity", "notional"]);
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [appLanguage, setAppLanguage] = useState("en");

  // The feed is the data here: while it loads or has failed, the switch
  // that follows it is disabled, and says why.
  const feedDown = state === "loading" || state === "error";
  const percent = new Intl.NumberFormat(locale.locale, { style: "percent", maximumFractionDigits: 0 });
  const allColumns = columns.length === COLUMNS.length;

  const help = useShortcuts(
    [
      { key: "l", description: text.toggleLive, group: text.feedGroup, onTrigger: () => setLive((on) => !on), isDisabled: feedDown },
      { key: "m", description: text.toggleMine, group: text.blotterGroup, onTrigger: () => setOnlyMine((on) => !on) },
      { key: "[", description: text.fewerLevels, group: text.feedGroup, onTrigger: () => setDepth((d) => Math.max(5, d - 5)) },
      { key: "]", description: text.moreLevels, group: text.feedGroup, onTrigger: () => setDepth((d) => Math.min(50, d + 5)) },
    ],
    { enabled: shortcutsEnabled },
  );

  return (
    <div className="pg-components">
      {state === "error" && (
        <ErrorCallout title={text.feedErrorTitle} retry={words.retry} onRetry={onRetry}>
          {text.feedErrorText(locale.digits("10:42"))}
        </ErrorCallout>
      )}
      <div className="pg-screen">
        <div className="pg-screen__column">
          <Panel title={text.blotterTitle}>
            <div className="pg-stack">
              <Toolbar label={text.toolbarLabel}>
                <ButtonGroup label={text.orderActionsLabel}>
                  <Button variant="primary">{text.newOrder}</Button>
                  <Button variant="secondary" isDisabled={state !== "live"}>
                    {text.amend}
                  </Button>
                </ButtonGroup>
                <ToolbarSeparator />
                <Button variant="ghost" isDisabled={state === "empty"}>
                  {text.exportOrders}
                </Button>
                <ToolbarSeparator />
                <Button variant="danger" isDisabled={state !== "live"}>
                  {text.cancelAll}
                </Button>
              </Toolbar>
              <FilterChipGroup<OrderStatus>
                label={text.statusFilterLabel}
                hideLabel
                value={statuses}
                onChange={setStatuses}
                size="small"
                chips={ORDER_STATUSES.map((status) => ({
                  id: status,
                  label: words.status[status],
                  // Counts arrive with the data: none while it loads, zero
                  // when there is none.
                  count: state === "loading" ? undefined : state === "empty" ? 0 : STATUS_COUNTS[status],
                  isDisabled: state === "loading",
                }))}
              />
              <div className="pg-row">
                <FilterChip isSelected={onlyMine} onChange={setOnlyMine} size="small">
                  {text.onlyMine}
                </FilterChip>
              </div>
              <div className="pg-row">
                {state === "error" ? (
                  <Tag tone="negative">{text.feedLost}</Tag>
                ) : (
                  <Tag tone="positive">{text.marketOpen}</Tag>
                )}
                <Tag tone="warning">{text.delayed}</Tag>
                <Tag tone="accent">{text.paperTrading}</Tag>
                <Tag tone="info">{text.closingAuction}</Tag>
                <Tag>{text.settlement}</Tag>
                {state === "empty" && <Tag size="small">{text.noOrders}</Tag>}
              </div>
            </div>
          </Panel>
          <Panel title={text.columnsTitle}>
            <div className="pg-stack">
              <Checkbox
                isSelected={allColumns}
                isIndeterminate={columns.length > 0 && !allColumns}
                onChange={(on) => setColumns(on ? [...COLUMNS] : [])}
              >
                {text.allColumns}
              </Checkbox>
              <CheckboxGroup label={text.columnsLabel} value={columns} onChange={setColumns} description={text.columnsText}>
                {COLUMNS.map((column) => (
                  <Checkbox key={column} value={column}>
                    {text.columnNames[column]}
                  </Checkbox>
                ))}
              </CheckboxGroup>
            </div>
          </Panel>
        </div>
        <div className="pg-screen__column">
          <Panel title={text.feedTitle}>
            <div className="pg-stack">
              <Switch
                isSelected={live && !feedDown}
                onChange={setLive}
                description={text.liveUpdatesText}
                isDisabled={feedDown}
                disabledReason={state === "loading" ? text.connectingText : text.needsFeedText}
              >
                {text.liveUpdates}
              </Switch>
              <Switch isSelected={sound} onChange={setSound} size="small">
                {text.soundOnFill}
              </Switch>
              <Slider
                label={text.depth}
                value={depth}
                onChange={setDepth}
                min={5}
                max={50}
                step={5}
                format={(value) => text.depthValue(value, locale.integer(value))}
              />
              <Slider
                label={text.band}
                value={band}
                onChange={setBand}
                min={1}
                max={10}
                format={(value) => `±${percent.format(value / 100)}`}
                hint={text.bandHintText}
                isDisabled={state === "loading"}
              />
            </div>
          </Panel>
          <Panel title={text.preferencesTitle}>
            <div className="pg-stack">
              <div className="pg-row">
                <ThemeSwitch value={theme} onChange={setTheme} />
                <LanguageSwitch languages={LANGUAGE_CODES} value={appLanguage} onChange={setAppLanguage} />
              </div>
              <dl className="pg-pairs">
                <dt>{text.themeDrawn}</dt>
                <dd>
                  {(theme === "system" ? systemTheme() : theme) === "dark" ? locale.messages.themeDark : locale.messages.themeLight}
                </dd>
                <dt>{text.direction}</dt>
                <dd>{directionOf(appLanguage) === "rtl" ? text.rightToLeft : text.leftToRight}</dd>
              </dl>
              <p className="pg-note">{text.preferencesText}</p>
            </div>
          </Panel>
          <Panel title={text.keyboardTitle}>
            <ShortcutList groups={groupShortcuts(help, text.otherGroup)} />
            <p className="pg-note">{words.focusHintText}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
});
