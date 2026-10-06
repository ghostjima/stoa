// Two frames of the same screen, each showing one of four views (light or
// dark, left to right or right to left) in English, Russian or Arabic.
// Which screen, and in which data state, is the side panel's choice and
// the same in both frames. Token values are written as CSS variables on
// each frame's container, never on the document, so one edit re-themes
// both screens without a page-wide restyle.
//
// Overlays (dialogs, sheets, toasts) open inside the frame they were
// opened from: React Aria portals them to the document's body unless an
// UNSAFE_PortalProvider names another container, and each frame names its
// own, inside its body. There they take the frame's theme, direction,
// density, motion and colour-vision filter like everything else in it.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import {
  Button,
  ChoiceGroup,
  Heatmap,
  I18nProvider,
  Ladder,
  Panel,
  Select,
  StatusBadge,
  Tabs,
  TextField,
  TimeSlider,
  Toggle,
  TradeTable,
  useStoaFormat,
} from "@ghostjima/stoa-react";
import { CVD_CHOICES, CvdFilterDefs, cvdFilterStyle, type CvdMode } from "./cvdPreview";
import type { ResolvedTokens, Theme } from "./tokenModel";
import { HISTORY, timeAt, type Stream, type StreamFrame } from "./stream";
import { LANGUAGES, SCREEN_TEXT, localeFor, retypeDigits, type Language } from "./screenText";
import type { ScreenId, ScreenSettings } from "./screens/model";
import type { ComponentScreenProps } from "./screens/parts";
import { ControlsScreen } from "./screens/ControlsScreen";
import { FeedbackScreen } from "./screens/FeedbackScreen";
import { OverlaysScreen } from "./screens/OverlaysScreen";
import { ChartsScreen } from "./screens/ChartsScreen";
import { GridScreen } from "./screens/GridScreen";

/** The component screens, by id; Market is the dense screen below. */
const COMPONENT_SCREENS: Record<Exclude<ScreenId, "market">, (props: ComponentScreenProps) => ReactNode> = {
  controls: ControlsScreen,
  feedback: FeedbackScreen,
  overlays: OverlaysScreen,
  charts: ChartsScreen,
  grid: GridScreen,
};

export type FrameSpec = { id: string; label: string; theme: Theme; dir: "ltr" | "rtl" };

/** The views a frame can show. */
export const VIEWS: FrameSpec[] = [
  { id: "light-ltr", label: "Light, left to right", theme: "light", dir: "ltr" },
  { id: "light-rtl", label: "Light, right to left", theme: "light", dir: "rtl" },
  { id: "dark-ltr", label: "Dark, left to right", theme: "dark", dir: "ltr" },
  { id: "dark-rtl", label: "Dark, right to left", theme: "dark", dir: "rtl" },
];

export type PreviewGridProps = {
  stream: Stream;
  tokens: Record<Theme, ResolvedTokens>;
  /** Digest of the current token values; canvases are keyed on it. */
  revision: string;
  onRenderTime: (ms: number) => void;
  /** Variables the area panels contribute, written after the token values
   * so that a panel can override a token inside the previews. */
  panelVariables?: Record<string, string>;
  /** Content the area panels contribute, inside every frame. */
  panelContent?: ReactNode;
  /** The screen both frames show, its data state and the grid's rows. */
  settings: ScreenSettings;
  /** Retry on a screen's error: back to live data. Stable, so the
   * component screens do not re-render with every stream frame. */
  onRetry: () => void;
};

/** What the two frames show on load: between them, both themes and both
 * directions. */
const INITIAL_VIEWS = ["light-ltr", "dark-rtl"];

const VIEW_OPTIONS = VIEWS.map(({ id, label }) => ({ id, label }));

/** What `[data-motion="reduce"]` sets in tokens.css. The frame writes the
 * token values inline, which outranks that rule, so a reduced frame writes
 * these after them. */
const REDUCED_MOTION = {
  "--stoa-motion-duration-fast": "0ms",
  "--stoa-motion-duration-base": "0ms",
  "--stoa-motion-duration-slow": "0ms",
  "--stoa-motion-duration-flash": "0ms",
};

export function PreviewGrid({
  stream,
  tokens,
  revision,
  onRenderTime,
  panelVariables,
  panelContent,
  settings,
  onRetry,
}: PreviewGridProps) {
  const [frame, setFrame] = useState(() => stream.current());
  const published = useRef(0);

  useEffect(
    () =>
      stream.subscribe((next) => {
        published.current = performance.now();
        setFrame(next);
      }),
    [stream],
  );
  useEffect(() => {
    if (published.current > 0) onRenderTime(performance.now() - published.current);
  }, [frame, onRenderTime]);

  return (
    <div className="pg-frames">
      <CvdFilterDefs />
      {INITIAL_VIEWS.map((view, index) => (
        <PreviewFrame
          key={index}
          slot={index + 1}
          initialView={view}
          stream={stream}
          tokens={tokens}
          revision={revision}
          frame={frame}
          panelVariables={panelVariables}
          panelContent={panelContent}
          settings={settings}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}

function PreviewFrame({
  slot,
  initialView,
  stream,
  tokens,
  revision,
  frame,
  panelVariables,
  panelContent,
  settings,
  onRetry,
}: {
  slot: number;
  initialView: string;
  stream: Stream;
  tokens: Record<Theme, ResolvedTokens>;
  revision: string;
  frame: StreamFrame;
  panelVariables?: Record<string, string>;
  panelContent?: ReactNode;
  settings: ScreenSettings;
  onRetry: () => void;
}) {
  // Local, visual-only, and irrelevant to what the checks measure: a
  // preview is one person looking at one frame, not a value that follows
  // the tokens into history or a snapshot.
  const [cvd, setCvd] = useState<CvdMode>("none");
  const [view, setView] = useState(initialView);
  // The language of the screen's words and digits, apart from the view:
  // Arabic in a left-to-right frame is a case to look at, not an error.
  const [language, setLanguage] = useState<Language>("en");
  // The frame's own reduced-motion setting, as an application would offer
  // it; the system setting applies to the whole page through tokens.css.
  const [reducedMotion, setReducedMotion] = useState(false);
  // Keyboard shortcuts on a screen run only while the focus is inside its
  // frame, so a key pressed in one frame does not act in both. An overlay
  // opened from the frame is portalled into it, so it keeps them on.
  const [focused, setFocused] = useState(false);
  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  }, []);
  // The frame's own container for overlays; React Aria asks for it when an
  // overlay opens, by which time it is in the document.
  const overlays = useRef<HTMLDivElement>(null);
  const overlayContainer = useCallback(() => overlays.current, []);
  // The overlay box covers the part of the frame in view: it sticks to the
  // top of the page's region, and its height is what is left of the frame
  // between there and the region's bottom (app.css), so a dialog opened
  // in a frame that starts half way down the window is centred in what
  // shows of it, not partly below the window.
  useEffect(() => {
    const box = overlays.current;
    const layer = box?.parentElement;
    const body = layer?.parentElement;
    const region = box?.closest<HTMLElement>(".stoa-page-shell__scroll");
    if (!box || !layer || !body || !region) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const a = body.getBoundingClientRect();
      const r = region.getBoundingClientRect();
      const visible = Math.max(0, Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top));
      layer.style.setProperty("--pg-frame-visible", `${visible}px`);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    region.addEventListener("scroll", schedule, { passive: true });
    const sizes = new ResizeObserver(schedule);
    sizes.observe(region);
    sizes.observe(body);
    return () => {
      cancelAnimationFrame(frame);
      region.removeEventListener("scroll", schedule);
      sizes.disconnect();
    };
  }, []);
  const spec = VIEWS.find((candidate) => candidate.id === view) ?? VIEWS[0]!;
  const name = `Preview ${slot}`;
  const ComponentScreen = settings.screen === "market" ? null : COMPONENT_SCREENS[settings.screen];
  return (
    <section className="pg-frame" aria-label={`${name}: ${spec.label}`} data-slot={slot}>
      <header className="pg-frame__header">
        <div className="pg-frame__picks">
          <Select label={`${name} view`} hideLabel size="small" options={VIEW_OPTIONS} value={view} onChange={setView} />
          <ChoiceGroup
            label={`${name}: language`}
            hideLabel
            size="small"
            choices={LANGUAGES}
            value={language}
            onChange={setLanguage}
          />
        </div>
        <div className="pg-frame__picks">
          <Toggle size="small" isSelected={reducedMotion} onChange={setReducedMotion}>
            Reduced motion
          </Toggle>
          <ChoiceGroup
            label={`${name}: colour-vision preview`}
            hideLabel
            size="small"
            choices={CVD_CHOICES}
            value={cvd}
            onChange={setCvd}
          />
        </div>
      </header>
      <div
        className="pg-frame__body"
        data-frame={spec.id}
        data-theme={spec.theme}
        data-cvd={cvd}
        data-motion={reducedMotion ? "reduce" : undefined}
        dir={spec.dir}
        lang={language}
        style={
          {
            ...tokens[spec.theme].variables,
            ...panelVariables,
            ...(reducedMotion ? REDUCED_MOTION : {}),
            ...cvdFilterStyle(cvd),
          } as CSSProperties
        }
        data-screen={settings.screen}
        data-state={settings.screen === "market" ? undefined : settings.state}
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
      >
        <UNSAFE_PortalProvider getContainer={overlayContainer}>
          <I18nProvider locale={localeFor(language, spec.dir)}>
            {ComponentScreen ? (
              <ComponentScreen
                language={language}
                state={settings.state}
                onRetry={onRetry}
                shortcutsEnabled={focused}
                stream={stream}
                gridRows={settings.gridRows}
              />
            ) : (
              // The canvases read their colours and direction when they
              // mount, so a change of view re-mounts them like a token
              // edit does.
              <Screen stream={stream} frame={frame} language={language} revision={`${revision}:${spec.id}`} />
            )}
            {panelContent}
          </I18nProvider>
        </UNSAFE_PortalProvider>
        {/* Where the frame's overlays go: a layer over the body whose box
            follows the part of the frame in view (app.css). */}
        <div className="pg-frame__overlays">
          <div ref={overlays} className="pg-frame__overlay-box" data-overlays={spec.id} />
        </div>
      </div>
    </section>
  );
}

/** A frame's market time to the tenth of a second, "HH:MM:SS.s". */
const clock = (tick: number) => timeAt(tick).slice(0, 10);

/** The dense screen under test: the two canvas views, the trades tape, and
 * the controls and form fields, at sizes a real screen would use. Its
 * words come from `screenText.ts`, its numbers from the frame's locale. */
function Screen({
  stream,
  frame,
  language,
  revision,
}: {
  stream: Stream;
  frame: StreamFrame;
  language: Language;
  revision: string;
}) {
  const text = SCREEN_TEXT[language];
  const locale = useStoaFormat();
  const [side, setSide] = useState("buy");
  // The screen mounts in whatever language the frame is in (coming back
  // from another screen, for example), so its first values are too.
  const [limit, setLimit] = useState(() => retypeDigits("222.60", "en", language));
  const [quantity, setQuantity] = useState(() => retypeDigits("500", "en", language));
  // The fields hold what was typed; when the language changes, their
  // digits are rewritten so the values carry over.
  const [typedIn, setTypedIn] = useState(language);
  if (typedIn !== language) {
    setTypedIn(language);
    setLimit(retypeDigits(limit, typedIn, language));
    setQuantity(retypeDigits(quantity, typedIn, language));
  }
  // The frame the heatmap is replaying, or null to follow the stream. A
  // replayed frame stays put while the stream moves on, until it falls out
  // of the history and is held at its oldest frame.
  const [replayAt, setReplayAt] = useState<number | null>(null);
  const live = frame.tick;
  const earliest = live - (HISTORY - 1);
  const shown = replayAt === null ? live : Math.max(replayAt, earliest);

  return (
    <div className="pg-screen">
      <div className="pg-screen__column">
        {/* TODO(brief 02): the canvas components read their colours once and
            do not notice a variable change on a wrapper, so a token edit
            re-mounts them through `revision`. When the token-change signal
            of docs/stage-1/02-token-signal.md merges, drop the key and let
            them re-read instead: a re-mount also resets the live region. */}
        <Panel title={text.orderBook}>
          <Ladder key={revision} depth={12} data={frame.book} label={text.orderBookLabel} />
        </Panel>
        <Panel title={text.order}>
          <div className="pg-form">
            <ChoiceGroup
              label={text.side}
              hideLabel
              choices={[
                { id: "buy", label: text.buy },
                { id: "sell", label: text.sell },
              ]}
              value={side}
              onChange={setSide}
            />
            <TextField
              label={text.limitPrice}
              value={limit}
              onChange={setLimit}
              dir="ltr"
              mono
              description={text.tick(locale.decimal(0.01, 2))}
            />
            <TextField label={text.quantity} value={quantity} onChange={setQuantity} dir="ltr" mono />
            <div className="pg-row">
              <Button variant="primary">{text.send}</Button>
              <Button>{text.clear}</Button>
              <StatusBadge tone="warning">{text.marketable}</StatusBadge>
            </div>
          </div>
        </Panel>
      </div>
      <div className="pg-screen__column">
        <Panel title={text.liquidity}>
          <Heatmap
            key={revision}
            height={180}
            data={replayAt === null ? frame.heatmap : stream.heatmapAt(shown)}
            label={text.liquidityLabel}
            description={text.liquidityDescription}
          />
          {/* The end of the track is live; anywhere before it replays. */}
          <TimeSlider
            label={text.replayTime}
            hideLabel
            min={earliest}
            max={live}
            step={1}
            value={shown}
            onChange={(at) => setReplayAt(at >= live ? null : at)}
            format={(tick) => locale.digits(clock(tick))}
          />
        </Panel>
        <Panel title={text.trades}>
          <Tabs
            label={text.tradesView}
            items={[
              { id: "tape", label: text.tape, content: <TradeTable trades={frame.trades} caption={text.tapeCaption} /> },
              {
                id: "summary",
                label: text.summary,
                // A table like the tape beside it, so it takes the frame's
                // density: font size, row height and cell padding.
                content: (
                  <table className="stoa-table stoa-table--numeric pg-summary">
                    <caption className="stoa-visually-hidden">{text.summaryCaption}</caption>
                    <tbody>
                      <tr>
                        <th scope="row">{text.mid}</th>
                        <td className="stoa-num">{locale.decimal(frame.mid, 2)}</td>
                      </tr>
                      <tr>
                        <th scope="row">{text.tradeCount}</th>
                        <td className="stoa-num">{locale.integer(frame.trades.length)}</td>
                      </tr>
                      <tr>
                        <th scope="row">{text.frame}</th>
                        <td className="stoa-num">{locale.integer(frame.tick)}</td>
                      </tr>
                    </tbody>
                  </table>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
