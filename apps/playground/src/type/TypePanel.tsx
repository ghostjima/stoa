// Brief 07's panel: fonts, roles, and the canvas numeric check.
//
// It owns the loaded fonts and the six roles, and it hands the rest of the
// app three things through the panel list: the CSS variables the specimens
// are drawn with, the specimen table that goes inside every preview frame,
// and what a snapshot records. Nothing else in the app knows about fonts.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChoiceGroup, useStoaFormat } from "@ghostjima/stoa-react";
import plexMonoUrl from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url";
import plexSansUrl from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url";
import plexSansArabicUrl from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2?url";
import { useChromeText } from "../chromeLanguage";
import type { ChromeText } from "../chromeText";
import { digest, type DensityMode } from "../tokenModel";
import type { PanelProps } from "../panels";
import { CanvasNumerics } from "./CanvasNumerics.tsx";
import { FontInspector } from "./FontInspector.tsx";
import { Specimens } from "./Specimens.tsx";
import { TypeRoles, type FamilyChoice } from "./TypeRoles.tsx";
import { fontEngine } from "./client.ts";
import { probeCanvasNumerics, registerNumericFaces, type CanvasNumericsReport } from "./canvasNumerics.ts";
import { fetchFontBytes, loadFontsourceFamily, pickFile } from "./fontsource.ts";
import {
  fontReference,
  loadedFont,
  registerAdjustedFace,
  registerPreviewFace,
  type FontSource,
  type LoadedFont,
} from "./fonts.ts";
import {
  DEFAULT_ROLES,
  DEFAULT_SCALE,
  NO_METRICS,
  ROLE_IDS,
  allRoleVariables,
  familyStack,
  featureSettingsCss,
  roleSize,
  roleSizeAdjust,
  roleToken,
  type FaceMetrics,
  type RoleId,
  type ScaleSettings,
  type SizeContext,
  type TypeRole,
} from "./roles.ts";
import "./type.css";

/** The families Stoa ships, read out of the bundle on open. Their metrics
 * are what an Arabic pairing is computed against, so they are measured
 * rather than assumed. */
const SHIPPED: { family: string; url: string }[] = [
  { family: "IBM Plex Sans", url: plexSansUrl },
  { family: "IBM Plex Sans Arabic", url: plexSansArabicUrl },
  { family: "IBM Plex Mono", url: plexMonoUrl },
];

const densityFontSizeOf = (variables: Record<string, string>): number => {
  const parsed = Number.parseFloat(variables["--stoa-density-font-size"] ?? "");
  return Number.isFinite(parsed) ? parsed : 13;
};

/** The frame the canvas check reads Ladder's font shorthand from: the
 * first one. Any frame would do; whatever view each shows, they differ by
 * theme and direction, not by type. */
const PROBE_FRAME = "[data-frame]";

/** What went wrong last, kept as data so that it reads in whichever
 * language the chrome is in when it is shown. `detail` is the error's own
 * message, from the engine, the catalogue or the browser. */
type PanelError =
  | { kind: "shipped"; family: string; detail: string }
  | { kind: "size-adjust"; percent: number; family: string; detail: string }
  | { kind: "no-file"; id: string }
  | { kind: "measure"; detail: string }
  | { kind: "failed"; detail: string };

function errorText(error: PanelError, text: ChromeText["type"]): string {
  if (error.kind === "shipped") return text.shippedUnreadable(error.family, error.detail);
  if (error.kind === "size-adjust") return text.sizeAdjustFailed(String(error.percent), error.family, error.detail);
  if (error.kind === "no-file") return text.noCatalogueFile(error.id);
  if (error.kind === "measure") return text.measureFailed(error.detail);
  return text.failed(error.detail);
}

const messageOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

/** Thrown when the catalogue lists a family but no file to fetch for it. */
class NoCatalogueFile extends Error {
  constructor(readonly id: string) {
    super(`Fontsource lists no file for ${id}`);
  }
}

export function TypePanel({ density, tokens, onContribute }: PanelProps) {
  const t = useChromeText();
  const lang = useStoaFormat().locale.split("-")[0] ?? "en";
  const engine = fontEngine();
  const [fonts, setFonts] = useState<LoadedFont[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<RoleId, TypeRole>>(DEFAULT_ROLES);
  const [scale, setScale] = useState<ScaleSettings>(DEFAULT_SCALE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PanelError | null>(null);
  const [canvasReport, setCanvasReport] = useState<CanvasNumericsReport | null>(null);
  const [canvasBusy, setCanvasBusy] = useState(false);
  const [monoFromNumeric, setMonoFromNumeric] = useState(false);
  /** Adjusted pairing faces, by the family name they were registered under. */
  const [adjusted, setAdjusted] = useState<Record<string, string>>({});

  const addFont = useCallback((font: LoadedFont) => {
    // Loading the same file again replaces it rather than listing it twice,
    // which also makes the mount effect safe under StrictMode.
    setFonts((previous) => [...previous.filter((item) => item.id !== font.id), font]);
    return font;
  }, []);

  const read = useCallback(
    async (bytes: ArrayBuffer, source: FontSource) => {
      const report = await engine.inspect(bytes);
      const font = loadedFont(report, bytes, source);
      // A shipped family is already in the document from the stylesheet.
      if (source.kind !== "shipped") await registerPreviewFace(font);
      return addFont(font);
    },
    [addFont, engine],
  );

  // The shipped families, once.
  const loadedShipped = useRef(false);
  useEffect(() => {
    if (loadedShipped.current) return;
    loadedShipped.current = true;
    void (async () => {
      for (const { family, url } of SHIPPED) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${url}: ${response.status}`);
          await read(await response.arrayBuffer(), { kind: "shipped", family, file: url });
        } catch (cause) {
          // A shipped family that cannot be read is worth saying out loud:
          // every pairing computed without it is a pairing without metrics.
          setError({ kind: "shipped", family, detail: messageOf(cause) });
        }
      }
    })();
  }, [read]);

  const fontFor = useCallback(
    (family: string) => fonts.find((font) => font.cssFamily === family) ?? null,
    [fonts],
  );
  const metricsFor = useCallback(
    (family: string): FaceMetrics => {
      const font = fontFor(family);
      return font ? { xHeight: font.report.metrics.xHeight, upem: font.report.metrics.upem } : NO_METRICS;
    },
    [fontFor],
  );
  const axesFor = useCallback((family: string) => fontFor(family)?.report.axes ?? [], [fontFor]);
  const featureTagsFor = useCallback(
    (family: string) =>
      fontFor(family)
        ?.report.features.filter((feature) => feature.table === "GSUB")
        .map((feature) => feature.tag) ?? [],
    [fontFor],
  );

  const families: FamilyChoice[] = fonts.map((font) => ({
    value: font.cssFamily,
    label: font.source.kind === "shipped" ? font.source.family : t.type.loaded(font.report.names.family),
  }));
  /** A pairing is only offered by a font that has the Arabic-Indic digits:
   * a family without them would silently fall through to something else. */
  const arabicFamilies = families.filter((family) => {
    const font = fontFor(family.value);
    return (
      font?.report.digits.some((row) => row.set === "arabic-indic" && row.present) ??
      false
    );
  });

  const densityFontSize = densityFontSizeOf(tokens.light.variables);
  const context: SizeContext = useMemo(() => ({ scale, densityFontSize }), [scale, densityFontSize]);

  /** The pairing faces the current roles need, registered with their
   * `size-adjust`. Registration is a promise, so the stack falls back to the
   * unadjusted family until it resolves. */
  useEffect(() => {
    void (async () => {
      for (const id of ROLE_IDS) {
        const role = roles[id];
        const percent = roleSizeAdjust(role, metricsFor(role.family));
        const pairing = fontFor(role.arabic.family);
        if (percent === null || !pairing) continue;
        const key = `${pairing.cssFamily}@${percent}`;
        if (adjusted[key]) continue;
        try {
          const family = await registerAdjustedFace(pairing, percent);
          setAdjusted((previous) => ({ ...previous, [key]: family }));
        } catch (cause) {
          setError({ kind: "size-adjust", percent, family: pairing.cssFamily, detail: messageOf(cause) });
        }
      }
    })();
  }, [roles, adjusted, fontFor, metricsFor]);

  const stackFor = useCallback(
    (role: TypeRole) => {
      const pairing = fontFor(role.arabic.family);
      if (!pairing) return familyStack(role.family, null);
      const percent = roleSizeAdjust(role, metricsFor(role.family));
      const key = percent === null ? "" : `${pairing.cssFamily}@${percent}`;
      return familyStack(role.family, adjusted[key] ?? pairing.cssFamily);
    },
    [adjusted, fontFor, metricsFor],
  );

  const sizes = useMemo(
    () => Object.fromEntries(ROLE_IDS.map((id) => [id, roleSize(roles[id], context)])) as Record<RoleId, number>,
    [roles, context],
  );

  const numericFeatures = featureSettingsCss(roles.numeric.features);

  const runCanvasCheck = async () => {
    setCanvasBusy(true);
    try {
      const numeric = fontFor(roles.numeric.family);
      let registered: { plain: string; withFeatures: string } | null = null;
      let descriptorPresent = false;
      let reportedFeatureSettings = "";
      if (numeric) {
        // The feature text is part of the family name, so a second run with
        // different features measures a second face rather than the first.
        const suffix = digest(numericFeatures);
        const plain = `${numeric.cssFamily}Probe`;
        const withFeatures = `${numeric.cssFamily}Probe${suffix}`;
        const result = await registerNumericFaces(plain, withFeatures, numeric.bytes, numericFeatures);
        registered = { plain, withFeatures };
        descriptorPresent = result.descriptorPresent;
        reportedFeatureSettings = result.reportedFeatureSettings;
      }
      setCanvasReport(
        probeCanvasNumerics({
          families: registered,
          descriptorPresent,
          reportedFeatureSettings,
          featureSettings: numericFeatures,
          frame: document.querySelector<HTMLElement>(PROBE_FRAME),
        }),
      );
    } catch (cause) {
      setError({ kind: "measure", detail: messageOf(cause) });
    } finally {
      setCanvasBusy(false);
    }
  };

  const loadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        for (const file of Array.from(files)) {
          const font = await read(await file.arrayBuffer(), { kind: "file", name: file.name, bytes: file.size });
          setSelectedId(font.id);
        }
      } catch (cause) {
        setError({ kind: "failed", detail: messageOf(cause) });
      } finally {
        setBusy(false);
      }
    })();
  };

  const loadFromCatalogue = (id: string) => {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const family = await loadFontsourceFamily(id);
        const file = pickFile(family, { weight: 400 });
        if (!file) throw new NoCatalogueFile(id);
        const font = await read(await fetchFontBytes(file.url), {
          kind: "fontsource",
          id,
          url: file.url,
          licence: family.licence,
        });
        setSelectedId(font.id);
      } catch (cause) {
        setError(cause instanceof NoCatalogueFile ? { kind: "no-file", id: cause.id } : { kind: "failed", detail: messageOf(cause) });
      } finally {
        setBusy(false);
      }
    })();
  };

  const forget = (id: string) => {
    setFonts((previous) => previous.filter((font) => font.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  // What the rest of the app gets. The snapshot side records references and
  // role tokens, never font bytes.
  const contribution = useMemo(() => {
    const variables = allRoleVariables(roles, context, stackFor);
    const numeric = fontFor(roles.numeric.family);
    return {
      variables: {
        ...variables,
        ...(monoFromNumeric && numeric ? { "--stoa-font-family-mono": stackFor(roles.numeric) } : {}),
      },
      frameContent: <Specimens text={t.type} lang={lang} roles={roles} sizes={sizes} />,
      snapshot: {
        scale,
        fonts: fonts.map(fontReference),
        roles: Object.fromEntries(
          ROLE_IDS.map((id) => [id, roleToken(roles[id], sizes[id], metricsFor(roles[id].family))]),
        ),
      },
    };
  }, [roles, context, stackFor, monoFromNumeric, fontFor, sizes, scale, fonts, metricsFor, t, lang]);

  useEffect(() => {
    onContribute(contribution);
  }, [onContribute, contribution]);

  const selected = fonts.find((font) => font.id === selectedId) ?? null;

  return (
    <div className="pg-type">
      <h3 className="pg-group__title">{t.type.fonts}</h3>
      <FontInspector
        fonts={fonts}
        selected={selected}
        busy={busy}
        error={error === null ? null : errorText(error, t.type)}
        onSelect={setSelectedId}
        onFiles={loadFiles}
        onFontsourceId={loadFromCatalogue}
        onForget={forget}
      />

      <h3 className="pg-group__title">{t.type.roles}</h3>
      <TypeRoles
        roles={roles}
        scale={scale}
        density={density as DensityMode}
        densityFontSize={densityFontSize}
        families={families}
        arabicFamilies={arabicFamilies}
        metricsFor={metricsFor}
        axesFor={axesFor}
        featureTagsFor={featureTagsFor}
        onScale={setScale}
        onRole={(id, role) => setRoles((previous) => ({ ...previous, [id]: role }))}
      />

      <h3 className="pg-group__title">{t.type.canvas}</h3>
      <div className="pg-stack">
        <ChoiceGroup
          label={t.type.monoLabel}
          hideLabel
          choices={[
            { id: "tokens", label: t.type.monoTokens },
            { id: "numeric", label: t.type.monoNumeric },
          ]}
          value={monoFromNumeric ? "numeric" : "tokens"}
          onChange={(value) => setMonoFromNumeric(value === "numeric")}
        />
        <p className="pg-note">
          {t.type.monoNoteBefore} <code>--stoa-font-family-mono</code>
          {t.type.monoNoteAfter}
        </p>
        <CanvasNumerics
          report={canvasReport}
          busy={canvasBusy}
          featureSettings={numericFeatures}
          onRun={() => void runCanvasCheck()}
        />
      </div>
    </div>
  );
}
