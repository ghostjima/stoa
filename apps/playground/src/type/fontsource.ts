// Catalogue fonts, through Fontsource's keyless API: `/v1/fonts/{id}` for a
// family's files and licence, `/v1/variable/{id}` for the axes of its
// variable version.
//
// What comes back is a file to load, not a verdict. Fontsource serves web
// subsets, and a subset drops features: `engine.ts` measures whatever
// arrives here, and the inspector says how much of the family it is. The
// licence is recorded per family because a font loaded into this tool can
// end up quoted in a specification.
export const FONTSOURCE_API = "https://api.fontsource.org/v1";

export const metadataUrl = (id: string) => `${FONTSOURCE_API}/fonts/${encodeURIComponent(id)}`;
export const variableUrl = (id: string) => `${FONTSOURCE_API}/variable/${encodeURIComponent(id)}`;

export type FontsourceFile = {
  url: string;
  weight: number;
  style: string;
  subset: string;
  format: "woff2" | "woff" | "ttf";
};

export type FontsourceAxis = { tag: string; min: number; max: number; default: number };

export type FontsourceFamily = {
  id: string;
  family: string;
  /** The licence Fontsource records for the family, as it states it. */
  licence: string;
  /** Axes of the variable version, empty when the family has none or when
   * the variable endpoint did not answer. */
  axes: FontsourceAxis[];
  files: FontsourceFile[];
};

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json => (typeof value === "object" && value !== null ? (value as Json) : {});
const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

const FORMATS: FontsourceFile["format"][] = ["woff2", "woff", "ttf"];

/** The files a family's metadata lists, flattened out of
 * `variants[weight][style][subset].url[format]`. */
export function parseFiles(metadata: unknown): FontsourceFile[] {
  const files: FontsourceFile[] = [];
  const variants = asObject(asObject(metadata).variants);
  for (const [weightKey, byStyle] of Object.entries(variants)) {
    const weight = Number(weightKey);
    if (!Number.isFinite(weight)) continue;
    for (const [style, bySubset] of Object.entries(asObject(byStyle))) {
      for (const [subset, entry] of Object.entries(asObject(bySubset))) {
        const urls = asObject(asObject(entry).url);
        for (const format of FORMATS) {
          const url = asString(urls[format]);
          if (url !== "") files.push({ url, weight, style, subset, format });
        }
      }
    }
  }
  return files;
}

/** The axes of the variable version. The endpoint answers 404 for a family
 * that has none, which is not an error here. */
export function parseAxes(variable: unknown): FontsourceAxis[] {
  return Object.entries(asObject(asObject(variable).axes)).map(([tag, value]) => {
    const axis = asObject(value);
    const number = (key: string) => {
      const raw = axis[key];
      const parsed = typeof raw === "number" ? raw : Number(asString(raw, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return { tag, min: number("min"), max: number("max"), default: number("default") };
  });
}

export type Fetcher = (url: string) => Promise<Response>;

/** One family's metadata. A missing variable version leaves `axes` empty;
 * a missing family is an error, because the id was typed by hand. */
export async function loadFontsourceFamily(id: string, fetcher: Fetcher = fetch): Promise<FontsourceFamily> {
  const response = await fetcher(metadataUrl(id));
  if (!response.ok) {
    throw new Error(`Fontsource does not know the id ${id} (${response.status} from ${metadataUrl(id)})`);
  }
  const metadata = (await response.json()) as unknown;
  const files = parseFiles(metadata);
  if (files.length === 0) throw new Error(`Fontsource lists no files for ${id}`);

  let axes: FontsourceAxis[] = [];
  // The variable endpoint is asked for every family and is allowed to say
  // no: a static family is not a failure to load.
  try {
    const variable = await fetcher(variableUrl(id));
    if (variable.ok) axes = parseAxes((await variable.json()) as unknown);
  } catch {
    axes = [];
  }

  return {
    id,
    family: asString(asObject(metadata).family, id),
    licence: asString(asObject(metadata).license, "not stated by Fontsource"),
    axes,
    files,
  };
}

export type FilePreference = { weight?: number; style?: string; subset?: string };

/** The file to load: the asked-for weight, style and subset when the family
 * has them, and WOFF2 first because the engine decodes it anyway. */
export function pickFile(family: FontsourceFamily, preference: FilePreference = {}): FontsourceFile | null {
  const weight = preference.weight ?? 400;
  const style = preference.style ?? "normal";
  const subset = preference.subset ?? "latin";
  const score = (file: FontsourceFile) =>
    (file.format === "woff2" ? 8 : file.format === "ttf" ? 4 : 2) +
    (file.weight === weight ? 16 : 0) +
    (file.style === style ? 32 : 0) +
    (file.subset === subset ? 64 : 0);
  return family.files.reduce<FontsourceFile | null>(
    (best, file) => (best === null || score(file) > score(best) ? file : best),
    null,
  );
}

/** The file itself. The bytes go to the worker as they arrived, WOFF2 and
 * all. */
export async function fetchFontBytes(url: string, fetcher: Fetcher = fetch): Promise<ArrayBuffer> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return await response.arrayBuffer();
}
