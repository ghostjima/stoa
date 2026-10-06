// What a font file contains, as the engine read it. Everything on screen
// here is a measurement of the loaded bytes: no feature list is taken on
// trust, and a digit set the file does not have is said to be missing
// rather than reported as tabular.
import { useState } from "react";
import { Button, StatusBadge, TextField } from "@ghostjima/stoa-react";
import { DIGIT_SETS, digitSummary } from "./digits.ts";
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
function sourceLabel(font: LoadedFont): string {
  const { source } = font;
  if (source.kind === "file") return source.name;
  if (source.kind === "fontsource") return `fontsource:${source.id}`;
  return "shipped with Stoa";
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
          <span>Font file</span>
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
        <p className="pg-note">
          Drop a TTF, OTF, TTC or WOFF2 here, or choose one. WOFF2 is decoded before anything is measured; WOFF 1.0 is
          refused rather than mis-measured.
        </p>
      </div>

      <div className="pg-row">
        <TextField
          label="Fontsource id"
          value={catalogueId}
          onChange={setCatalogueId}
          dir="ltr"
          mono
          description="For example ibm-plex-sans or noto-sans-arabic. Fetched from api.fontsource.org, with the licence it records."
        />
        <Button onPress={() => onFontsourceId(catalogueId.trim())} isDisabled={busy || catalogueId.trim() === ""}>
          Load from Fontsource
        </Button>
      </div>

      {busy && <StatusBadge tone="neutral">reading the file</StatusBadge>}
      {error && (
        <p className="pg-verify__error" role="alert" data-testid="type-error">
          {error}
        </p>
      )}

      {fonts.length > 0 && (
        <ul className="pg-type__loaded" data-testid="type-loaded">
          {fonts.map((font) => (
            <li key={font.id} data-font={font.id} data-selected={font.id === selected?.id ? "true" : undefined}>
              <Button onPress={() => onSelect(font.id)}>{font.report.names.family || "unnamed family"}</Button>
              <code>{font.report.format}</code>
              <span className="pg-note">{sourceLabel(font)}</span>
              <Button onPress={() => onForget(font.id)}>Forget</Button>
            </li>
          ))}
        </ul>
      )}

      {selected && <Report font={selected} />}
    </div>
  );
}

function Report({ font }: { font: LoadedFont }) {
  const { report } = font;
  const gsub = report.features.filter((feature) => feature.table === "GSUB");
  const gpos = report.features.filter((feature) => feature.table === "GPOS");

  return (
    <div className="pg-stack" data-testid="type-report">
      <dl className="pg-verify__results">
        <dt>Family</dt>
        <dd>
          {report.names.family} {report.names.subfamily && <code>{report.names.subfamily}</code>}
        </dd>
        <dt>File</dt>
        <dd>
          <code>{report.format}</code>
          {report.decompressed ? " decoded to " : " read as "}
          {report.sfntBytes.toLocaleString("en-US")} bytes of sfnt, HarfBuzz {report.harfbuzz}
        </dd>
        <dt>Licence</dt>
        <dd data-testid="type-licence">
          {fontLicence(font)}
          {report.names.licenceUrl && (
            <>
              {" "}
              <code>{report.names.licenceUrl}</code>
            </>
          )}
        </dd>
        <dt>Metrics</dt>
        <dd data-testid="type-metrics">
          {report.metrics.upem} units per em, x-height {report.metrics.xHeight ?? "not stated"}, cap height{" "}
          {report.metrics.capHeight ?? "not stated"}, ascender {report.metrics.ascender}, descender{" "}
          {report.metrics.descender}
        </dd>
      </dl>

      <h4 className="pg-type__subtitle">Axes</h4>
      {report.axes.length === 0 ? (
        <p className="pg-note">No variation axes: this is a static file.</p>
      ) : (
        <table className="stoa-table" data-testid="type-axes">
          <caption className="stoa-visually-hidden">Variation axes and their ranges</caption>
          <thead>
            <tr>
              <th scope="col">Axis</th>
              <th scope="col">Name</th>
              <th scope="col" className="stoa-num">
                Range
              </th>
              <th scope="col" className="stoa-num">
                Default
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
                <td className="stoa-num">
                  {axis.min} to {axis.max}
                </td>
                <td className="stoa-num">{axis.default}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {report.instances.length > 0 && (
        <p className="pg-note" data-testid="type-instances">
          Named instances:{" "}
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

      <h4 className="pg-type__subtitle">Features</h4>
      <p className="pg-note" data-testid="type-feature-count">
        {featureCountSentence(report)}
      </p>
      <table className="stoa-table" data-testid="type-features">
        <caption className="stoa-visually-hidden">Layout features in this file and what they do to the probe</caption>
        <thead>
          <tr>
            <th scope="col">Tag</th>
            <th scope="col">Table</th>
            <th scope="col">Name in the font</th>
            <th scope="col">On the probe</th>
          </tr>
        </thead>
        <tbody>
          {[...gsub, ...gpos].slice(0, FEATURES_SHOWN).map((feature) => (
            <tr key={`${feature.table}-${feature.tag}`}>
              <td>
                <code>{feature.tag}</code>
              </td>
              <td>{feature.table}</td>
              <td>{feature.uiName ?? "not named"}</td>
              <td>
                {feature.changes.length === 0
                  ? feature.table === "GPOS"
                    ? "positioning, not substitution"
                    : "nothing on this probe"
                  : feature.changes
                      .slice(0, 4)
                      .map((change) => `${change.before} to ${change.after}`)
                      .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {gsub.length + gpos.length > FEATURES_SHOWN && (
        <p className="pg-note">
          {gsub.length + gpos.length - FEATURES_SHOWN} more feature(s) in this file, not listed here.
        </p>
      )}

      <h4 className="pg-type__subtitle">Digits</h4>
      <table className="stoa-table" data-testid="type-digits">
        <caption className="stoa-visually-hidden">Digit advances per set, with and without tnum</caption>
        <thead>
          <tr>
            <th scope="col">Set</th>
            <th scope="col">Asked for</th>
            <th scope="col">Verdict</th>
            <th scope="col" className="stoa-num">
              Advances
            </th>
          </tr>
        </thead>
        <tbody>
          {report.digits.map((row) => (
            <tr key={`${row.set}-${row.feature}`} data-digits={`${row.set}-${row.feature}`}>
              <td>{DIGIT_SETS.find((set) => set.id === row.set)?.label ?? row.set}</td>
              <td>
                <code>{row.feature === "tnum" ? "tnum 1" : "as shaped"}</code>
              </td>
              <td>
                <StatusBadge
                  tone={row.verdict === "tabular" ? "positive" : row.verdict === "proportional" ? "warning" : "neutral"}
                >
                  {row.verdict}
                </StatusBadge>
              </td>
              <td className="stoa-num">
                {row.present ? `${row.distinct} distinct, ${row.min} to ${row.max}` : "not in this file"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="pg-checks" data-testid="type-digit-summaries">
        {report.digits.map((row) => (
          <li key={`${row.set}-${row.feature}`}>{digitSummary(row, report.metrics.upem)}</li>
        ))}
      </ul>
    </div>
  );
}
