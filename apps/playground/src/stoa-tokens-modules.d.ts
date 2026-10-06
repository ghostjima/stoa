// Ambient types for packages/tokens's pure `.mjs` modules. They carry JSDoc
// types for their own tests but no `.d.ts`, and are reached here through the
// package's subpath exports (`@ghostjima/stoa-tokens/checks` and so on)
// rather than a copy, so the playground runs the same rules CI runs. Kept
// narrow: only the shapes this app actually reads.

declare module "@ghostjima/stoa-tokens/checks" {
  export type CheckResult = {
    id: string;
    rule: string;
    theme: string | null;
    subject: string;
    reason: string;
    value: number;
    unit: "ratio" | "dE2000" | "px";
    threshold: number;
    pass: boolean;
    enforced: boolean;
    model?: string;
  };

  export const RULES: {
    textContrast: string;
    nonTextContrast: string;
    upDown: string;
    targetSize: string;
  };

  export function pairName(pair: { fg: string; bg: string; bgOver?: string }): string;

  export function runAllChecks(resolved: {
    themes: Record<string, Record<string, string>>;
    densities: Record<string, Record<string, string>>;
  }): CheckResult[];

  export function summarize(results: CheckResult[]): {
    checks: number;
    failures: CheckResult[];
    reportedFailures: CheckResult[];
    byRule: Record<string, { checks: number; failures: number; reportedFailures: number }>;
  };
}

declare module "@ghostjima/stoa-tokens/pairs" {
  export type Pair = {
    fg: string;
    bg: string;
    bgOver?: string;
    min: number;
    reason: string;
    enforced?: boolean;
  };
  export const TEXT_AA: number;
  export const TEXT_AAA: number;
  export const NON_TEXT: number;
  export const TARGET_SIZE_PX: number;
  export const UP_DOWN_MIN_DELTA_E: number;
  export const UP_DOWN_MIN_CONTRAST: number;
  export const TEXT_PAIRS: Pair[];
  export const NON_TEXT_PAIRS: Pair[];
  export const UP_DOWN: { a: string; b: string; reason: string; contrastReason: string };
  export const TARGETS: { token: string; min: number; reason: string }[];
}

declare module "@ghostjima/stoa-tokens/color" {
  export type CvdModel = "normal" | "protanopia" | "deuteranopia" | "tritanopia";
  export const CVD_MODELS: CvdModel[];
  /** Row-major 3x3 matrices, one per dichromacy, Machado 2009 severity 1.0. */
  export const MACHADO_SEVERITY_1: Record<Exclude<CvdModel, "normal">, readonly number[]>;
}
