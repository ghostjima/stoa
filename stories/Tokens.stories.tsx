import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { parse, wcagContrast } from "culori";

const meta: Meta = { title: "Foundations/Colour", parameters: { layout: "padded" } };
export default meta;

const roles: [string, string, number][] = [
  ["text", "surface", 7],
  ["text-muted", "surface", 4.5],
  ["accent", "surface", 4.5],
  ["bid", "surface", 4.5],
  ["ask", "surface", 4.5],
  ["up", "surface", 4.5],
  ["down", "surface", 4.5],
  ["focus", "surface", 3],
];

/** Semantic colours of the current theme with their WCAG contrast,
 * measured on the resolved values in the browser. */
export const SemanticColours: StoryObj = {
  render: (_args, ctx) => {
    const [rows, setRows] = useState<{ role: string; value: string; ratio: number; min: number }[]>([]);
    useEffect(() => {
      const s = getComputedStyle(document.documentElement);
      const v = (n: string) => s.getPropertyValue(`--stoa-color-${n}`).trim();
      setRows(roles.map(([role, bg, min]) => ({ role, value: v(role), ratio: wcagContrast(parse(v(role))!, parse(v(bg))!), min })));
    }, [ctx.globals.theme]);
    return (
      // A data table may scroll sideways on a narrow screen (WCAG 1.4.10).
      <div style={{ overflowX: "auto" }}>
      <table className="stoa-table">
        <caption className="stoa-visually-hidden">Semantic colours and contrast on the surface</caption>
        <thead>
          <tr><th scope="col">Role</th><th scope="col">Sample</th><th scope="col">Value</th><th scope="col" className="stoa-num">Contrast</th><th scope="col" className="stoa-num">Needed</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.role}>
              <td>{r.role}</td>
              <td>
                {r.min < 4.5 ? (
                  // A non-text colour (3:1, WCAG 1.4.11) is shown as the mark it
                  // draws, not as text it is never used for.
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      inlineSize: "2.5em",
                      blockSize: "1.25em",
                      border: `var(--stoa-focus-width) solid var(--stoa-color-${r.role})`,
                      borderRadius: "var(--stoa-radius-sm)",
                    }}
                  />
                ) : (
                  <span style={{ color: `var(--stoa-color-${r.role})`, fontWeight: 600 }}>Aa 222.64</span>
                )}
              </td>
              <td><code>{r.value}</code></td>
              <td className="stoa-num">{r.ratio.toFixed(2)}:1</td>
              <td className="stoa-num">{r.min}:1 {r.ratio >= r.min ? "pass" : "FAIL"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    );
  },
};

/** Logical properties only: switch Direction to rtl in the toolbar and the
 * layout mirrors without a single override. */
export const RightToLeft: StoryObj = {
  render: () => (
    <div dir="rtl" lang="ar" className="stoa-panel" style={{ maxInlineSize: 420 }}>
      <h2 className="stoa-panel__title">سجل الأوامر</h2>
      <p style={{ margin: 0 }}>أفضل سعر شراء 222.60 بكمية 900، أفضل سعر بيع 222.64 بكمية 125.</p>
    </div>
  ),
};
