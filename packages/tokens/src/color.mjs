// Colour maths for Stoa's verification rules: sRGB and Oklch parsing,
// WCAG 2 contrast, colour-vision-deficiency simulation and CIEDE2000.
//
// Pure and dependency-free on purpose: the same module runs in Node
// (tests, CI) and in the browser (the playground), so it must not reach
// for `node:` built-ins or a colour library. The numbers it produces are
// cross-checked against culori in scripts/color.test.mjs.
//
// Conventions used throughout:
// - "sRGB" means gamma-encoded sRGB with channels nominally in [0, 1];
//   values outside that range mean the colour is outside the sRGB gamut.
// - "linear" means linear-light sRGB, the same primaries without the
//   transfer function.
// - Alpha compositing happens in gamma-encoded sRGB, which is what
//   browsers do for an sRGB destination (CSS `rgba()`, canvas
//   `globalAlpha`), so a composited measurement matches what is drawn.
// - Every function that measures or simulates a colour clips its inputs
//   channelwise into sRGB first: `contrast`, `deltaE2000Srgb`, `simulateCvd`
//   and `simulateCvdInGammaSpace`. A reported number therefore always
//   describes a colour a display can show, and the clipping happens once, in
//   the same place, whichever rule asks for it.

/** @typedef {{ r: number, g: number, b: number, alpha: number }} Srgb */
/** @typedef {"normal" | "protanopia" | "deuteranopia" | "tritanopia"} CvdModel */

/** The colour-vision models the checks report, normal vision first. */
export const CVD_MODELS = /** @type {CvdModel[]} */ (["normal", "protanopia", "deuteranopia", "tritanopia"]);

// Machado, Oliveira and Fernandes 2009, "A Physiologically-based Model
// for Simulation of Color Vision Deficiency", IEEE TVCG 15(6). Severity
// 1.0 rows of the published tables, row-major. The paper defines the
// matrices on linear RGB, so `simulateCvd` clips into sRGB and linearises
// first; culori 4.0.2 applies the same numbers to gamma-encoded sRGB, which
// is why this module does not use it. scripts/color.test.mjs reads culori's
// own copy of these rows back and checks them against these constants.
//
// Exported so the playground's colour-vision preview (an SVG `feColorMatrix`
// filter, which operates in linear light by default) draws from the same
// numbers `simulateCvd` measures with, rather than a second transcription.
export const MACHADO_SEVERITY_1 = {
  protanopia: [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281, 0.099216,
    -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968,
    0.280085, 0.672501, 0.047413,
    -0.011820, 0.042940, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779,
    -0.078411, 0.930809, 0.147602,
    0.004733, 0.691367, 0.303900,
  ],
};

/** sRGB transfer function, linear light to gamma-encoded. */
export function encodeSrgb(c) {
  const sign = c < 0 ? -1 : 1;
  const a = Math.abs(c);
  return sign * (a <= 0.0031308 ? 12.92 * a : 1.055 * Math.pow(a, 1 / 2.4) - 0.055);
}

/** sRGB transfer function, gamma-encoded to linear light. */
export function decodeSrgb(c) {
  const sign = c < 0 ? -1 : 1;
  const a = Math.abs(c);
  return sign * (a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4));
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Clip a colour into the sRGB gamut, channel by channel. Browsers map an
 * out-of-gamut Oklch colour by reducing chroma (CSS Color 4) rather than
 * clipping, so for such a colour this is an approximation of what is
 * drawn; `outOfGamut` says which colours that applies to. */
export function clipToGamut(c) {
  return { r: clamp01(c.r), g: clamp01(c.g), b: clamp01(c.b), alpha: clamp01(c.alpha) };
}

/** True when a channel falls outside the sRGB gamut by more than float noise. */
export function outOfGamut(c) {
  return [c.r, c.g, c.b].some((x) => x < -1e-6 || x > 1 + 1e-6);
}

/** Composite `fg` over an opaque `bg` in gamma-encoded sRGB. */
export function compositeOver(fg, bg) {
  const a = fg.alpha;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    alpha: 1,
  };
}

/** WCAG 2 relative luminance of a gamma-encoded sRGB colour, using the
 * coefficients WCAG 2.2 specifies. Alpha is ignored: composite first. */
export function relativeLuminance(c) {
  const [r, g, b] = [c.r, c.g, c.b].map(decodeSrgb);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio of `fg` against an opaque `bg`. A translucent
 * `fg` is composited over `bg` first; both colours are clipped into sRGB,
 * so the ratio describes a colour a display can actually show. */
export function contrast(fg, bg) {
  const back = clipToGamut(bg);
  const front = clipToGamut(fg).alpha < 1 ? compositeOver(clipToGamut(fg), back) : clipToGamut(fg);
  const a = relativeLuminance(front);
  const b = relativeLuminance(back);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Simulate dichromatic vision with the Machado 2009 matrices at severity
 * 1.0, applied in linear light as the paper defines them, then clipped
 * back into the sRGB gamut. The input is clipped into sRGB first, the same
 * way `contrast` and `deltaE2000Srgb` do it, so every measurement in this
 * module starts from a colour a display can show. `normal` returns the
 * clipped colour. */
export function simulateCvd(c, model) {
  const input = clipToGamut(c);
  if (model === "normal") return input;
  const m = MACHADO_SEVERITY_1[model];
  if (!m) throw new Error(`unknown colour-vision model: ${model}`);
  const [r, g, b] = [input.r, input.g, input.b].map(decodeSrgb);
  const lin = [
    m[0] * r + m[1] * g + m[2] * b,
    m[3] * r + m[4] * g + m[5] * b,
    m[6] * r + m[7] * g + m[8] * b,
  ].map(clamp01);
  return { r: encodeSrgb(lin[0]), g: encodeSrgb(lin[1]), b: encodeSrgb(lin[2]), alpha: input.alpha };
}

/** The same matrix applied to the gamma-encoded channels, as culori 4.0.2
 * does. The input is clipped into sRGB first, as in `simulateCvd`, so the
 * two differ only in the space the matrix is applied in. Exported only so a
 * test can show that difference. */
export function simulateCvdInGammaSpace(c, model) {
  const input = clipToGamut(c);
  if (model === "normal") return input;
  const m = MACHADO_SEVERITY_1[model];
  if (!m) throw new Error(`unknown colour-vision model: ${model}`);
  const { r, g, b } = input;
  return {
    r: clamp01(m[0] * r + m[1] * g + m[2] * b),
    g: clamp01(m[3] * r + m[4] * g + m[5] * b),
    b: clamp01(m[6] * r + m[7] * g + m[8] * b),
    alpha: input.alpha,
  };
}

// Linear sRGB to CIE XYZ with the D65 white point, and the matching
// white, both as CSS Color 4 gives them.
const XYZ_FROM_LINEAR = [
  0.41239079926595934, 0.357584339383878, 0.1804807884018343,
  0.21263900587151027, 0.715168678767756, 0.07219231536073371,
  0.01933081871559182, 0.11919477979462598, 0.9505321522496607,
];
const D65 = [0.9504559270516716, 1, 1.0890577507598784];

/** CIELAB coordinates with the D65 white point. CIEDE2000 is defined on
 * CIELAB without fixing an illuminant; D65 is the one sRGB is defined
 * against, so every reported dE2000 here is a D65 number. */
export function labD65(c) {
  const [r, g, b] = [c.r, c.g, c.b].map(decodeSrgb);
  const m = XYZ_FROM_LINEAR;
  const xyz = [
    m[0] * r + m[1] * g + m[2] * b,
    m[3] * r + m[4] * g + m[5] * b,
    m[6] * r + m[7] * g + m[8] * b,
  ];
  const e = 216 / 24389;
  const k = 24389 / 27;
  const [fx, fy, fz] = xyz.map((v, i) => {
    const t = v / D65[i];
    return t > e ? Math.cbrt(t) : (k * t + 16) / 116;
  });
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => {
  const d = (r * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};

/** CIEDE2000 colour difference between two CIELAB colours, with the
 * parametric weights kL = kC = kH = 1 (CIE 142-2001). */
export function deltaE2000(lab1, lab2) {
  const { l: L1, a: a1, b: b1 } = lab1;
  const { l: L2, a: a2, b: b2 } = lab2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const cBar = (C1 + C2) / 2;
  const pow7 = (x) => x ** 7;
  const G = 0.5 * (1 - Math.sqrt(pow7(cBar) / (pow7(cBar) + pow7(25))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = a1p === 0 && b1 === 0 ? 0 : deg(Math.atan2(b1, a1p));
  const h2p = a2p === 0 && b2 === 0 ? 0 : deg(Math.atan2(b2, a2p));

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const chromaZero = C1p * C2p === 0;
  let dhp = 0;
  if (!chromaZero) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const LBarp = (L1 + L2) / 2;
  const CBarp = (C1p + C2p) / 2;
  let hBarp;
  if (chromaZero) hBarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hBarp = (h1p + h2p) / 2;
  else hBarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(rad(hBarp - 30)) +
    0.24 * Math.cos(rad(2 * hBarp)) +
    0.32 * Math.cos(rad(3 * hBarp + 6)) -
    0.2 * Math.cos(rad(4 * hBarp - 63));
  const dTheta = 30 * Math.exp(-(((hBarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(pow7(CBarp) / (pow7(CBarp) + pow7(25)));
  const Sl = 1 + (0.015 * (LBarp - 50) ** 2) / Math.sqrt(20 + (LBarp - 50) ** 2);
  const Sc = 1 + 0.045 * CBarp;
  const Sh = 1 + 0.015 * CBarp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  const l = dLp / Sl;
  const c = dCp / Sc;
  const h = dHp / Sh;
  return Math.sqrt(l * l + c * c + h * h + Rt * c * h);
}

/** CIEDE2000 between two sRGB colours, clipped into gamut first. */
export function deltaE2000Srgb(c1, c2) {
  return deltaE2000(labD65(clipToGamut(c1)), labD65(clipToGamut(c2)));
}

// Oklab to linear sRGB, Ottosson's matrices as CSS Color 4 lists them.
const LMS_FROM_OKLAB = [
  1, 0.3963377773761749, 0.2158037573099136,
  1, -0.1055613458156586, -0.0638541728258133,
  1, -0.0894841775298119, -1.2914855480194092,
];
const LINEAR_FROM_LMS = [
  4.076741661347994, -3.307711590408193, 0.230969928729428,
  -1.2684380040921763, 2.6097574006633715, -0.3413193963102197,
  -0.004196086541837188, -0.7034186144594493, 1.7076147009309444,
];

function oklchToSrgb(L, C, H, alpha) {
  const a = C * Math.cos(rad(H));
  const b = C * Math.sin(rad(H));
  const m = LMS_FROM_OKLAB;
  const lms = [
    (m[0] * L + m[1] * a + m[2] * b) ** 3,
    (m[3] * L + m[4] * a + m[5] * b) ** 3,
    (m[6] * L + m[7] * a + m[8] * b) ** 3,
  ];
  const n = LINEAR_FROM_LMS;
  const lin = [
    n[0] * lms[0] + n[1] * lms[1] + n[2] * lms[2],
    n[3] * lms[0] + n[4] * lms[1] + n[5] * lms[2],
    n[6] * lms[0] + n[7] * lms[1] + n[8] * lms[2],
  ];
  return { r: encodeSrgb(lin[0]), g: encodeSrgb(lin[1]), b: encodeSrgb(lin[2]), alpha };
}

// A number, or a percentage of `full`. `none` is CSS Color 4's missing
// component, which behaves as zero in these conversions.
function component(text, full) {
  const t = text.trim();
  if (t === "none") return 0;
  if (t.endsWith("%")) return (Number.parseFloat(t) / 100) * full;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
}

function alphaComponent(text) {
  if (text === undefined) return 1;
  const a = component(text, 1);
  return Number.isFinite(a) ? clamp01(a) : NaN;
}

/** Parse a CSS colour to gamma-encoded sRGB, without clipping it into the
 * gamut. Understands the notations Stoa's tokens use, `oklch()`, plus hex
 * and `rgb()` so a value typed in the playground also resolves. Returns
 * null for anything else, so a caller can report an unresolved token
 * instead of measuring a guess. */
export function parseColor(value) {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();

  const hex = text.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const d = hex[1];
    const parts =
      d.length === 3 || d.length === 4
        ? [...d].map((ch) => Number.parseInt(ch + ch, 16))
        : d.length === 6 || d.length === 8
          ? [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).map((p) => Number.parseInt(p, 16))
          : null;
    if (!parts) return null;
    const [r, g, b, a] = parts;
    return { r: r / 255, g: g / 255, b: b / 255, alpha: a === undefined ? 1 : a / 255 };
  }

  const fn = text.match(/^(oklch|rgba?)\(([^)]*)\)$/);
  if (!fn) return null;
  const [main, alphaText] = fn[2].split("/");
  const args = main.trim().split(/[\s,]+/).filter(Boolean);
  const alpha = alphaComponent(alphaText ?? (args.length === 4 ? args[3] : undefined));
  if (!Number.isFinite(alpha)) return null;

  if (fn[1] === "oklch") {
    if (args.length < 3) return null;
    const L = component(args[0], 1);
    const C = component(args[1], 0.4);
    const H = component(args[2], 1);
    if (![L, C, H].every(Number.isFinite)) return null;
    return oklchToSrgb(L, C, H, alpha);
  }

  if (args.length < 3) return null;
  const [r, g, b] = args.slice(0, 3).map((a) => component(a, 255) / 255);
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b, alpha };
}
