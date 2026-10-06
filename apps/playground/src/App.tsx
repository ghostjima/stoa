// The playground: a list of side panels, two preview frames, one
// verification panel. Under everything sits stoa-default, the token files
// of this working tree; on top of it sits the override layer, and every
// override is shown as one. The area panels (src/panels.tsx) sit in the
// same list and contribute variables and content to every preview frame.
import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AppHeader,
  Button,
  ChoiceGroup,
  LanguageSwitch,
  PageShell,
  Panel,
  Select,
  StatusBadge,
  Tabs,
  TextField,
  useStoaFormat,
} from "@ghostjima/stoa-react";
import { useChromeTheme, type ChromeTheme } from "./chromeTheme";
import { useChromeText } from "./chromeLanguage";
import { CHROME_LANGUAGES, isChromeLanguage, type ChromeLanguage } from "./chromeText";
import { useRegionBlockSize } from "./region";
import {
  DATA_STATES,
  DEFAULT_SCREEN_SETTINGS,
  GRID_ROW_COUNTS,
  SCREENS,
  type DataState,
  type GridRowCount,
  type ScreenId,
  type ScreenSettings,
} from "./screens/model";
import { ControlPanel } from "./ControlPanel";
import { OverrideList } from "./OverrideList";
import { PreviewGrid } from "./PreviewGrid";
import { Verification } from "./Verification";
import { AREA_PANELS, mergedVariables, panelSnapshots, type Contribution } from "./panels";
import { editableTabs } from "./editable";
import {
  canRedo,
  canUndo,
  clearAll,
  clearOverride,
  commit,
  emptyHistory,
  endEdit,
  redo,
  setOverride,
  undo,
} from "./history";
import { createStream } from "./stream";
import { ApiError, listSnapshots, readSnapshotFile, saveSnapshot } from "./api";
import { readSnapshot } from "./snapshot";
import {
  DENSITY_MODES,
  baseTokens,
  digest,
  filesWithOverrides,
  resolveAllValues,
  resolveTokens,
  serializeFiles,
  type DensityMode,
  type ResolvedTokens,
  type Theme,
} from "./tokenModel";

/** Milliseconds between stream frames, per speed. */
const SPEEDS = [
  { id: "1", label: "1x", interval: 250 },
  { id: "2", label: "2x", interval: 125 },
  { id: "4", label: "4x", interval: 60 },
];

/** What the snapshot panel last reported, kept as data so that it reads
 * in whichever language the chrome is in when it is shown. */
type SnapshotNote =
  | { kind: "saved"; path: string; commit: string; dirty: boolean }
  | { kind: "restored"; slug: string; count: number };
type SnapshotError = { kind: "save"; detail: string } | { kind: "load"; slug: string; detail: string };

export type AppProps = {
  /** The chrome's language; the frames keep their own. */
  language: ChromeLanguage;
  onLanguage: (language: ChromeLanguage) => void;
};

export function App({ language, onLanguage }: AppProps) {
  const t = useChromeText();
  const format = useStoaFormat();
  const [history, setHistory] = useState(emptyHistory);
  const [chromeTheme, setChromeTheme] = useChromeTheme();
  const [density, setDensity] = useState<DensityMode>("regular");
  const [screenSettings, setScreenSettings] = useState<ScreenSettings>(DEFAULT_SCREEN_SETTINGS);
  // Retry on a screen's error brings its data back; stable, so the
  // component screens do not re-render with every stream frame.
  const retry = useCallback(() => setScreenSettings((settings) => ({ ...settings, state: "live" })), []);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState("1");
  // Empty: the server stamps an unnamed save with the time it was written,
  // so a save never lands on an earlier snapshot by default.
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SnapshotNote | null>(null);
  const [saveError, setSaveError] = useState<SnapshotError | null>(null);
  /** The server refused this name because it is taken; only then may the
   * user ask for it to be written over. */
  const [taken, setTaken] = useState(false);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [renderMs, setRenderMs] = useState(0);
  const [controlTab, setControlTab] = useState<string>();
  /** The side panel tab on show; every tab stays mounted. */
  const [sideTab, setSideTab] = useState("tokens");
  /** The tokens a selected verification failure reads, so the control panel
   * and the override list can mark and scroll to them. */
  const [highlighted, setHighlighted] = useState<string[]>([]);
  /** What each area panel contributes, by panel id. */
  const [contributions, setContributions] = useState<Record<string, Contribution>>({});

  // The side panel is sized against the shell's scrolling region, not the
  // window: the header takes part of the window's height.
  const [app, regionBlockSize] = useRegionBlockSize();
  const regionStyle = (regionBlockSize > 0 ? { "--pg-region": `${regionBlockSize}px` } : undefined) as
    | CSSProperties
    | undefined;

  const overrides = history.present;
  const stream = useMemo(() => createStream(7), []);
  const tabs = useMemo(() => editableTabs(baseTokens, t.tokens), [t]);

  const tokens = useMemo<Record<Theme, ResolvedTokens>>(
    () => ({
      light: resolveTokens(baseTokens, overrides, "light", density),
      dark: resolveTokens(baseTokens, overrides, "dark", density),
    }),
    [overrides, density],
  );
  const values = useMemo(() => resolveAllValues(baseTokens, overrides), [overrides]);
  // The build endpoint reads token files, so it is sent the sources with
  // the override layer written in.
  const files = useMemo(() => serializeFiles(filesWithOverrides(baseTokens, overrides)), [overrides]);
  // Target size is measured in every density mode, not only the one the
  // previews show, the same way scripts/checks.test.mjs measures it; theme
  // does not change a density token, so "light" is picked arbitrarily.
  const densityTokens = useMemo<Record<DensityMode, ResolvedTokens>>(
    () =>
      Object.fromEntries(
        DENSITY_MODES.map((mode) => [mode, resolveTokens(baseTokens, overrides, "light", mode)]),
      ) as Record<DensityMode, ResolvedTokens>,
    [overrides],
  );
  const panelVariables = useMemo(() => mergedVariables(contributions), [contributions]);
  const panelContent = useMemo(
    () =>
      AREA_PANELS.map((panel) => (
        <Fragment key={panel.id}>{contributions[panel.id]?.frameContent ?? null}</Fragment>
      )),
    [contributions],
  );
  // The canvas views read their variables once, so the revision they are
  // keyed on has to move when a panel changes one of them too.
  const revision = useMemo(
    () => digest(JSON.stringify([tokens.light.variables, tokens.dark.variables, panelVariables])),
    [tokens, panelVariables],
  );

  // One stable handler per panel: a panel reports its contribution from an
  // effect, so a handler that changed identity on every render would keep
  // the two of them going round.
  const contribute = useCallback((id: string, contribution: Contribution) => {
    setContributions((previous) => ({ ...previous, [id]: contribution }));
  }, []);
  const handlers = useMemo(
    () =>
      Object.fromEntries(
        AREA_PANELS.map((panel) => [panel.id, (contribution: Contribution) => contribute(panel.id, contribution)]),
      ),
    [contribute],
  );

  const interval = SPEEDS.find((s) => s.id === speed)?.interval ?? 250;
  useEffect(() => {
    if (!running) {
      stream.stop();
      return;
    }
    stream.start(interval);
    return () => stream.stop();
  }, [stream, running, interval]);

  const refreshSnapshots = () => {
    void listSnapshots().then(setSnapshots, () => setSnapshots([]));
  };
  useEffect(refreshSnapshots, []);

  const save = async (overwrite = false) => {
    setSaveError(null);
    try {
      const result = await saveSnapshot({
        name,
        files,
        overrides,
        // What the frames were showing, beside what each area panel
        // records, so a snapshot says which screen and state it was tuned
        // against. Loading a snapshot restores its overrides only.
        panels: { ...panelSnapshots(contributions), screen: screenSettings },
        overwrite,
      });
      setTaken(false);
      setSaved({ kind: "saved", path: result.path, commit: result.commit.slice(0, 7), dirty: result.dirty });
      refreshSnapshots();
    } catch (cause) {
      setSaved(null);
      // 409 is the one refusal the user can answer: the name is taken.
      setTaken(cause instanceof ApiError && cause.status === 409);
      setSaveError({ kind: "save", detail: cause instanceof Error ? cause.message : String(cause) });
    }
  };

  const load = async (slug: string) => {
    setSaveError(null);
    try {
      const state = readSnapshot(await readSnapshotFile(slug));
      setHistory((h) => commit(h, state.overrides));
      setSaved({ kind: "restored", slug, count: Object.keys(state.overrides).length });
    } catch (cause) {
      setSaveError({ kind: "load", slug, detail: cause instanceof Error ? cause.message : String(cause) });
    }
  };

  const savedText =
    saved === null
      ? null
      : saved.kind === "restored"
        ? t.snapshot.restored(saved.slug, saved.count)
        : (saved.dirty ? t.snapshot.savedDirty : t.snapshot.saved)(saved.path, saved.commit);
  const saveErrorText =
    saveError === null
      ? null
      : saveError.kind === "save"
        ? t.snapshot.saveFailed(saveError.detail)
        : t.snapshot.loadFailed(saveError.slug, saveError.detail);

  /** The side panels, in the order they are shown. Each brief of this wave
   * adds one entry here and keeps its own module under src/. */
  const panels = [
    {
      id: "session",
      title: t.session.title,
      content: (
        <div className="pg-stack">
          <div className="pg-row">
            <Button onPress={() => setHistory(undo)} isDisabled={!canUndo(history)}>
              {t.session.undo}
            </Button>
            <Button onPress={() => setHistory(redo)} isDisabled={!canRedo(history)}>
              {t.session.redo}
            </Button>
            <Button onPress={() => setRunning((was) => !was)}>{running ? t.session.pause : t.session.resume}</Button>
          </div>
          <ChoiceGroup
            label={t.session.streamSpeed}
            hideLabel
            choices={SPEEDS.map(({ id, label }) => ({ id, label }))}
            value={speed}
            onChange={setSpeed}
          />
          <ChoiceGroup
            label={t.session.density}
            hideLabel
            choices={DENSITY_MODES.map((mode) => ({ id: mode, label: t.session.densityModes[mode] }))}
            value={density}
            onChange={setDensity}
          />
          {/* What both frames show: one screen, in one data state, so a
              look takes in both themes and directions of it. */}
          <Select<ScreenId>
            label={t.session.screen}
            options={SCREENS.map((id) => ({ id, label: t.session.screens[id] }))}
            value={screenSettings.screen}
            onChange={(screen) => setScreenSettings((settings) => ({ ...settings, screen }))}
          />
          <div className="pg-setting">
            <span className="pg-token__label" aria-hidden="true">
              {t.session.state}
            </span>
            <ChoiceGroup<DataState>
              label={t.session.state}
              hideLabel
              size="small"
              choices={DATA_STATES.map((id) => ({ id, label: t.session.states[id] }))}
              value={screenSettings.state}
              onChange={(state) => setScreenSettings((settings) => ({ ...settings, state }))}
            />
          </div>
          {screenSettings.screen === "market" && (
            <p className="pg-note">{t.session.marketNote}</p>
          )}
          {screenSettings.screen === "grid" && (
            <div className="pg-setting">
              <span className="pg-token__label" aria-hidden="true">
                {t.session.gridRows}
              </span>
              <ChoiceGroup<GridRowCount>
                label={t.session.gridRows}
                hideLabel
                size="small"
                choices={GRID_ROW_COUNTS.map((count) => ({ id: count, label: format.integer(count) }))}
                value={screenSettings.gridRows}
                onChange={(gridRows) => setScreenSettings((settings) => ({ ...settings, gridRows }))}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: "tokens",
      title: t.panels.tokens,
      content: (
        <ControlPanel
          tabs={tabs}
          overrides={overrides}
          values={values}
          selected={controlTab}
          onSelectTab={setControlTab}
          highlighted={highlighted}
          onEdit={(id, value, held) => {
            // The moment is read here, not in the updater, which has to
            // stay pure: React may run it more than once.
            const at = Date.now();
            setHistory((h) => setOverride(h, id, value, { at, held }));
          }}
          onEditEnd={() => {
            const at = Date.now();
            setHistory((h) => endEdit(h, at));
          }}
          onReset={(id) => setHistory((h) => clearOverride(h, id))}
        />
      ),
    },
    {
      id: "overrides",
      title: t.panels.overrides,
      tab: t.panels.overridesTab(Object.keys(overrides).length),
      content: (
        <OverrideList
          overrides={overrides}
          values={values}
          highlighted={highlighted}
          onReset={(id) => setHistory((h) => clearOverride(h, id))}
          onResetAll={() => setHistory(clearAll)}
        />
      ),
    },
    {
      id: "verification",
      title: t.panels.verification,
      tab: t.panels.checksTab,
      content: (
        <Verification
          tokens={tokens}
          densityTokens={densityTokens}
          density={density}
          files={files}
          onSelectCheck={(tab, checkTokens) => {
            setControlTab(tab);
            setHighlighted(checkTokens);
            setSideTab("tokens");
          }}
        />
      ),
    },
    ...AREA_PANELS.map(({ id, title, Component }) => ({
      id,
      title: title(t),
      content: <Component density={density} tokens={tokens} onContribute={handlers[id]!} />,
    })),
    {
      id: "snapshot",
      title: t.panels.snapshot,
      content: (
        <div className="pg-stack">
          <TextField
            label={t.snapshot.name}
            value={name}
            onChange={(value) => {
              setName(value);
              setTaken(false);
            }}
            dir="ltr"
            description={t.snapshot.description}
          />
          <div className="pg-row">
            <Button variant="primary" onPress={() => void save()}>
              {t.snapshot.save}
            </Button>
            {taken && <Button onPress={() => void save(true)}>{t.snapshot.replace(name.trim())}</Button>}
            {savedText && <StatusBadge tone="positive">{savedText}</StatusBadge>}
            {saveErrorText && <StatusBadge tone="negative">{saveErrorText}</StatusBadge>}
          </div>
          <div className="pg-row" data-testid="snapshot-load">
            <span className="pg-token__label">{t.snapshot.load}</span>
            {snapshots.length === 0 ? (
              <span className="pg-note">{t.snapshot.none}</span>
            ) : (
              snapshots.map((slug) => (
                <Button key={slug} onPress={() => void load(slug)}>
                  {slug}
                </Button>
              ))
            )}
          </div>
          <p className="pg-note">{t.snapshot.loadNote}</p>
        </div>
      ),
    },
    // The counters change with every stream frame; in a tab of their own
    // they no longer move the controls under them.
    {
      id: "stats",
      title: t.panels.stats,
      content: (
        <dl className="pg-stats" aria-label={t.stats.label}>
          {[
            { id: "effect", label: t.stats.stateToEffect, value: t.stats.ms(format.decimal(renderMs, 1)) },
            { id: "interval", label: t.stats.interval, value: t.stats.ms(format.integer(interval)) },
            { id: "tokens", label: t.stats.tokens, value: format.integer(Object.keys(tokens.light.variables).length) },
            { id: "revision", label: t.stats.revision, value: revision },
          ].map((stat) => (
            <div key={stat.id} className="pg-stats__row">
              <dt className="pg-token__label">{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ];

  return (
    // The header stays at the top of the window; the page scrolls in the
    // shell's region under it, whose scrollbar lane is reserved.
    <PageShell
      header={
        <AppHeader
          title={t.header.title}
          subtitle={t.header.subtitle}
          actions={
            <>
              <ChoiceGroup<ChromeTheme>
                label={t.header.themeLabel}
                hideLabel
                size="small"
                value={chromeTheme}
                onChange={setChromeTheme}
                choices={[
                  { id: "system", label: t.header.themes.system },
                  { id: "light", label: t.header.themes.light },
                  { id: "dark", label: t.header.themes.dark },
                ]}
              />
              <LanguageSwitch
                languages={CHROME_LANGUAGES}
                label={t.header.languageLabel}
                value={language}
                onChange={(next) => {
                  if (isChromeLanguage(next)) onLanguage(next);
                }}
              />
            </>
          }
        />
      }
    >
      <div className="pg-app" ref={app} style={regionStyle}>
        <aside className="pg-side">
          {panels
            .filter((panel) => panel.id === "session")
            .map((panel) => (
              <Panel key={panel.id} title={panel.title}>
                {panel.content}
              </Panel>
            ))}

          <Tabs
            label={t.panels.label}
            keepMounted
            selected={sideTab}
            onChange={setSideTab}
            items={panels
              .filter((panel) => panel.id !== "session")
              .map((panel) => ({
                id: panel.id,
                label: "tab" in panel && typeof panel.tab === "string" ? panel.tab : panel.title,
                content: <Panel title={panel.title}>{panel.content}</Panel>,
              }))}
          />
        </aside>

        <div className="pg-main">
          <PreviewGrid
            stream={stream}
            tokens={tokens}
            revision={revision}
            onRenderTime={setRenderMs}
            panelVariables={panelVariables}
            panelContent={panelContent}
            settings={screenSettings}
            onRetry={retry}
          />
        </div>
      </div>
    </PageShell>
  );
}
