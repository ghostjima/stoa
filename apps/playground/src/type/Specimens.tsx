// The six roles inside a table, in every preview frame. A specimen on its
// own line tells you very little about a role that will spend its life in a
// dense row, so each one is rendered as a table cell at the frame's own
// density and in the frame's own direction.
import { ROLE_IDS, ROLE_LABELS, type RoleId, type TypeRole } from "./roles.ts";

/** What each role is shown with. Latin text, Latin digits and Arabic-Indic
 * digits in one line, because that is the line the pairing has to hold. */
const SAMPLES: Record<RoleId, string> = {
  display: "Settlement 1,284.50 ١٢٨٤",
  heading: "Open orders 12 ١٢",
  body: "Filled 450 at 222.60, 128,450.75 total ٤٥٠",
  label: "Limit price ٠١٢",
  numeric: "128,450.75 -0.42% ٤٥٦,٧٨٩",
  code: "mid = (bid + ask) / 2",
};

const TITLE = "Type roles at this frame's density and direction";

export type SpecimensProps = {
  roles: Record<RoleId, TypeRole>;
  /** The size each role resolved to, in pixels, for the column that says
   * so. The cells themselves read the CSS variables. */
  sizes: Record<RoleId, number>;
};

export function Specimens({ roles, sizes }: SpecimensProps) {
  return (
    <>
      {/* A divider with the title in it, between the screen and the
          specimens. The table keeps its caption for assistive technology,
          so the divider's text is hidden from it. */}
      <p className="pg-type__specimens-title" aria-hidden="true">
        {TITLE}
      </p>
      <table className="stoa-table pg-type__specimens" data-testid="type-specimens">
        <caption className="stoa-visually-hidden">{TITLE}</caption>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Specimen</th>
            <th scope="col" className="stoa-num">
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {ROLE_IDS.map((id) => (
            <tr key={id} data-role={id}>
              <th scope="row">{ROLE_LABELS[id]}</th>
              <td
                data-specimen={id}
                style={{
                  fontFamily: `var(--stoa-type-${id}-family)`,
                  fontSize: `var(--stoa-type-${id}-size)`,
                  fontWeight: `var(--stoa-type-${id}-weight)`,
                  lineHeight: `var(--stoa-type-${id}-line-height)`,
                  letterSpacing: `var(--stoa-type-${id}-tracking)`,
                  fontFeatureSettings: `var(--stoa-type-${id}-features)`,
                  fontVariationSettings: `var(--stoa-type-${id}-variations)`,
                }}
              >
                {SAMPLES[id]}
              </td>
              <td className="stoa-num">{sizes[id]}px</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
