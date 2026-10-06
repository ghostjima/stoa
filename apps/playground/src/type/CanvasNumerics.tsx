// Whether the numeric promise survives the canvas. Ladder and Heatmap draw
// their numbers with `ctx.font`, which carries no feature settings, so the
// face itself has to. The panel measures rather than asserts: it registers
// the loaded file twice, once plain and once with the features the numeric
// role asks for, and reports what this browser drew.
import { Button, StatusBadge } from "@ghostjima/stoa-react";
import { descriptorVerdict, type CanvasNumericsReport } from "./canvasNumerics.ts";

export type CanvasNumericsProps = {
  report: CanvasNumericsReport | null;
  busy: boolean;
  /** The features the numeric role asks for, as CSS text. */
  featureSettings: string;
  onRun: () => void;
};

export function CanvasNumerics({ report, busy, featureSettings, onRun }: CanvasNumericsProps) {
  return (
    <div className="pg-stack">
      <div className="pg-row">
        <Button variant="primary" onPress={onRun} isDisabled={busy}>
          {busy ? "Measuring..." : "Measure the canvas"}
        </Button>
        <code>{featureSettings}</code>
      </div>
      <p className="pg-note">
        The numeric role&apos;s file is registered as a FontFace with these features and the digits are measured on a
        canvas. The same measurement is taken through the canvas element&apos;s own font-feature-settings, which the
        specification does not promise.
      </p>

      {report === null ? (
        <p className="pg-note">Not measured yet in this browser.</p>
      ) : (
        <div className="pg-stack" data-testid="type-canvas-report">
          <p className="pg-note" data-testid="type-canvas-agent">
            {report.userAgent}
          </p>
          <p data-testid="type-canvas-verdict">{descriptorVerdict(report)}</p>
          {report.note && <p className="pg-note">{report.note}</p>}
          {report.routes.length > 0 && (
            <table className="stoa-table">
              <caption className="stoa-visually-hidden">
                Digit advances on canvas, per route, at {report.probeSizePx}px
              </caption>
              <thead>
                <tr>
                  <th scope="col">Route</th>
                  <th scope="col">Result</th>
                  <th scope="col" className="stoa-num">
                    Distinct advances
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.routes.map((route) => (
                  <tr key={route.id} data-route={route.id}>
                    <td>{route.label}</td>
                    <td>
                      <StatusBadge tone={route.tabular ? "positive" : "warning"}>
                        {route.tabular ? "tabular" : "not tabular"}
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
              Ladder draws with <code>{report.ladder.font}</code>:{" "}
              <StatusBadge tone={report.ladder.tabular ? "positive" : "negative"}>
                {report.ladder.tabular ? "tabular" : "not tabular"}
              </StatusBadge>{" "}
              {report.ladder.distinct} distinct advance(s) across the ten digits.
            </p>
          )}
          <p className="pg-note">
            The browser reported the descriptor as <code>{report.reportedFeatureSettings || "nothing"}</code>, and a
            FontFace object {report.descriptorPresent ? "has" : "does not have"} the property.
          </p>
        </div>
      )}
    </div>
  );
}
