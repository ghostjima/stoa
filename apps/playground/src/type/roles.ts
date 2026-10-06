// Six type roles, in two hierarchies that are sized differently on purpose.
//
// Reading roles (display, heading, body) are a modular scale: one base size
// and one ratio, rounded to whole pixels, because a reading hierarchy is
// about the steps between sizes. Working roles (label, numeric, code) are
// tied to density instead: a row that is 22px tall does not get a larger
// label because the ratio changed, it gets the size the density mode says
// plus a fixed offset. The two rules live side by side here so that a size
// on screen can always be traced to one of them.
import type { DensityMode } from "../tokenModel";

export type RoleId = "display" | "heading" | "body" | "label" | "numeric" | "code";
export type Hierarchy = "reading" | "working";

export const ROLE_IDS: RoleId[] = ["display", "heading", "body", "label", "numeric", "code"];

/** The ratio control's range, as the brief states it. */
export const RATIO_MIN = 1.125;
export const RATIO_MAX = 1.333;

/** Sizes never go below this, whatever the density offset asks for. */
export const MIN_SIZE_PX = 9;

export const WEIGHT_MIN = 1;
export const WEIGHT_MAX = 1000;

export type Tracking = { value: number; unit: "px" | "rem" };

/** The two numbers a pairing needs from a font file. Null means the font
 * has not been inspected, or states no x-height. */
export type FaceMetrics = { xHeight: number | null; upem: number | null };

export const NO_METRICS: FaceMetrics = { xHeight: null, upem: null };

export type ArabicPairing = {
  /** The Arabic face this role pairs with, empty for none. */
  family: string;
  /** The pairing face's metrics, as inspected. */
  metrics: FaceMetrics;
};

export type TypeRole = {
  id: RoleId;
  hierarchy: Hierarchy;
  family: string;
  /** Reading roles: the step on the scale, 0 being the base. */
  step: number;
  /** Working roles: pixels added to the density mode's font size. */
  densityOffset: number;
  weight: number;
  lineHeight: number;
  tracking: Tracking;
  /** Variation axis settings, by tag. */
  axes: Record<string, number>;
  /** Feature settings, by tag; 0 turns a feature off. */
  features: Record<string, number>;
  arabic: ArabicPairing;
};

export type ScaleSettings = {
  /** The base of the reading scale, in pixels: the body size. */
  base: number;
  ratio: number;
};

export const DEFAULT_SCALE: ScaleSettings = { base: 14, ratio: 1.25 };

const noArabic = (): ArabicPairing => ({ family: "", metrics: NO_METRICS });

/** The roles as the panel starts: Stoa's own families, the weights the
 * components use today, and the numeric role asking for tabular figures
 * because that is the promise the tables make. */
export const DEFAULT_ROLES: Record<RoleId, TypeRole> = {
  display: {
    id: "display",
    hierarchy: "reading",
    family: "IBM Plex Sans",
    step: 3,
    densityOffset: 0,
    weight: 600,
    lineHeight: 1.25,
    tracking: { value: -0.01, unit: "rem" },
    axes: {},
    features: {},
    arabic: noArabic(),
  },
  heading: {
    id: "heading",
    hierarchy: "reading",
    family: "IBM Plex Sans",
    step: 1,
    densityOffset: 0,
    weight: 600,
    lineHeight: 1.25,
    tracking: { value: 0, unit: "px" },
    axes: {},
    features: {},
    arabic: noArabic(),
  },
  body: {
    id: "body",
    hierarchy: "reading",
    family: "IBM Plex Sans",
    step: 0,
    densityOffset: 0,
    weight: 400,
    lineHeight: 1.45,
    tracking: { value: 0, unit: "px" },
    axes: {},
    features: {},
    arabic: noArabic(),
  },
  label: {
    id: "label",
    hierarchy: "working",
    family: "IBM Plex Sans",
    step: 0,
    densityOffset: -1,
    weight: 500,
    lineHeight: 1.25,
    tracking: { value: 0.01, unit: "rem" },
    axes: {},
    features: {},
    arabic: noArabic(),
  },
  numeric: {
    id: "numeric",
    hierarchy: "working",
    family: "IBM Plex Mono",
    step: 0,
    densityOffset: 0,
    weight: 400,
    lineHeight: 1.25,
    tracking: { value: 0, unit: "px" },
    axes: {},
    features: { tnum: 1, zero: 1 },
    arabic: noArabic(),
  },
  code: {
    id: "code",
    hierarchy: "working",
    family: "IBM Plex Mono",
    step: 0,
    densityOffset: 0,
    weight: 400,
    lineHeight: 1.45,
    tracking: { value: 0, unit: "px" },
    axes: {},
    features: {},
    arabic: noArabic(),
  },
};

export const ROLE_LABELS: Record<RoleId, string> = {
  display: "Display",
  heading: "Heading",
  body: "Body",
  label: "Label",
  numeric: "Numeric",
  code: "Code",
};

/** A step on the modular scale, in whole pixels. */
export function readingSize(scale: ScaleSettings, step: number): number {
  return Math.max(MIN_SIZE_PX, Math.round(scale.base * scale.ratio ** step));
}

/** A working size: the density mode's font size, offset. */
export function workingSize(densityFontSize: number, offset: number): number {
  return Math.max(MIN_SIZE_PX, Math.round(densityFontSize + offset));
}

export type SizeContext = {
  scale: ScaleSettings;
  /** The `font-size` of the density mode on screen, in pixels. */
  densityFontSize: number;
};

export function roleSize(role: TypeRole, context: SizeContext): number {
  return role.hierarchy === "reading"
    ? readingSize(context.scale, role.step)
    : workingSize(context.densityFontSize, role.densityOffset);
}

/** Where a size came from, in the words the panel shows beside it. */
export function sizeProvenance(role: TypeRole, context: SizeContext, density: DensityMode): string {
  if (role.hierarchy === "reading") {
    return `${context.scale.base}px base times ${context.scale.ratio} to the power ${role.step}, rounded`;
  }
  const sign = role.densityOffset >= 0 ? "+" : "";
  return `${density} density font-size ${context.densityFontSize}px ${sign}${role.densityOffset}px`;
}

/** The percentage for CSS `size-adjust` on a fallback face so that its
 * x-height lands on the primary's. Null when either font has not been
 * inspected or states no x-height: a guessed number here would silently
 * misalign every mixed line. */
export function sizeAdjustPercent(primary: FaceMetrics, fallback: FaceMetrics): number | null {
  const ratio = (of: FaceMetrics) =>
    of.xHeight !== null && of.upem !== null && of.upem > 0 && of.xHeight > 0 ? of.xHeight / of.upem : null;
  const primaryRatio = ratio(primary);
  const fallbackRatio = ratio(fallback);
  if (primaryRatio === null || fallbackRatio === null) return null;
  return Math.round((primaryRatio / fallbackRatio) * 1000) / 10;
}

/** The `size-adjust` this role's Arabic pairing needs, given the metrics of
 * the role's own face. */
export function roleSizeAdjust(role: TypeRole, primary: FaceMetrics): number | null {
  if (role.arabic.family === "") return null;
  return sizeAdjustPercent(primary, role.arabic.metrics);
}

export const trackingCss = (tracking: Tracking): string =>
  tracking.value === 0 ? "0" : `${tracking.value}${tracking.unit}`;

/** `font-feature-settings` text, or "normal" when the role asks for none. */
export function featureSettingsCss(features: Record<string, number>): string {
  const parts = Object.entries(features).map(([tag, value]) => `"${tag}" ${value}`);
  return parts.length ? parts.join(", ") : "normal";
}

/** `font-variation-settings` text, or "normal". */
export function variationSettingsCss(axes: Record<string, number>): string {
  const parts = Object.entries(axes).map(([tag, value]) => `"${tag}" ${value}`);
  return parts.length ? parts.join(", ") : "normal";
}

/** Feature settings as the panel's field takes them: `tnum, zero 1,
 * "ss01" 1`. A part that is not a four-character tag with an optional
 * number is returned as invalid rather than dropped, so the field can say
 * what it did not understand. */
export function parseFeatureSettings(text: string): { features: Record<string, number>; invalid: string[] } {
  const features: Record<string, number> = {};
  const invalid: string[] = [];
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    if (trimmed === "") continue;
    const match = /^["']?([A-Za-z0-9]{4})["']?(?:\s+(\d+))?$/.exec(trimmed);
    if (!match || match[1] === undefined) {
      invalid.push(trimmed);
      continue;
    }
    features[match[1]] = match[2] === undefined ? 1 : Number(match[2]);
  }
  return { features, invalid };
}

/** The text form of feature settings, for the field to start from. */
export const featuresText = (features: Record<string, number>): string =>
  Object.entries(features)
    .map(([tag, value]) => (value === 1 ? tag : `${tag} ${value}`))
    .join(", ");

/** A family name needs quoting in CSS when it has a space in it, the same
 * rule the token build uses. */
export const quoteFamily = (name: string) => (/\s/.test(name) ? `"${name}"` : name);

/** The stack a role renders with: its own family, the Arabic pairing when
 * it has one, then a generic. The pairing family may be an adjusted face,
 * which is why it is passed in rather than read off the role. */
export function familyStack(primary: string, pairing: string | null, generic = "system-ui, sans-serif"): string {
  const parts = [primary, ...(pairing !== null && pairing !== "" ? [pairing] : [])].map(quoteFamily);
  return [...parts, generic].join(", ");
}

/** The CSS custom properties one role contributes. The specimens read these
 * rather than inline styles so that every preview frame can be styled
 * from one place and a frame's own density still decides the working
 * sizes. */
export function roleVariables(role: TypeRole, size: number, stack = familyStack(role.family, null)): Record<string, string> {
  return {
    [`--stoa-type-${role.id}-family`]: stack,
    [`--stoa-type-${role.id}-size`]: `${size}px`,
    [`--stoa-type-${role.id}-weight`]: String(role.weight),
    [`--stoa-type-${role.id}-line-height`]: String(role.lineHeight),
    [`--stoa-type-${role.id}-tracking`]: trackingCss(role.tracking),
    [`--stoa-type-${role.id}-features`]: featureSettingsCss(role.features),
    [`--stoa-type-${role.id}-variations`]: variationSettingsCss(role.axes),
  };
}

export function allRoleVariables(
  roles: Record<RoleId, TypeRole>,
  context: SizeContext,
  stackFor?: (role: TypeRole) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ROLE_IDS) {
    const role = roles[id];
    Object.assign(out, roleVariables(role, roleSize(role, context), stackFor?.(role)));
  }
  return out;
}

/** One role as a DTCG typography token. The token sources on disk do not
 * change in this wave, so this is produced for a snapshot and for the spec
 * generator to come, never written back over packages/tokens.
 *
 * `primary` is the role face's own metrics, which the Arabic pairing's
 * `size-adjust` is computed against; an uninspected face leaves the
 * percentage null rather than 100%, which would be a claim. */
export function roleToken(role: TypeRole, size: number, primary: FaceMetrics = NO_METRICS) {
  const sizeAdjust = roleSizeAdjust(role, primary);
  return {
    $type: "typography",
    $value: {
      fontFamily: role.family,
      fontSize: `${size}px`,
      fontWeight: role.weight,
      lineHeight: role.lineHeight,
      letterSpacing: trackingCss(role.tracking),
    },
    $extensions: {
      "dev.stoa.type": {
        hierarchy: role.hierarchy,
        ...(role.hierarchy === "reading" ? { scaleStep: role.step } : { densityOffset: role.densityOffset }),
        axes: role.axes,
        features: role.features,
        arabic: {
          family: role.arabic.family,
          sizeAdjust: sizeAdjust === null ? null : `${sizeAdjust}%`,
        },
      },
    },
  };
}
