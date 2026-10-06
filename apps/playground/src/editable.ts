// What the control panel offers, derived from the token sources rather
// than listed by hand, so a token added to packages/tokens shows up here.
//
// Fonts and motion are out of scope for this brief, so the panel does not
// offer them; every token is still resolved and previewed.
import { flattenFile, type TokenEntry, type TokenFiles } from "./tokenModel";

export type Control =
  | { kind: "color" }
  | { kind: "length"; min: number; max: number; step: number }
  | { kind: "text" };

export type EditableItem = { entry: TokenEntry; label: string; control: Control };
export type EditableGroup = { id: string; label: string; items: EditableItem[] };
export type EditableTab = { id: string; label: string; groups: EditableGroup[] };

/** A slider for a pixel length, when the range is small enough for one to
 * make sense; otherwise plain text (`radius.full` is 9999px). */
function lengthControl(value: TokenEntry["value"]): Control {
  const px = typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(px) || !/px\s*$/.test(String(value)) || px > 64) return { kind: "text" };
  return { kind: "length", min: 0, max: Math.max(8, Math.ceil(px * 2)), step: 1 };
}

const last = (entry: TokenEntry) => entry.path[entry.path.length - 1] ?? "";

function colorItems(entries: TokenEntry[], label: (entry: TokenEntry) => string): EditableItem[] {
  return entries.map((entry) => ({ entry, label: label(entry), control: { kind: "color" } as Control }));
}

export function editableTabs(files: TokenFiles): EditableTab[] {
  const primitive = flattenFile("primitive", files.primitive);
  const palette = primitive.filter((e) => e.path[0] === "color");
  const shape = primitive.filter((e) => e.path[0] === "space" || e.path[0] === "radius" || e.path[0] === "focus");
  const density = flattenFile("density", files.density);

  const semanticGroup = (id: "semantic.light" | "semantic.dark", label: string): EditableGroup => ({
    id,
    label,
    items: colorItems(flattenFile(id, files[id]), last),
  });

  return [
    {
      id: "colour",
      label: "Colour",
      groups: [
        semanticGroup("semantic.light", "Semantic, light"),
        semanticGroup("semantic.dark", "Semantic, dark"),
        { id: "palette", label: "Palette", items: colorItems(palette, (e) => e.path.slice(1).join(" ")) },
      ],
    },
    {
      id: "density",
      label: "Density",
      groups: ["compact", "regular", "comfortable"].map((mode) => ({
        id: `density.${mode}`,
        label: mode[0]!.toUpperCase() + mode.slice(1),
        items: density
          .filter((e) => e.path[0] === mode)
          .map((entry) => ({ entry, label: last(entry), control: lengthControl(entry.value) })),
      })),
    },
    {
      id: "shape",
      label: "Shape",
      groups: [
        {
          id: "shape.all",
          label: "Space, radius and focus",
          // Lengths with a slider first, then the ones edited as text
          // (radius.full, 9999px), at the end of the list.
          items: shape
            .map((entry) => ({ entry, label: entry.path.join("."), control: lengthControl(entry.value) }))
            .sort((a, b) => Number(a.control.kind === "text") - Number(b.control.kind === "text")),
        },
      ],
    },
  ];
}
