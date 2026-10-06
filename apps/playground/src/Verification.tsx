// What the current tokens actually do: the real packages/tokens build and
// its tests, run by the dev server on the values in the panel, plus a
// comparison between the values the previews are using and the values the
// build emitted. A disagreement means the previews are lying and is shown
// as a failure, not a warning.
import { useEffect, useMemo, useState } from "react";
import { Button, StatusBadge, useStoaFormat } from "@ghostjima/stoa-react";
import { RULES } from "@ghostjima/stoa-tokens/checks";
import { requestBuild, type BuildResult } from "./api";
import { compareVariables, variablesFromCss, type Disagreement } from "./builtCss";
import { BrowserChecksPanel } from "./BrowserChecksPanel";
import { useChromeText } from "./chromeLanguage";
import { runBrowserChecks, type BrowserCheck, type BrowserChecks } from "./browserChecks";
import type { DensityMode, ResolvedTokens, Theme } from "./tokenModel";

/** How long after the last token change to wait before re-running every
 * check: typing a colour or dragging a slider changes the resolved tokens
 * on every keystroke or frame, and a full run is cheap but not free. */
const CHECK_DEBOUNCE_MS = 120;

export type VerificationProps = {
  tokens: Record<Theme, ResolvedTokens>;
  /** Resolved tokens per density mode, so target-size is checked in all
   * three the way CI checks it, not only the one the previews show. */
  densityTokens: Record<DensityMode, ResolvedTokens>;
  density: DensityMode;
  /** The current token files as text, exactly as they would be written. */
  files: Record<string, string>;
  /** A verification failure was picked: which tab to show and which
   * tokens to highlight in it. */
  onSelectCheck: (tab: string, tokens: string[]) => void;
};

const tabForRule = (rule: string): string => (rule === RULES.targetSize ? "density" : "colour");

type Agreement = Record<Theme, Disagreement[]>;

/** A build result, and the token files it was taken on as written text. */
type Verdict = { files: string; built: BuildResult };
/** A refusal from the endpoint, and the files the request carried. */
type Failure = { files: string; message: string };

const THEMES: Theme[] = ["light", "dark"];
/** Disagreements listed before the rest are counted only. */
const SHOWN = 8;

/** The browser checks predict only the known-violations gate in
 * scripts/checks.test.mjs; the server runs every test file in
 * packages/tokens. So a server failure the browser does not predict is not
 * a disagreement: it may come from another test file, or from a known
 * violation's value drifting past the recorded tolerance, which the
 * browser does not check. Only a server pass beside a predicted gate
 * failure contradicts the browser. */
function GateAgreement({ testsPassed, browserFails }: { testsPassed: boolean; browserFails: boolean }) {
  const t = useChromeText();
  if (testsPassed && !browserFails) return <StatusBadge tone="positive">{t.verify.gateBothPass}</StatusBadge>;
  if (testsPassed && browserFails) return <StatusBadge tone="negative">{t.verify.gateServerOnly}</StatusBadge>;
  if (browserFails) return <StatusBadge tone="neutral">{t.verify.gateBothFail}</StatusBadge>;
  return <StatusBadge tone="warning">{t.verify.gateUncovered}</StatusBadge>;
}

export function Verification({ tokens, densityTokens, density, files, onSelectCheck }: VerificationProps) {
  const t = useChromeText();
  const format = useStoaFormat();
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [browser, setBrowser] = useState<BrowserChecks>(() => runBrowserChecks({ themes: tokens, densities: densityTokens }));
  /** How long the last debounced run took; null until one has run, since
   * the first result above is computed on mount without being timed. */
  const [browserMs, setBrowserMs] = useState<number | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      const start = performance.now();
      const next = runBrowserChecks({ themes: tokens, densities: densityTokens });
      setBrowserMs(performance.now() - start);
      setBrowser(next);
    }, CHECK_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [tokens, densityTokens]);

  // A verdict belongs to the token files it was taken on, so it is kept with
  // them and shown only while they are the files on screen. An edit retires
  // it the moment it lands, including an edit made while the build is still
  // running: a "passed" beside changed tokens is the one thing this panel
  // must not show.
  const filesKey = JSON.stringify(files);
  const result = verdict !== null && verdict.files === filesKey ? verdict.built : null;
  const error = failure !== null && failure.files === filesKey ? failure.message : null;

  // The comparison is read off the CSS the build emitted rather than stored
  // beside it, so it follows the theme and density on screen and cannot
  // outlive the result it came from.
  const agreement = useMemo<Agreement | null>(
    () =>
      result?.css
        ? {
            light: compareVariables(tokens.light.variables, variablesFromCss(result.css, "light", density)),
            dark: compareVariables(tokens.dark.variables, variablesFromCss(result.css, "dark", density)),
          }
        : null,
    [result, tokens, density],
  );

  const run = async () => {
    const ranOn = filesKey;
    setBusy(true);
    setFailure(null);
    try {
      const built = await requestBuild(files);
      setVerdict({ files: ranOn, built });
    } catch (cause) {
      setVerdict(null);
      setFailure({ files: ranOn, message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setBusy(false);
    }
  };

  const disagreements = agreement ? THEMES.flatMap((theme) => agreement[theme]) : [];

  return (
    <div className="pg-verify">
      <div className="pg-row pg-row--between">
        <Button variant="primary" onPress={run} isDisabled={busy}>
          {busy ? t.verify.building : t.verify.build}
        </Button>
        {result && (
          <span className="pg-verify__commit">
            {t.verify.commit} <code>{result.commit.slice(0, 7)}</code>
            {result.dirty ? ` ${t.verify.dirty}` : ""}
          </span>
        )}
      </div>

      {error && (
        <p className="pg-verify__error" role="alert">
          {t.verify.failed(error)}
        </p>
      )}

      {result && (
        <dl className="pg-verify__results" data-testid="build-results">
          <dt>{t.verify.buildRow}</dt>
          <dd data-testid="build-status">
            <StatusBadge tone={result.build.ok ? "positive" : "negative"}>
              {result.build.ok ? t.verify.passed : t.verify.notPassed}
            </StatusBadge>
            <code>{result.build.command}</code>
          </dd>
          <dt>{t.verify.testsRow}</dt>
          <dd data-testid="test-status">
            <StatusBadge tone={result.test.ok ? "positive" : "negative"}>
              {result.test.ok ? t.verify.passed : t.verify.notPassed}
            </StatusBadge>
            <code>{result.test.command}</code>
          </dd>
          <dt>{t.verify.previewRow}</dt>
          <dd data-testid="agreement-status">
            {agreement === null ? (
              <StatusBadge tone="neutral">{t.verify.noCss}</StatusBadge>
            ) : (
              <StatusBadge tone={disagreements.length === 0 ? "positive" : "negative"}>
                {disagreements.length === 0
                  ? t.verify.agrees(Object.keys(tokens.light.variables).length)
                  : t.verify.disagree(disagreements.length)}
              </StatusBadge>
            )}
          </dd>
          {result.build.ok && browser.available && (
            <>
              <dt>{t.verify.gateRow}</dt>
              <dd data-testid="checks-agreement-status">
                <GateAgreement testsPassed={result.test.ok} browserFails={browser.wouldFailServerTests} />
              </dd>
            </>
          )}
        </dl>
      )}

      {disagreements.length > 0 && (
        <table className="stoa-table">
          <caption className="stoa-visually-hidden">{t.verify.differCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.verify.variable}</th>
              <th scope="col">{t.verify.preview}</th>
              <th scope="col">{t.verify.built}</th>
            </tr>
          </thead>
          <tbody>
            {disagreements.slice(0, SHOWN).map((row) => (
              <tr key={`${row.variable}-${row.built}`}>
                <td>
                  <code>{row.variable}</code>
                </td>
                <td>
                  <code>{row.live}</code>
                </td>
                <td>
                  <code>{row.built}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result && (
        <>
          <h3 className="pg-group__title">{t.verify.testOutput}</h3>
          <pre className="pg-output" data-testid="test-output">
            {result.test.output.trim() || t.verify.noOutput}
          </pre>
          {!result.build.ok && (
            <>
              <h3 className="pg-group__title">{t.verify.buildOutput}</h3>
              <pre className="pg-output">{result.build.output.trim() || t.verify.noOutput}</pre>
            </>
          )}
        </>
      )}

      <h3 className="pg-group__title">{t.verify.browserChecks}</h3>
      {browser.available ? (
        <>
          <p className="pg-note" data-testid="browser-checks-cost">
            {browserMs === null
              ? t.verify.notTimed(browser.checks.length)
              : t.verify.timed(browser.checks.length, format.decimal(browserMs, 2))}
          </p>
          <BrowserChecksPanel
            checks={browser.checks}
            unproduced={browser.unproduced}
            onSelect={(check: BrowserCheck) => onSelectCheck(tabForRule(check.rule), check.tokens)}
          />
        </>
      ) : (
        <p className="pg-note" role="alert">
          {t.verify.unavailable(browser.note)}
        </p>
      )}
    </div>
  );
}
