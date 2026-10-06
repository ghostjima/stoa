// Whether the numeric promise survives the canvas. Ladder and Heatmap draw
// their numbers with `ctx.font`, which carries no feature settings, so the
// face itself has to. The panel measures rather than asserts: it registers
// the loaded file twice, once plain and once with the features the numeric
// role asks for, and reports what this browser drew.
import { Button, StatusBadge } from "@ghostjima/stoa-react";
import { useChromeText } from "../chromeLanguage";
import { descriptorVerdict, type CanvasNumericsReport } from "./canvasNumerics.ts";

export type CanvasNumericsProps = {
  report: CanvasNumericsReport | null;
  busy: boolean;
  /** The features the numeric role asks for, as CSS text. */
  featureSettings: string;
  onRun: () => void;
};

export function CanvasNumerics({ report, busy, featureSettings, onRun }: CanvasNumericsProps) {
  const t = useChromeText();
  const words = t.type.numerics;
  return (
    <div className="pg-stack">
      <div className="pg-row">
        <Button variant="primary" onPress={onRun} isDisabled={busy}>
          {busy ? words.measuring : words.measure}
        </Button>
        <code>{featureSettings}</code>
      </div>
      <p className="pg-note">{words.note}</p>

      {report === null ? (
        <p className="pg-note">{words.notMeasured}</p>
      ) : (
        <div className="pg-stack" data-testid="type-canvas-report">
          <p className="pg-note" data-testid="type-canvas-agent">
            {report.userAgent}
          </p>
          <p data-testid="type-canvas-verdict">{descriptorVerdict(report, t.type.report)}</p>
          {report.note && <p className="pg-note">{words.notes[report.note]}</p>}
          {report.routes.length > 0 && (
            <table className="stoa-table">
              <caption className="stoa-visually-hidden">{words.routesCaption(String(report.probeSizePx))}</caption>
              <thead>
                <tr>
                  <th scope="col">{words.route}</th>
                  <th scope="col">{words.result}</th>
                  <th scope="col" className="stoa-num">
                    {words.distinct}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.routes.map((route) => (
                  <tr key={route.id} data-route={route.id}>
                    <td>{words.routes[route.id](route.subject)}</td>
                    <td>
                      <StatusBadge tone={route.tabular ? "positive" : "warning"}>
                        {route.tabular ? words.tabular : words.notTabular}
                      </StatusBadge>
                    </td>
                    <td className="stoa-num">{route.distinct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {report.ladder && (
            <p data-testid="type-canvas-ladder">
              {words.ladderBefore} <code>{report.ladder.font}</code>:{" "}
              <StatusBadge tone={report.ladder.tabular ? "positive" : "negative"}>
                {report.ladder.tabular ? words.tabular : words.notTabular}
              </StatusBadge>{" "}
              {words.ladderAfter(report.ladder.distinct)}
            </p>
          )}
          <p className="pg-note">
            {words.reportedBefore} <code>{report.reportedFeatureSettings || words.reportedNothing}</code>
            {report.descriptorPresent ? words.reportedHas : words.reportedHasNot}
          </p>
        </div>
      )}
    </div>
  );
}
