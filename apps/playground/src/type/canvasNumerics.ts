// Canvas has no `font-feature-settings` property: `ctx.font` is a font
// shorthand, and Ladder and Heatmap draw their numbers with it. So a
// numeric face that needs `tnum` has to carry the feature itself, through a
// `FontFace` registered with the `featureSettings` descriptor.
//
// Whether that works is a question about the browser, so nothing here
// assumes an answer: every route is measured on a canvas in the browser the
// tool is running in, and the panel reports the measurement.
import { readCanvasTokens } from "@ghostjima/stoa-react";

/** The ten Latin digits, the set the canvas views draw. */
export const CANVAS_DIGITS = "0123456789";

export type RouteId = "plain" | "descriptor" | "element-css";

export type NumericRoute = {
  id: RouteId;
  label: string;
  /** Advance per digit in CSS pixels, at the probe size. */
  widths: number[];
  distinct: number;
  tabular: boolean;
};

export type CanvasNumericsReport = {
  /** `navigator.userAgent`, so the verdict names the browser it is about. */
  userAgent: string;
  /** Whether a `FontFace` object has the descriptor at all. It says nothing
   * about whether canvas honours it, which is what the routes measure. */
  descriptorPresent: boolean;
  /** What the browser normalised the descriptor to, for the record. */
  reportedFeatureSettings: string;
  probeSizePx: number;
  routes: NumericRoute[];
  /** The verdict for the canvas components: the same font shorthand Ladder
   * builds, measured on a canvas. */
  ladder: { font: string; widths: number[]; distinct: number; tabular: boolean } | null;
  /** Why there is no report, when there is none. */
  note: string | null;
};

export const tabularFromWidths = (widths: number[]): boolean => widths.length > 0 && new Set(widths).size === 1;

/** Advances of the ten digits under one font shorthand, rounded so that
 * sub-pixel noise does not read as ten different advances. */
export function measureDigitWidths(context: CanvasRenderingContext2D, font: string): number[] {
  context.font = font;
  return [...CANVAS_DIGITS].map((digit) => Math.round(context.measureText(digit).width * 100) / 100);
}

const route = (id: RouteId, label: string, widths: number[]): NumericRoute => ({
  id,
  label,
  widths,
  distinct: new Set(widths).size,
  tabular: tabularFromWidths(widths),
});

/** Register one font file twice under two family names: once as it is, once
 * with the features the numeric role asks for baked into the face. The
 * names are the caller's, so a re-register replaces rather than piles up. */
export async function registerNumericFaces(
  plainFamily: string,
  featureFamily: string,
  bytes: ArrayBuffer,
  featureSettings: string,
): Promise<{ descriptorPresent: boolean; reportedFeatureSettings: string }> {
  const plain = new FontFace(plainFamily, bytes);
  const withFeatures = new FontFace(featureFamily, bytes, { featureSettings });
  const descriptorPresent = "featureSettings" in plain;
  await Promise.all([plain.load(), withFeatures.load()]);
  document.fonts.add(plain);
  document.fonts.add(withFeatures);
  return { descriptorPresent, reportedFeatureSettings: withFeatures.featureSettings ?? "" };
}

export type ProbeInput = {
  /** The two registered families, or null when no font is loaded. */
  families: { plain: string; withFeatures: string } | null;
  descriptorPresent: boolean;
  reportedFeatureSettings: string;
  /** The feature text to try through the element's own CSS. */
  featureSettings: string;
  probeSizePx?: number;
  /** A preview frame, read for the shorthand Ladder would use. */
  frame: HTMLElement | null;
};

/** Measure the routes. The canvas is created here and thrown away: a probe
 * must not leave a canvas behind that a later measurement could inherit
 * state from. */
export function probeCanvasNumerics(input: ProbeInput): CanvasNumericsReport {
  const probeSizePx = input.probeSizePx ?? 400;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const base: CanvasNumericsReport = {
    userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
    descriptorPresent: input.descriptorPresent,
    reportedFeatureSettings: input.reportedFeatureSettings,
    probeSizePx,
    routes: [],
    ladder: null,
    note: null,
  };
  if (!context) return { ...base, note: "this browser gave no 2d canvas context, so nothing was measured" };

  const routes: NumericRoute[] = [];
  if (input.families) {
    const { plain, withFeatures } = input.families;
    routes.push(route("plain", `${plain} as loaded`, measureDigitWidths(context, `${probeSizePx}px ${plain}`)));
    routes.push(
      route(
        "descriptor",
        `FontFace featureSettings: ${input.featureSettings}`,
        measureDigitWidths(context, `${probeSizePx}px ${withFeatures}`),
      ),
    );
    // The canvas element's own computed style, which the specification does
    // not promise and which is measured rather than assumed.
    canvas.style.fontFeatureSettings = input.featureSettings;
    document.body.append(canvas);
    routes.push(
      route(
        "element-css",
        `font-feature-settings on the canvas element: ${input.featureSettings}`,
        measureDigitWidths(context, `${probeSizePx}px ${plain}`),
      ),
    );
    canvas.remove();
    canvas.style.fontFeatureSettings = "";
  }

  const frame = input.frame;
  const ladder = frame
    ? (() => {
        const font = readCanvasTokens(frame).font;
        const widths = measureDigitWidths(context, font);
        return { font, widths, distinct: new Set(widths).size, tabular: tabularFromWidths(widths) };
      })()
    : null;

  return {
    ...base,
    routes,
    ladder,
    note: input.families ? null : "load a font to compare the routes; the Ladder row is measured either way",
  };
}

/** The sentence the panel shows about the descriptor: taken from the two
 * measurements, not from the descriptor being present. */
export function descriptorVerdict(report: CanvasNumericsReport): string {
  const plain = report.routes.find((item) => item.id === "plain");
  const descriptor = report.routes.find((item) => item.id === "descriptor");
  if (!plain || !descriptor) return "no font loaded, so the descriptor has not been tried here";
  const changed = plain.widths.join(",") !== descriptor.widths.join(",");
  if (!changed) {
    return report.descriptorPresent
      ? "this browser has the featureSettings descriptor but canvas drew the same advances, so it did not take effect here"
      : "this browser has no featureSettings descriptor on FontFace, and canvas drew the same advances";
  }
  return descriptor.tabular
    ? "the featureSettings descriptor reached canvas: the registered face draws all ten digits at one advance"
    : "the featureSettings descriptor reached canvas: it changed the advances, though they are still not all equal";
}
