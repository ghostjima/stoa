// The words of the playground's own chrome, in English and Russian: the
// header, the side panel and its tabs, the frame headers, the type panel
// and the sentences its measurements are reported in. The preview frames
// keep their own words and their own language (screenText.ts,
// screens/words.ts); these are the tool's.
//
// Token names, CSS variables, file names and code identifiers are not
// words and stay as they are in both languages. A function takes what it
// says already formatted, apart from a count, which picks the plural form
// through Intl.PluralRules. chromeText.test.ts holds the two dictionaries
// to the same keys and shapes.
import type { DataState, ScreenId } from "./screens/model";
import type { CheckStatus } from "./browserChecks";
import type { CvdMode } from "./cvdPreview";
import type { DigitSetId, DigitVerdict } from "./type/digits.ts";
import type { RoleId } from "./type/roles.ts";
import type { DensityMode, Theme } from "./tokenModel";

export type ChromeLanguage = "en" | "ru";

/** The chrome's languages, in the order the header's switch shows them. */
export const CHROME_LANGUAGES: ChromeLanguage[] = ["en", "ru"];

/** The React Aria, Stoa and Intl locale of each chrome language. */
export const CHROME_LOCALES: Record<ChromeLanguage, string> = { en: "en-US", ru: "ru-RU" };

/** Where the chrome's language is kept: ?lang= in the URL and this key in
 * localStorage, beside the chrome theme's. */
export const CHROME_LANGUAGE_STORE = { param: "lang", storageKey: "stoa-playground-lang" };

export const isChromeLanguage = (value: string): value is ChromeLanguage => (CHROME_LANGUAGES as string[]).includes(value);

/** The English form of a count: one or other ("1 override", "2 overrides"). */
const enPlural = (count: number, one: string, other: string) => (new Intl.PluralRules("en").select(count) === "one" ? one : other);

/** The Russian form of a count: one, few or many ("1 проверка", "2
 * проверки", "5 проверок"). */
const ruPlural = (count: number, one: string, few: string, many: string) => {
  const form = new Intl.PluralRules("ru").select(count);
  return form === "one" ? one : form === "few" ? few : many;
};

export type ViewId = "light-ltr" | "light-rtl" | "dark-ltr" | "dark-rtl";
export type RuleId = "text-contrast" | "non-text-contrast" | "up-down-distinguishability" | "target-size";
export type RouteId = "plain" | "descriptor" | "element-css";
export type CanvasNote = "no-context" | "no-font";

/** The sentences the type panel reports a font file in. The helpers in
 * src/type/ take them, English by default, so a measurement script writes
 * the same English as the panel. */
export type TypeReportText = {
  digitSets: Record<DigitSetId, string>;
  withTnum: string;
  asShaped: string;
  em: (value: string) => string;
  digitsAbsent: (set: string, asked: string) => string;
  digitsTabular: (set: string, asked: string, units: string, em: string) => string;
  digitsProportional: (set: string, asked: string, distinct: string, min: string, max: string, minEm: string, maxEm: string) => string;
  digitsRunDiffers: (verdict: string, distinct: string, min: string, max: string) => string;
  thisFamily: string;
  featuresUnmeasured: (count: number, family: string) => string;
  featuresFull: (count: number, family: string) => string;
  featuresSubset: (count: number, full: string, family: string) => string;
  licenceFromFontsource: (licence: string) => string;
  licenceOnlyUrl: string;
  licenceNone: string;
  provenanceReading: (base: string, ratio: string, step: string) => string;
  provenanceWorking: (density: string, size: string, offset: string) => string;
  canvasVerdictNoFont: string;
  canvasVerdictIgnored: string;
  canvasVerdictNoDescriptor: string;
  canvasVerdictTabular: string;
  canvasVerdictUneven: string;
};

export type ChromeText = {
  header: {
    title: string;
    subtitle: string;
    themeLabel: string;
    themes: { system: string; light: string; dark: string };
    languageLabel: string;
  };
  session: {
    title: string;
    undo: string;
    redo: string;
    pause: string;
    resume: string;
    streamSpeed: string;
    density: string;
    densityModes: Record<DensityMode, string>;
    screen: string;
    screens: Record<ScreenId, string>;
    state: string;
    states: Record<DataState, string>;
    marketNote: string;
    gridRows: string;
  };
  panels: {
    label: string;
    tokens: string;
    overrides: string;
    overridesTab: (count: number) => string;
    verification: string;
    checksTab: string;
    type: string;
    snapshot: string;
    stats: string;
  };
  snapshot: {
    name: string;
    description: string;
    save: string;
    replace: (name: string) => string;
    saved: (path: string, commit: string) => string;
    savedDirty: (path: string, commit: string) => string;
    restored: (slug: string, count: number) => string;
    saveFailed: (detail: string) => string;
    loadFailed: (slug: string, detail: string) => string;
    load: string;
    none: string;
    loadNote: string;
  };
  stats: {
    label: string;
    stateToEffect: string;
    interval: string;
    tokens: string;
    revision: string;
    ms: (value: string) => string;
  };
  tokens: {
    groupsLabel: string;
    colour: string;
    density: string;
    shape: string;
    semanticLight: string;
    semanticDark: string;
    palette: string;
    densityGroups: Record<DensityMode, string>;
    shapeAll: string;
    inPx: (label: string) => string;
    notAColour: (value: string) => string;
    resolvesTo: (variable: string, value: string) => string;
    overrideDetected: string;
    derived: string;
    override: string;
    reset: string;
    checksReading: (label: string) => string;
    themes: Record<Theme, string>;
  };
  overrides: {
    none: string;
    count: (count: number) => string;
    resetAll: string;
    caption: string;
    token: string;
    derived: string;
    override: string;
    reset: string;
    unknown: string;
  };
  verify: {
    build: string;
    building: string;
    commit: string;
    dirty: string;
    failed: (detail: string) => string;
    buildRow: string;
    testsRow: string;
    passed: string;
    notPassed: string;
    previewRow: string;
    noCss: string;
    agrees: (count: number) => string;
    disagree: (count: number) => string;
    gateRow: string;
    gateBothPass: string;
    gateServerOnly: string;
    gateBothFail: string;
    gateUncovered: string;
    differCaption: string;
    variable: string;
    preview: string;
    built: string;
    testOutput: string;
    buildOutput: string;
    noOutput: string;
    browserChecks: string;
    notTimed: (count: number) => string;
    timed: (count: number, ms: string) => string;
    unavailable: (detail: string) => string;
  };
  checks: {
    statuses: Record<CheckStatus, string>;
    rules: Record<RuleId, string>;
    filterLabel: string;
    all: string;
    newOnly: string;
    noNew: (count: number) => string;
    newCount: (count: number) => string;
    unproducedCaption: string;
    entry: string;
    status: string;
    unproduced: string;
    groupSummary: (rule: string, total: string, flagged: string) => string;
    resultsCaption: (rule: string) => string;
    check: string;
    result: string;
    highlight: string;
    bothThemes: string;
    measure: (theme: string, value: string, unit: string, threshold: string) => string;
  };
  frames: {
    views: Record<ViewId, string>;
    preview: (slot: string) => string;
    frameLabel: (preview: string, view: string) => string;
    viewLabel: (preview: string) => string;
    languageLabel: (preview: string) => string;
    reducedMotion: string;
    cvdLabel: (preview: string) => string;
    cvd: Record<CvdMode, string>;
  };
  type: {
    title: string;
    fonts: string;
    roles: string;
    canvas: string;
    monoLabel: string;
    monoTokens: string;
    monoNumeric: string;
    monoNoteBefore: string;
    monoNoteAfter: string;
    loaded: (family: string) => string;
    shippedUnreadable: (family: string, reason: string) => string;
    sizeAdjustFailed: (percent: string, family: string, reason: string) => string;
    noCatalogueFile: (id: string) => string;
    failed: (detail: string) => string;
    measureFailed: (detail: string) => string;
    specimens: { title: string; role: string; specimen: string; size: string };
    roleNames: Record<RoleId, string>;
    inspector: {
      fontFile: string;
      dropNote: string;
      catalogueId: string;
      catalogueDescription: string;
      loadFromCatalogue: string;
      reading: string;
      unnamedFamily: string;
      shipped: string;
      forget: string;
      family: string;
      file: string;
      decodedTo: (bytes: string, harfbuzz: string) => string;
      readAs: (bytes: string, harfbuzz: string) => string;
      licence: string;
      metrics: string;
      metricsLine: (upem: string, xHeight: string, capHeight: string, ascender: string, descender: string) => string;
      notStated: string;
      axes: string;
      staticFile: string;
      axesCaption: string;
      axis: string;
      name: string;
      range: string;
      default: string;
      rangeValue: (min: string, max: string) => string;
      namedInstances: string;
      features: string;
      featuresCaption: string;
      tag: string;
      table: string;
      nameInFont: string;
      onProbe: string;
      notNamed: string;
      positioning: string;
      nothingOnProbe: string;
      change: (before: string, after: string) => string;
      moreFeatures: (count: number) => string;
      digits: string;
      digitsCaption: string;
      set: string;
      askedFor: string;
      verdict: string;
      advances: string;
      verdicts: Record<DigitVerdict, string>;
      advancesValue: (distinct: string, min: string, max: string) => string;
      notInFile: string;
    };
    scale: {
      ratio: string;
      base: string;
      note: (density: string, size: string) => string;
      hierarchy: { reading: string; working: string };
      sizeFrom: (size: string, provenance: string) => string;
      named: (role: string, field: string) => string;
      family: string;
      step: string;
      offset: string;
      weight: string;
      lineHeight: string;
      tracking: string;
      trackingUnit: string;
      features: string;
      arabicPairing: string;
      stepValue: (step: string) => string;
      trackingDescription: (unit: string) => string;
      featuresNoFont: string;
      featuresInFile: (tags: string) => string;
      notInLoadedFile: (tags: string) => string;
      none: string;
      noPairing: string;
      sizeAdjustUnknown: string;
      sizeAdjustOn: (percent: string, family: string) => string;
      reset: string;
    };
    numerics: {
      measure: string;
      measuring: string;
      note: string;
      notMeasured: string;
      routesCaption: (size: string) => string;
      route: string;
      result: string;
      distinct: string;
      tabular: string;
      notTabular: string;
      routes: Record<RouteId, (subject: string) => string>;
      notes: Record<CanvasNote, string>;
      ladderBefore: string;
      ladderAfter: (count: number) => string;
      reportedBefore: string;
      reportedNothing: string;
      reportedHas: string;
      reportedHasNot: string;
    };
    report: TypeReportText;
  };
};

const en: ChromeText = {
  header: {
    title: "Stoa System",
    subtitle: "Design system for dense financial interfaces",
    themeLabel: "Playground theme",
    themes: { system: "System", light: "Light", dark: "Dark" },
    languageLabel: "Playground language",
  },
  session: {
    title: "Session",
    undo: "Undo",
    redo: "Redo",
    pause: "Pause",
    resume: "Resume",
    streamSpeed: "Stream speed",
    density: "Density",
    densityModes: { compact: "compact", regular: "regular", comfortable: "comfortable" },
    screen: "Screen",
    screens: {
      market: "Market",
      controls: "Controls",
      feedback: "Feedback",
      overlays: "Overlays and lists",
      charts: "Charts and tables",
      grid: "Data grid",
    },
    state: "State",
    states: { live: "Live", loading: "Loading", empty: "Empty", error: "Error" },
    marketNote: "Market follows the stream in every state; State applies to the component screens.",
    gridRows: "Grid rows",
  },
  panels: {
    label: "Playground panels",
    tokens: "Tokens",
    overrides: "Overrides",
    overridesTab: (count) => `Overrides (${count})`,
    verification: "Verification",
    checksTab: "Checks",
    type: "Type",
    snapshot: "Snapshot",
    stats: "Stats",
  },
  snapshot: {
    name: "Snapshot name",
    description:
      "Written to apps/playground/snapshots, with the overrides, what each area panel records and the commit it was based on. Empty: named after the time it was saved.",
    save: "Save snapshot",
    replace: (name) => `Replace ${name}`,
    saved: (path, commit) => `${path} on ${commit}`,
    savedDirty: (path, commit) => `${path} on ${commit} (working tree dirty)`,
    restored: (slug, count) => `${slug}: ${count} ${enPlural(count, "override", "overrides")} restored`,
    saveFailed: (detail) => `Not saved: ${detail}`,
    loadFailed: (slug, detail) => `${slug} not loaded: ${detail}`,
    load: "Load",
    none: "No snapshots on disk yet.",
    loadNote: "Loading a snapshot restores its overrides, as one step back.",
  },
  stats: {
    label: "Playground counters",
    stateToEffect: "state to effect",
    interval: "interval",
    tokens: "tokens",
    revision: "revision",
    ms: (value) => `${value} ms`,
  },
  tokens: {
    groupsLabel: "Token groups",
    colour: "Colour",
    density: "Density",
    shape: "Shape",
    semanticLight: "Semantic, light",
    semanticDark: "Semantic, dark",
    palette: "Palette",
    densityGroups: { compact: "Compact", regular: "Regular", comfortable: "Comfortable" },
    shapeAll: "Space, radius and focus",
    inPx: (label) => `${label} in px`,
    notAColour: (value) => `${value}: not a colour this browser accepts`,
    resolvesTo: (variable, value) => `${variable} resolves to ${value}`,
    overrideDetected: "Override detected",
    derived: "derived",
    override: "override",
    reset: "Reset",
    checksReading: (label) => `Checks reading ${label}`,
    themes: { light: "light", dark: "dark" },
  },
  overrides: {
    none: "No overrides: stoa-default",
    count: (count) => `${count} ${enPlural(count, "override", "overrides")}`,
    resetAll: "Reset all",
    caption: "Overrides over the base tokens",
    token: "Token",
    derived: "Derived",
    override: "Override",
    reset: "Reset",
    unknown: "unknown",
  },
  verify: {
    build: "Build and test",
    building: "Building...",
    commit: "commit",
    dirty: "(working tree dirty)",
    failed: (detail) => `The build did not run: ${detail}`,
    buildRow: "Build",
    testsRow: "Tests",
    passed: "passed",
    notPassed: "failed",
    previewRow: "Preview against built CSS",
    noCss: "no CSS to compare",
    agrees: (count) => `agrees on ${count} ${enPlural(count, "variable", "variables")} per theme`,
    disagree: (count) => `${count} ${enPlural(count, "variable disagrees", "variables disagree")}`,
    gateRow: "Known-violations gate: browser vs server tests",
    gateBothPass: "agree: both pass",
    gateServerOnly: "disagree: server tests passed, the browser checks would fail the gate",
    gateBothFail: "server tests failed, the browser checks would fail the gate too",
    gateUncovered: "server tests failed on something the browser checks do not cover: see the test output",
    differCaption: "Variables where the preview and the built CSS differ",
    variable: "Variable",
    preview: "Preview",
    built: "Built",
    testOutput: "Test output",
    buildOutput: "Build output",
    noOutput: "(no output)",
    browserChecks: "In-browser checks",
    notTimed: (count) => `${count} ${enPlural(count, "check", "checks")}, not yet timed`,
    timed: (count, ms) => `${count} ${enPlural(count, "check", "checks")} in ${ms} ms`,
    unavailable: (detail) => `The checks could not run on these values: ${detail}`,
  },
  checks: {
    statuses: {
      pass: "passed",
      fixed: "fixed, remove from known-violations.json",
      known: "known",
      new: "new failure",
      reported: "reported only",
      "listed-reported": "listed, but reported only: remove from known-violations.json",
    },
    rules: {
      "text-contrast": "Text contrast",
      "non-text-contrast": "Non-text contrast",
      "up-down-distinguishability": "Up/down distinguishability",
      "target-size": "Target size",
    },
    filterLabel: "Show",
    all: "All",
    newOnly: "New only",
    noNew: (count) => `${count} ${enPlural(count, "check", "checks")}, no new failures`,
    newCount: (count) => `${count} new ${enPlural(count, "failure", "failures")}`,
    unproducedCaption: "known-violations.json entries no rule produces",
    entry: "Entry",
    status: "Status",
    unproduced: "not produced by any rule: remove the entry or correct the id",
    groupSummary: (rule, total, flagged) => `${rule} (${total}, ${flagged} flagged)`,
    resultsCaption: (rule) => `${rule} results`,
    check: "Check",
    result: "Result",
    highlight: "Highlight",
    bothThemes: "both themes",
    measure: (theme, value, unit, threshold) => `${theme}: ${value} ${unit}, threshold ${threshold}`,
  },
  frames: {
    views: {
      "light-ltr": "Light, left to right",
      "light-rtl": "Light, right to left",
      "dark-ltr": "Dark, left to right",
      "dark-rtl": "Dark, right to left",
    },
    preview: (slot) => `Preview ${slot}`,
    frameLabel: (preview, view) => `${preview}: ${view}`,
    viewLabel: (preview) => `${preview} view`,
    languageLabel: (preview) => `${preview}: language`,
    reducedMotion: "Reduced motion",
    cvdLabel: (preview) => `${preview}: colour-vision preview`,
    cvd: { none: "None", protanopia: "Protan", deuteranopia: "Deutan", tritanopia: "Tritan", grayscale: "Grey" },
  },
  type: {
    title: "Type",
    fonts: "Fonts",
    roles: "Type roles",
    canvas: "Canvas numerics",
    monoLabel: "Mono variable in the frames",
    monoTokens: "As the tokens say",
    monoNumeric: "The numeric role's face",
    monoNoteBefore: "The canvas views read",
    monoNoteAfter: ". Pointing it at the numeric role's face is what puts that face on Ladder's digits.",
    loaded: (family) => `${family} (loaded)`,
    shippedUnreadable: (family, reason) => `${family} could not be read from the bundle: ${reason}`,
    sizeAdjustFailed: (percent, family, reason) => `size-adjust ${percent}% on ${family} could not be registered: ${reason}`,
    noCatalogueFile: (id) => `Fontsource lists no file for ${id}`,
    failed: (detail) => `The font was not read: ${detail}`,
    measureFailed: (detail) => `The canvas was not measured: ${detail}`,
    specimens: { title: "Type roles at this frame's density and direction", role: "Role", specimen: "Specimen", size: "Size" },
    roleNames: { display: "Display", heading: "Heading", body: "Body", label: "Label", numeric: "Numeric", code: "Code" },
    inspector: {
      fontFile: "Font file",
      dropNote:
        "Drop a TTF, OTF, TTC or WOFF2 here, or choose one. WOFF2 is decoded before anything is measured; WOFF 1.0 is refused rather than mis-measured.",
      catalogueId: "Fontsource id",
      catalogueDescription:
        "For example ibm-plex-sans or noto-sans-arabic. Fetched from api.fontsource.org, with the licence it records.",
      loadFromCatalogue: "Load from Fontsource",
      reading: "reading the file",
      unnamedFamily: "unnamed family",
      shipped: "shipped with Stoa",
      forget: "Forget",
      family: "Family",
      file: "File",
      decodedTo: (bytes, harfbuzz) => `decoded to ${bytes} bytes of sfnt, HarfBuzz ${harfbuzz}`,
      readAs: (bytes, harfbuzz) => `read as ${bytes} bytes of sfnt, HarfBuzz ${harfbuzz}`,
      licence: "Licence",
      metrics: "Metrics",
      metricsLine: (upem, xHeight, capHeight, ascender, descender) =>
        `${upem} units per em, x-height ${xHeight}, cap height ${capHeight}, ascender ${ascender}, descender ${descender}`,
      notStated: "not stated",
      axes: "Axes",
      staticFile: "No variation axes: this is a static file.",
      axesCaption: "Variation axes and their ranges",
      axis: "Axis",
      name: "Name",
      range: "Range",
      default: "Default",
      rangeValue: (min, max) => `${min} to ${max}`,
      namedInstances: "Named instances:",
      features: "Features",
      featuresCaption: "Layout features in this file and what they do to the probe",
      tag: "Tag",
      table: "Table",
      nameInFont: "Name in the font",
      onProbe: "On the probe",
      notNamed: "not named",
      positioning: "positioning, not substitution",
      nothingOnProbe: "nothing on this probe",
      change: (before, after) => `${before} to ${after}`,
      moreFeatures: (count) => `${count} more ${enPlural(count, "feature", "features")} in this file, not listed here.`,
      digits: "Digits",
      digitsCaption: "Digit advances per set, with and without tnum",
      set: "Set",
      askedFor: "Asked for",
      verdict: "Verdict",
      advances: "Advances",
      verdicts: { tabular: "tabular", proportional: "proportional", absent: "absent" },
      advancesValue: (distinct, min, max) => `${distinct} distinct, ${min} to ${max}`,
      notInFile: "not in this file",
    },
    scale: {
      ratio: "Reading scale ratio",
      base: "Reading scale base",
      note: (density, size) =>
        `The reading roles step off this base by this ratio, rounded to whole pixels. The working roles ignore both and follow the ${density} density font size, ${size}px.`,
      hierarchy: { reading: "reading", working: "working" },
      sizeFrom: (size, provenance) => `${size}px from ${provenance}`,
      named: (role, field) => `${role} ${field}`,
      family: "family",
      step: "step on the scale",
      offset: "pixels from the density font size",
      weight: "weight",
      lineHeight: "line height",
      tracking: "tracking",
      trackingUnit: "tracking unit",
      features: "features",
      arabicPairing: "Arabic pairing",
      stepValue: (step) => `step ${step}`,
      trackingDescription: (unit) => `letter-spacing, in ${unit}`,
      featuresNoFont: "Tags and values, for example: tnum, zero. No font loaded for this family, so the tags are not checked.",
      featuresInFile: (tags) => `Tags and values, for example: tnum, zero. This file has ${tags}`,
      notInLoadedFile: (tags) => `${tags} not in the file loaded for this family`,
      none: "none",
      noPairing: "No pairing: a line that mixes scripts falls back to whatever the stack finds.",
      sizeAdjustUnknown: "size-adjust cannot be computed: one of the two faces states no x-height.",
      sizeAdjustOn: (percent, family) => `size-adjust ${percent}% on ${family}, from the two x-heights.`,
      reset: "Reset this role",
    },
    numerics: {
      measure: "Measure the canvas",
      measuring: "Measuring...",
      note:
        "The numeric role's file is registered as a FontFace with these features and the digits are measured on a canvas. The same measurement is taken through the canvas element's own font-feature-settings, which the specification does not promise.",
      notMeasured: "Not measured yet in this browser.",
      routesCaption: (size) => `Digit advances on canvas, per route, at ${size}px`,
      route: "Route",
      result: "Result",
      distinct: "Distinct advances",
      tabular: "tabular",
      notTabular: "not tabular",
      routes: {
        plain: (family) => `${family} as loaded`,
        descriptor: (features) => `FontFace featureSettings: ${features}`,
        "element-css": (features) => `font-feature-settings on the canvas element: ${features}`,
      },
      notes: {
        "no-context": "this browser gave no 2d canvas context, so nothing was measured",
        "no-font": "load a font to compare the routes; the Ladder row is measured either way",
      },
      ladderBefore: "Ladder draws with",
      ladderAfter: (count) => `${count} distinct ${enPlural(count, "advance", "advances")} across the ten digits.`,
      reportedBefore: "The browser reported the descriptor as",
      reportedNothing: "nothing",
      reportedHas: ", and a FontFace object has the property.",
      reportedHasNot: ", and a FontFace object does not have the property.",
    },
    report: {
      digitSets: { latin: "Latin", "arabic-indic": "Arabic-Indic" },
      withTnum: "with tnum",
      asShaped: "as shaped",
      em: (value) => `${value} em`,
      digitsAbsent: (set, asked) =>
        `${set} ${asked}: not in this file (at least one digit shaped to glyph 0), so there is nothing to measure`,
      digitsTabular: (set, asked, units, em) => `${set} ${asked}: tabular, all ten advances ${units} units (${em})`,
      digitsProportional: (set, asked, distinct, min, max, minEm, maxEm) =>
        `${set} ${asked}: proportional, ${distinct} distinct advances from ${min} to ${max} units (${minEm} to ${maxEm})`,
      digitsRunDiffers: (verdict, distinct, min, max) =>
        `${verdict}; shaped as one run the ten advances are different again, ${distinct} distinct from ${min} to ${max} units, so this set kerns or has contextual alternates`,
      thisFamily: "this family",
      featuresUnmeasured: (count, family) =>
        `this file has ${count} GSUB ${enPlural(count, "feature", "features")}; the full release of ${family} has not been measured here, so there is nothing to compare`,
      featuresFull: (count, family) =>
        `this file has ${count} GSUB ${enPlural(count, "feature", "features")}, the full ${family} release as measured here`,
      featuresSubset: (count, full, family) =>
        `this file has ${count} of the ${full} GSUB features of the full ${family} release: a web subset drops the rest`,
      licenceFromFontsource: (licence) => `Fontsource records: ${licence}`,
      licenceOnlyUrl: "the file states no licence text, only a licence URL",
      licenceNone: "the file states no licence",
      provenanceReading: (base, ratio, step) => `${base}px base times ${ratio} to the power ${step}, rounded`,
      provenanceWorking: (density, size, offset) => `${density} density font-size ${size}px ${offset}px`,
      canvasVerdictNoFont: "no font loaded, so the descriptor has not been tried here",
      canvasVerdictIgnored:
        "this browser has the featureSettings descriptor but canvas drew the same advances, so it did not take effect here",
      canvasVerdictNoDescriptor: "this browser has no featureSettings descriptor on FontFace, and canvas drew the same advances",
      canvasVerdictTabular: "the featureSettings descriptor reached canvas: the registered face draws all ten digits at one advance",
      canvasVerdictUneven:
        "the featureSettings descriptor reached canvas: it changed the advances, though they are still not all equal",
    },
  },
};

const ru: ChromeText = {
  header: {
    title: "Stoa Система",
    subtitle: "Дизайн-система для плотных финансовых интерфейсов",
    themeLabel: "Тема песочницы",
    themes: { system: "Системная", light: "Светлая", dark: "Тёмная" },
    languageLabel: "Язык песочницы",
  },
  session: {
    title: "Сеанс",
    undo: "Отменить",
    redo: "Повторить",
    pause: "Пауза",
    resume: "Продолжить",
    streamSpeed: "Скорость потока",
    density: "Плотность",
    densityModes: { compact: "компактная", regular: "обычная", comfortable: "просторная" },
    screen: "Экран",
    screens: {
      market: "Рынок",
      controls: "Элементы управления",
      feedback: "Обратная связь",
      overlays: "Оверлеи и списки",
      charts: "Графики и таблицы",
      grid: "Таблица данных",
    },
    state: "Состояние",
    states: { live: "Данные", loading: "Загрузка", empty: "Пусто", error: "Ошибка" },
    marketNote: "Рынок следует за потоком в любом состоянии; Состояние действует на экраны компонентов.",
    gridRows: "Строк в таблице",
  },
  panels: {
    label: "Панели песочницы",
    tokens: "Токены",
    overrides: "Переопределения",
    overridesTab: (count) => `Переопределения (${count})`,
    verification: "Проверка",
    checksTab: "Проверки",
    type: "Типографика",
    snapshot: "Снимок",
    stats: "Статистика",
  },
  snapshot: {
    name: "Имя снимка",
    description:
      "Записывается в apps/playground/snapshots вместе с переопределениями, состоянием каждой панели и коммитом, на котором он сделан. Пустое имя: снимок называется по времени сохранения.",
    save: "Сохранить снимок",
    replace: (name) => `Заменить ${name}`,
    saved: (path, commit) => `${path} на ${commit}`,
    savedDirty: (path, commit) => `${path} на ${commit} (в рабочем дереве есть изменения)`,
    restored: (slug, count) =>
      `${slug}: ${ruPlural(count, "восстановлено", "восстановлены", "восстановлено")} ${count} ${ruPlural(count, "переопределение", "переопределения", "переопределений")}`,
    saveFailed: (detail) => `Не сохранено: ${detail}`,
    loadFailed: (slug, detail) => `${slug} не загружен: ${detail}`,
    load: "Загрузить",
    none: "На диске пока нет снимков.",
    loadNote: "Загрузка снимка восстанавливает его переопределения одним шагом, который можно отменить.",
  },
  stats: {
    label: "Счётчики песочницы",
    stateToEffect: "от состояния до эффекта",
    interval: "интервал",
    tokens: "токены",
    revision: "ревизия",
    ms: (value) => `${value} мс`,
  },
  tokens: {
    groupsLabel: "Группы токенов",
    colour: "Цвет",
    density: "Плотность",
    shape: "Форма",
    semanticLight: "Семантические, светлая тема",
    semanticDark: "Семантические, тёмная тема",
    palette: "Палитра",
    densityGroups: { compact: "Компактная", regular: "Обычная", comfortable: "Просторная" },
    shapeAll: "Отступы, скругления и фокус",
    inPx: (label) => `${label} в px`,
    notAColour: (value) => `${value}: этот браузер не принимает такой цвет`,
    resolvesTo: (variable, value) => `${variable} даёт ${value}`,
    overrideDetected: "Есть переопределение",
    derived: "исходное",
    override: "переопределение",
    reset: "Сбросить",
    checksReading: (label) => `Проверки, которые читают ${label}`,
    themes: { light: "светлая", dark: "тёмная" },
  },
  overrides: {
    none: "Переопределений нет: stoa-default",
    count: (count) => `${count} ${ruPlural(count, "переопределение", "переопределения", "переопределений")}`,
    resetAll: "Сбросить все",
    caption: "Переопределения поверх базовых токенов",
    token: "Токен",
    derived: "Исходное",
    override: "Переопределение",
    reset: "Сбросить",
    unknown: "неизвестно",
  },
  verify: {
    build: "Собрать и проверить",
    building: "Сборка...",
    commit: "коммит",
    dirty: "(в рабочем дереве есть изменения)",
    failed: (detail) => `Сборка не запущена: ${detail}`,
    buildRow: "Сборка",
    testsRow: "Тесты",
    passed: "пройдено",
    notPassed: "не пройдено",
    previewRow: "Предпросмотр и собранный CSS",
    noCss: "нет CSS для сравнения",
    agrees: (count) =>
      `${ruPlural(count, "совпадает", "совпадают", "совпадают")} ${count} ${ruPlural(count, "переменная", "переменные", "переменных")} в каждой теме`,
    disagree: (count) =>
      `${ruPlural(count, "расходится", "расходятся", "расходятся")} ${count} ${ruPlural(count, "переменная", "переменные", "переменных")}`,
    gateRow: "Порог известных нарушений: браузер и тесты сервера",
    gateBothPass: "согласны: оба проходят",
    gateServerOnly: "расходятся: тесты сервера прошли, а браузерные проверки не прошли бы порог",
    gateBothFail: "тесты сервера не прошли, браузерные проверки тоже не прошли бы порог",
    gateUncovered: "тесты сервера не прошли на том, чего браузерные проверки не покрывают: смотрите вывод тестов",
    differCaption: "Переменные, в которых предпросмотр и собранный CSS расходятся",
    variable: "Переменная",
    preview: "Предпросмотр",
    built: "Сборка",
    testOutput: "Вывод тестов",
    buildOutput: "Вывод сборки",
    noOutput: "(вывода нет)",
    browserChecks: "Проверки в браузере",
    notTimed: (count) => `${count} ${ruPlural(count, "проверка", "проверки", "проверок")}, время ещё не измерено`,
    timed: (count, ms) => `${count} ${ruPlural(count, "проверка", "проверки", "проверок")} за ${ms} мс`,
    unavailable: (detail) => `На этих значениях проверки не запускаются: ${detail}`,
  },
  checks: {
    statuses: {
      pass: "пройдено",
      fixed: "исправлено, уберите из known-violations.json",
      known: "известное",
      new: "новый сбой",
      reported: "только в отчёте",
      "listed-reported": "в списке, но правило только в отчёте: уберите из known-violations.json",
    },
    rules: {
      "text-contrast": "Контраст текста",
      "non-text-contrast": "Контраст нетекстовых элементов",
      "up-down-distinguishability": "Различимость роста и падения",
      "target-size": "Размер цели нажатия",
    },
    filterLabel: "Показать",
    all: "Все",
    newOnly: "Только новые",
    noNew: (count) => `${count} ${ruPlural(count, "проверка", "проверки", "проверок")}, новых сбоев нет`,
    newCount: (count) => `${count} ${ruPlural(count, "новый сбой", "новых сбоя", "новых сбоев")}`,
    unproducedCaption: "Записи known-violations.json, которых не выдаёт ни одно правило",
    entry: "Запись",
    status: "Статус",
    unproduced: "не выдаётся ни одним правилом: удалите запись или исправьте id",
    groupSummary: (rule, total, flagged) => `${rule} (${total}, отмечено: ${flagged})`,
    resultsCaption: (rule) => `Результаты: ${rule}`,
    check: "Проверка",
    result: "Результат",
    highlight: "Подсветить",
    bothThemes: "обе темы",
    measure: (theme, value, unit, threshold) => `${theme}: ${value} ${unit}, порог ${threshold}`,
  },
  frames: {
    views: {
      "light-ltr": "Светлая, слева направо",
      "light-rtl": "Светлая, справа налево",
      "dark-ltr": "Тёмная, слева направо",
      "dark-rtl": "Тёмная, справа налево",
    },
    preview: (slot) => `Предпросмотр ${slot}`,
    frameLabel: (preview, view) => `${preview}: ${view}`,
    viewLabel: (preview) => `${preview}: вид`,
    languageLabel: (preview) => `${preview}: язык`,
    reducedMotion: "Меньше движения",
    cvdLabel: (preview) => `${preview}: имитация цветового зрения`,
    cvd: { none: "Нет", protanopia: "Протан", deuteranopia: "Дейтан", tritanopia: "Тритан", grayscale: "Серый" },
  },
  type: {
    title: "Типографика",
    fonts: "Шрифты",
    roles: "Роли шрифта",
    canvas: "Цифры на canvas",
    monoLabel: "Моноширинная переменная в кадрах",
    monoTokens: "Как в токенах",
    monoNumeric: "Начертание числовой роли",
    monoNoteBefore: "Canvas-компоненты читают",
    monoNoteAfter: ". Если направить её на начертание числовой роли, это начертание получат цифры Ladder.",
    loaded: (family) => `${family} (загружен)`,
    shippedUnreadable: (family, reason) => `${family} не удалось прочитать из сборки: ${reason}`,
    sizeAdjustFailed: (percent, family, reason) => `size-adjust ${percent}% для ${family} не удалось зарегистрировать: ${reason}`,
    noCatalogueFile: (id) => `Fontsource не указывает файла для ${id}`,
    failed: (detail) => `Шрифт не прочитан: ${detail}`,
    measureFailed: (detail) => `Canvas не измерен: ${detail}`,
    specimens: { title: "Роли шрифта при плотности и направлении этого кадра", role: "Роль", specimen: "Образец", size: "Размер" },
    roleNames: { display: "Крупный", heading: "Заголовок", body: "Основной текст", label: "Подпись", numeric: "Числа", code: "Код" },
    inspector: {
      fontFile: "Файл шрифта",
      dropNote:
        "Перетащите сюда TTF, OTF, TTC или WOFF2 или выберите файл. WOFF2 распаковывается до любых измерений; WOFF 1.0 не принимается, чтобы не измерить его неверно.",
      catalogueId: "Идентификатор Fontsource",
      catalogueDescription:
        "Например, ibm-plex-sans или noto-sans-arabic. Загружается с api.fontsource.org вместе с лицензией, которую там указали.",
      loadFromCatalogue: "Загрузить из Fontsource",
      reading: "файл читается",
      unnamedFamily: "семейство без имени",
      shipped: "входит в Stoa",
      forget: "Убрать",
      family: "Семейство",
      file: "Файл",
      decodedTo: (bytes, harfbuzz) => `распакован в ${bytes} байт sfnt, HarfBuzz ${harfbuzz}`,
      readAs: (bytes, harfbuzz) => `прочитан как ${bytes} байт sfnt, HarfBuzz ${harfbuzz}`,
      licence: "Лицензия",
      metrics: "Метрики",
      metricsLine: (upem, xHeight, capHeight, ascender, descender) =>
        `${upem} единиц на em, высота строчных ${xHeight}, высота прописных ${capHeight}, выносной элемент вверх ${ascender}, вниз ${descender}`,
      notStated: "не указана",
      axes: "Оси",
      staticFile: "Осей вариаций нет: это статичный файл.",
      axesCaption: "Оси вариаций и их диапазоны",
      axis: "Ось",
      name: "Имя",
      range: "Диапазон",
      default: "По умолчанию",
      rangeValue: (min, max) => `от ${min} до ${max}`,
      namedInstances: "Именованные начертания:",
      features: "Функции OpenType",
      featuresCaption: "Функции раскладки в этом файле и что они делают с пробой",
      tag: "Тег",
      table: "Таблица",
      nameInFont: "Имя в шрифте",
      onProbe: "На пробе",
      notNamed: "без имени",
      positioning: "позиционирование, а не замена",
      nothingOnProbe: "на этой пробе ничего",
      change: (before, after) => `${before} в ${after}`,
      moreFeatures: (count) =>
        `Ещё ${count} ${ruPlural(count, "функция", "функции", "функций")} в этом файле, здесь не ${ruPlural(count, "показана", "показаны", "показаны")}.`,
      digits: "Цифры",
      digitsCaption: "Ширины цифр по наборам, с tnum и без",
      set: "Набор",
      askedFor: "Запрошено",
      verdict: "Вывод",
      advances: "Ширины",
      verdicts: { tabular: "табличные", proportional: "пропорциональные", absent: "нет в файле" },
      advancesValue: (distinct, min, max) => `разных: ${distinct}, от ${min} до ${max}`,
      notInFile: "нет в этом файле",
    },
    scale: {
      ratio: "Коэффициент шкалы для чтения",
      base: "Основа шкалы для чтения",
      note: (density, size) =>
        `Роли для чтения отсчитываются от этой основы с этим коэффициентом и округляются до целых пикселей. Рабочие роли не зависят ни от того, ни от другого и следуют размеру шрифта плотности «${density}», ${size}px.`,
      hierarchy: { reading: "для чтения", working: "рабочая" },
      sizeFrom: (size, provenance) => `${size}px: ${provenance}`,
      named: (role, field) => `${role}: ${field}`,
      family: "семейство",
      step: "шаг на шкале",
      offset: "пиксели от размера шрифта плотности",
      weight: "насыщенность",
      lineHeight: "высота строки",
      tracking: "трекинг",
      trackingUnit: "единица трекинга",
      features: "функции",
      arabicPairing: "арабская пара",
      stepValue: (step) => `шаг ${step}`,
      trackingDescription: (unit) => `letter-spacing, в ${unit}`,
      featuresNoFont: "Теги и значения, например: tnum, zero. Для этого семейства шрифт не загружен, поэтому теги не проверяются.",
      featuresInFile: (tags) => `Теги и значения, например: tnum, zero. В этом файле есть ${tags}`,
      notInLoadedFile: (tags) => `${tags}: нет в файле, загруженном для этого семейства`,
      none: "нет",
      noPairing: "Пары нет: строка со смешанным письмом берёт то, что найдёт в стеке шрифтов.",
      sizeAdjustUnknown: "size-adjust не вычислить: одно из двух начертаний не указывает высоту строчных.",
      sizeAdjustOn: (percent, family) => `size-adjust ${percent}% для ${family}, по двум высотам строчных.`,
      reset: "Сбросить эту роль",
    },
    numerics: {
      measure: "Измерить на canvas",
      measuring: "Измерение...",
      note:
        "Файл числовой роли регистрируется как FontFace с этими функциями, и цифры измеряются на canvas. То же измерение делается через собственный font-feature-settings элемента canvas, который спецификация не обещает.",
      notMeasured: "В этом браузере ещё не измерялось.",
      routesCaption: (size) => `Ширины цифр на canvas по путям, при ${size}px`,
      route: "Путь",
      result: "Результат",
      distinct: "Разных ширин",
      tabular: "табличные",
      notTabular: "не табличные",
      routes: {
        plain: (family) => `${family} как загружен`,
        descriptor: (features) => `FontFace featureSettings: ${features}`,
        "element-css": (features) => `font-feature-settings на элементе canvas: ${features}`,
      },
      notes: {
        "no-context": "этот браузер не дал 2d-контекст canvas, поэтому ничего не измерено",
        "no-font": "загрузите шрифт, чтобы сравнить пути; строка Ladder измеряется в любом случае",
      },
      ladderBefore: "Ladder рисует шрифтом",
      ladderAfter: (count) => `${count} ${ruPlural(count, "разная ширина", "разные ширины", "разных ширин")} у десяти цифр.`,
      reportedBefore: "Браузер сообщил дескриптор как",
      reportedNothing: "ничего",
      reportedHas: ", и у объекта FontFace это свойство есть.",
      reportedHasNot: ", и у объекта FontFace этого свойства нет.",
    },
    report: {
      digitSets: { latin: "Латинские", "arabic-indic": "Арабско-индийские" },
      withTnum: "с tnum",
      asShaped: "без функций",
      em: (value) => `${value} em`,
      digitsAbsent: (set, asked) =>
        `${set} ${asked}: нет в этом файле (хотя бы одна цифра дала глиф 0), поэтому измерять нечего`,
      digitsTabular: (set, asked, units, em) => `${set} ${asked}: табличные, все десять ширин по ${units} единиц (${em})`,
      digitsProportional: (set, asked, distinct, min, max, minEm, maxEm) =>
        `${set} ${asked}: пропорциональные, разных ширин: ${distinct}, от ${min} до ${max} единиц (от ${minEm} до ${maxEm})`,
      digitsRunDiffers: (verdict, distinct, min, max) =>
        `${verdict}; в одном прогоне десять ширин снова другие, разных: ${distinct}, от ${min} до ${max} единиц, значит, в наборе есть кернинг или контекстные альтернативы`,
      thisFamily: "этого семейства",
      featuresUnmeasured: (count, family) =>
        `в этом файле ${count} ${ruPlural(count, "функция", "функции", "функций")} GSUB; полный выпуск ${family} здесь не измерялся, поэтому сравнивать не с чем`,
      featuresFull: (count, family) =>
        `в этом файле ${count} ${ruPlural(count, "функция", "функции", "функций")} GSUB, как в полном выпуске ${family} по нашим измерениям`,
      featuresSubset: (count, full, family) =>
        `в этом файле ${count} из ${full} функций GSUB полного выпуска ${family}: веб-подмножество отбрасывает остальные`,
      licenceFromFontsource: (licence) => `По данным Fontsource: ${licence}`,
      licenceOnlyUrl: "в файле нет текста лицензии, только её адрес",
      licenceNone: "в файле не указана лицензия",
      provenanceReading: (base, ratio, step) => `основа ${base}px, умноженная на ${ratio} в степени ${step}, с округлением`,
      provenanceWorking: (density, size, offset) => `размер шрифта плотности «${density}» ${size}px ${offset}px`,
      canvasVerdictNoFont: "шрифт не загружен, поэтому дескриптор здесь не пробовали",
      canvasVerdictIgnored: "у этого браузера есть дескриптор featureSettings, но canvas нарисовал те же ширины: здесь он не сработал",
      canvasVerdictNoDescriptor: "у FontFace в этом браузере нет дескриптора featureSettings, и canvas нарисовал те же ширины",
      canvasVerdictTabular: "дескриптор featureSettings дошёл до canvas: зарегистрированное начертание рисует все десять цифр одной ширины",
      canvasVerdictUneven: "дескриптор featureSettings дошёл до canvas: ширины изменились, но всё ещё не все равны",
    },
  },
};

export const CHROME_TEXT: Record<ChromeLanguage, ChromeText> = { en, ru };
