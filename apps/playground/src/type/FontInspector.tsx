// What a font file contains, as the engine read it. Everything on screen
// here is a measurement of the loaded bytes: no feature list is taken on
// trust, and a digit set the file does not have is said to be missing
// rather than reported as tabular.
import { useState } from "react";
import { Button, StatusBadge, TextField, useStoaFormat } from "@ghostjima/stoa-react";
import { useChromeText } from "../chromeLanguage";
import type { ChromeText } from "../chromeText";
import { digitSummary } from "./digits.ts";
import { featureCountSentence } from "./report.ts";
import { fontLicence, type LoadedFont } from "./fonts.ts";

export type FontInspectorProps = {
  fonts: LoadedFont[];
  selected: LoadedFont | null;
  busy: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onFiles: (files: FileList | null) => void;
  onFontsourceId: (id: string) => void;
  onForget: (id: string) => void;
};

/** Features shown in full before the rest are counted. A full Inter has 39
 * and the list would take over the panel. */
const FEATURES_SHOWN = 12;

/** Where a loaded font came from, in one phrase. */
function sourceLabel(font: LoadedFont, words: ChromeText["type"]["inspector"]): string {
  const { source } = font;
  if (source.kind === "file") return source.name;
  if (source.kind === "fontsource") return `fontsource:${source.id}`;
  return words.shipped;
}

export function FontInspector({
  fonts,
  selected,
  busy,
  error,
  onSelect,
  onFiles,
  onFontsourceId,
  onForget,
}: FontInspectorProps) {
  const words = useChromeText().type.inspector;
  const [catalogueId, setCatalogueId] = useState("");
  const [dropping, setDropping] = useState(false);

  return (
    <div className="pg-stack pg-type__inspector">
      <div
        className={dropping ? "pg-type__drop pg-type__drop--over" : "pg-type__drop"}
        onDragOver={(event) => {
          event.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDropping(false);
          onFiles(event.dataTransfer?.files ?? null);
        }}
      >
        <label className="pg-type__file">
          <span>{words.fontFile}</span>
          <input
            type="file"
            accept=".ttf,.otf,.ttc,.woff2,font/ttf,font/otf,font/woff2"
            multiple
            data-testid="type-font-file"
            onChange={(event) => {
              onFiles(event.currentTarget.files);
              // The same file dropped twice should load twice: clearing the
              // input makes the second choice a change event again.
              event.currentTarget.value = "";
            }}
          />
        </label>
        <p className="pg-note">{words.dropNote}</p>
      </div>

      <div className="pg-row">
        <TextField
          label={words.catalogueId}
          value={catalogueId}
          onChange={setCatalogueId}
          dir="ltr"
          mono
          description={words.catalogueDescription}
        />
        <Button onPress={() => onFontsourceId(catalogueId.trim())} isDisabled={busy || catalogueId.trim() === ""}>
          {words.loadFromCatalogue}
        </Button>
      </div>

      {busy && <StatusBadge tone="neutral">{words.reading}</StatusBadge>}
      {error && (
        <p className="pg-verify__error" role="alert" data-testid="type-error">
          {error}
        </p>
      )}

      {fonts.length > 0 && (
        <ul className="pg-type__loaded" data-testid="type-loaded">
          {fonts.map((font) => (
            <li key={font.id} data-font={font.id} data-selected={font.id === selected?.id ? "true" : undefined}>
              <Button onPress={() => onSelect(font.id)}>{font.report.names.family || words.unnamedFamily}</Button>
              <code>{font.report.format}</code>
              <span className="pg-note">{sourceLabel(font, words)}</span>
              <Button onPress={() => onForget(font.id)}>{words.forget}</Button>
            </li>
          ))}
        </ul>
      )}

      {selected && <Report font={selected} />}
    </div>
  );
}

function Report({ font }: { font: LoadedFont }) {
  const t = useChromeText();
  const words = t.type.inspector;
  const format = useStoaFormat();
  const { report } = font;
  const gsub = report.features.filter((feature) => feature.table === "GSUB");
  const gpos = report.features.filter((feature) => feature.table === "GPOS");

  return (
    <div className="pg-stack" data-testid="type-report">
      <dl className="pg-verify__results">
        <dt>{words.family}</dt>
        <dd>
          {report.names.family} {report.names.subfamily && <code>{report.names.subfamily}</code>}
        </dd>
        <dt>{words.file}</dt>
        <dd>
          <code>{report.format}</code>{" "}
          {(report.decompressed ? words.decodedTo : words.readAs)(format.integer(report.sfntBytes), report.harfbuzz)}
        </dd>
        <dt>{words.licence}</dt>
        <dd data-testid="type-licence">
          {fontLicence(font, t.type.report)}
          {report.names.licenceUrl && (
            <>
              {" "}
              <code>{report.names.licenceUrl}</code>
            </>
          )}
        </dd>
        <dt>{words.metrics}</dt>
        <dd data-testid="type-metrics">
          {words.metricsLine(
            String(report.metrics.upem),
            report.metrics.xHeight === null ? words.notStated : String(report.metrics.xHeight),
            report.metrics.capHeight === null ? words.notStated : String(report.metrics.capHeight),
            String(report.metrics.ascender),
            String(report.metrics.descender),
          )}
        </dd>
      </dl>

      <h4 className="pg-type__subtitle">{words.axes}</h4>
      {report.axes.length === 0 ? (
        <p className="pg-note">{words.staticFile}</p>
      ) : (
        <table className="stoa-table" data-testid="type-axes">
          <caption className="stoa-visually-hidden">{words.axesCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{words.axis}</th>
              <th scope="col">{words.name}</th>
              <th scope="col" className="stoa-num">
                {words.range}
              </th>
              <th scope="col" className="stoa-num">
                {words.default}
              </th>
            </tr>
          </thead>
          <tbody>
            {report.axes.map((axis) => (
              <tr key={axis.tag}>
                <td>
                  <code>{axis.tag}</code>
                </td>
                <td>{axis.name}</td>
                <td className="stoa-num">{words.rangeValue(String(axis.min), String(axis.max))}</td>
                <td className="stoa-num">{axis.default}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {report.instances.length > 0 && (
        <p className="pg-note" data-testid="type-instances">
          {words.namedInstances}{" "}
          {report.instances
            .map(
              (instance) =>
                `${instance.name} (${Object.entries(instance.coordinates)
                  .map(([tag, value]) => `${tag} ${value}`)
                  .join(", ")})`,
            )
            .join("; ")}
        </p>
      )}

      <h4 className="pg-type__subtitle">{words.features}</h4>
      <p className="pg-note" data-testid="type-feature-count">
        {featureCountSentence(report, t.type.report)}
      </p>
      <table className="stoa-table" data-testid="type-features">
        <caption className="stoa-visually-hidden">{words.featuresCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{words.tag}</th>
            <th scope="col">{words.table}</th>
            <th scope="col">{words.nameInFont}</th>
            <th scope="col">{words.onProbe}</th>
          </tr>
        </thead>
        <tbody>
          {[...gsub, ...gpos].slice(0, FEATURES_SHOWN).map((feature) => (
            <tr key={`${feature.table}-${feature.tag}`}>
              <td>
                <code>{feature.tag}</code>
              </td>
              <td>{feature.table}</td>
              <td>{feature.uiName ?? words.notNamed}</td>
              <td>
                {feature.changes.length === 0
                  ? feature.table === "GPOS"
                    ? words.positioning
                    : words.nothingOnProbe
                  : feature.changes
                      .slice(0, 4)
                      .map((change) => words.change(change.before, change.after))
                      .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {gsub.length + gpos.length > FEATURES_SHOWN && (
        <p className="pg-note">{words.moreFeatures(gsub.length + gpos.length - FEATURES_SHOWN)}</p>
      )}

      <h4 className="pg-type__subtitle">{words.digits}</h4>
      <table className="stoa-table" data-testid="type-digits">
        <caption className="stoa-visually-hidden">{words.digitsCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{words.set}</th>
            <th scope="col">{words.askedFor}</th>
            <th scope="col">{words.verdict}</th>
            <th scope="col" className="stoa-num">
              {words.advances}
            </th>
          </tr>
        </thead>
        <tbody>
          {report.digits.map((row) => (
            <tr key={`${row.set}-${row.feature}`} data-digits={`${row.set}-${row.feature}`}>
              <td>{t.type.report.digitSets[row.set]}</td>
              <td>{row.feature === "tnum" ? <code>tnum 1</code> : t.type.report.asShaped}</td>
              <td>
                <StatusBadge
                  tone={row.verdict === "tabular" ? "positive" : row.verdict === "proportional" ? "warning" : "neutral"}
                >
                  {words.verdicts[row.verdict]}
                </StatusBadge>
              </td>
              <td className="stoa-num">
                {row.present ? words.advancesValue(String(row.distinct), String(row.min), String(row.max)) : words.notInFile}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="pg-checks" data-testid="type-digit-summaries">
        {report.digits.map((row) => (
          <li key={`${row.set}-${row.feature}`}>{digitSummary(row, report.metrics.upem, t.type.report)}</li>
        ))}
      </ul>
    </div>
  );
}
