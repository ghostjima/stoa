// A visual approximation of colour-vision deficiency for a preview frame,
// as an SVG `feColorMatrix` filter: default `color-interpolation-filters`
// is `linearRGB`, which is the space the Machado 2009 matrices are defined
// in, so the same numbers `packages/tokens/src/color.mjs` measures with
// draw the filter. This is a preview only; pass or fail always comes from
// the checks, never from what the filter draws.
import type { CSSProperties } from "react";
import { MACHADO_SEVERITY_1 } from "@ghostjima/stoa-tokens/color";

export type CvdMode = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "grayscale";

export const CVD_CHOICES: { id: CvdMode; label: string }[] = [
  { id: "none", label: "None" },
  { id: "protanopia", label: "Protan" },
  { id: "deuteranopia", label: "Deutan" },
  { id: "tritanopia", label: "Tritan" },
  { id: "grayscale", label: "Grey" },
];

const DICHROMACIES = Object.keys(MACHADO_SEVERITY_1) as (keyof typeof MACHADO_SEVERITY_1)[];

// WCAG 2.2's relative-luminance coefficients (packages/tokens/src/color.mjs,
// `relativeLuminance`), applied to every output channel: the filter dims
// each channel to how much it would contribute to WCAG luminance, so a
// grayscale preview lines up with what the contrast rule itself measures.
const LUMINANCE = [0.2126, 0.7152, 0.0722];

/** A 3x3 row-major colour transform as the 4x5 matrix `feColorMatrix`
 * takes: alpha passes through unchanged, and there is no constant term. */
function matrixValues(m: readonly number[]): string {
  const [a, b, c, d, e, f, g, h, i] = m;
  return [a, b, c, 0, 0, d, e, f, 0, 0, g, h, i, 0, 0, 0, 0, 0, 1, 0].join(" ");
}

export const cvdFilterId = (mode: Exclude<CvdMode, "none">): string => `pg-cvd-${mode}`;

/** The `filter` declaration for a frame, or none for `"none"`. */
export function cvdFilterStyle(mode: CvdMode): CSSProperties {
  return mode === "none" ? {} : { filter: `url(#${cvdFilterId(mode)})` };
}

/** The filter definitions every frame's `url(#...)` refers to, rendered
 * once and kept out of layout. */
export function CvdFilterDefs() {
  return (
    <svg aria-hidden="true" focusable="false" className="pg-cvd-defs">
      <defs>
        {DICHROMACIES.map((model) => (
          <filter key={model} id={cvdFilterId(model)} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={matrixValues(MACHADO_SEVERITY_1[model])} />
          </filter>
        ))}
        <filter id={cvdFilterId("grayscale")} colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values={matrixValues([...LUMINANCE, ...LUMINANCE, ...LUMINANCE])} />
        </filter>
      </defs>
    </svg>
  );
}
