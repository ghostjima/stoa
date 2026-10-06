// The catalogue loader against a stubbed API. The real endpoints are not
// reachable from the test environment, so what is tested here is the part
// that can be wrong offline: the URLs, the shape the answers are read in,
// and which file gets picked.
import { describe, expect, it } from "vitest";
import {
  loadFontsourceFamily,
  metadataUrl,
  parseAxes,
  parseFiles,
  pickFile,
  variableUrl,
  type Fetcher,
} from "./fontsource.ts";

const METADATA = {
  id: "inter",
  family: "Inter",
  license: "OFL-1.1",
  variable: true,
  variants: {
    400: {
      normal: {
        latin: {
          url: {
            woff2: "https://cdn.example/inter-latin-400-normal.woff2",
            woff: "https://cdn.example/inter-latin-400-normal.woff",
            ttf: "https://cdn.example/inter-latin-400-normal.ttf",
          },
        },
        "latin-ext": { url: { woff2: "https://cdn.example/inter-latin-ext-400-normal.woff2" } },
      },
    },
    600: {
      normal: { latin: { url: { woff2: "https://cdn.example/inter-latin-600-normal.woff2" } } },
    },
  },
};

const VARIABLE = { id: "inter", axes: { wght: { default: "400", min: "100", max: "900", step: "1" } } };

const stub = (routes: Record<string, { status?: number; body?: unknown }>): Fetcher => {
  return (url) => {
    const route = routes[url];
    if (!route) return Promise.reject(new Error(`unexpected request to ${url}`));
    const status = route.status ?? 200;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(route.body),
    } as Response);
  };
};

describe("the API URLs", () => {
  it("are the keyless v1 endpoints", () => {
    expect(metadataUrl("ibm-plex-sans")).toBe("https://api.fontsource.org/v1/fonts/ibm-plex-sans");
    expect(variableUrl("ibm-plex-sans")).toBe("https://api.fontsource.org/v1/variable/ibm-plex-sans");
  });

  it("escapes an id that is not a plain slug", () => {
    expect(metadataUrl("a b/c")).toBe("https://api.fontsource.org/v1/fonts/a%20b%2Fc");
  });
});

describe("parseFiles", () => {
  it("flattens weight, style, subset and format", () => {
    const files = parseFiles(METADATA);
    expect(files).toHaveLength(5);
    expect(files).toContainEqual({
      url: "https://cdn.example/inter-latin-400-normal.woff2",
      weight: 400,
      style: "normal",
      subset: "latin",
      format: "woff2",
    });
    expect(files.filter((file) => file.weight === 600)).toHaveLength(1);
  });

  it("returns nothing for an answer it cannot read", () => {
    expect(parseFiles(null)).toEqual([]);
    expect(parseFiles({ variants: { notaweight: {} } })).toEqual([]);
  });
});

describe("parseAxes", () => {
  it("reads the numbers whether they come as numbers or strings", () => {
    expect(parseAxes(VARIABLE)).toEqual([{ tag: "wght", min: 100, max: 900, default: 400 }]);
    expect(parseAxes({ axes: { opsz: { min: 14, max: 32, default: 14 } } })).toEqual([
      { tag: "opsz", min: 14, max: 32, default: 14 },
    ]);
    expect(parseAxes({})).toEqual([]);
  });
});

describe("loadFontsourceFamily", () => {
  it("records the family, its licence and its axes", async () => {
    const family = await loadFontsourceFamily(
      "inter",
      stub({ [metadataUrl("inter")]: { body: METADATA }, [variableUrl("inter")]: { body: VARIABLE } }),
    );
    expect(family).toMatchObject({ id: "inter", family: "Inter", licence: "OFL-1.1" });
    expect(family.axes).toEqual([{ tag: "wght", min: 100, max: 900, default: 400 }]);
    expect(family.files).toHaveLength(5);
  });

  it("loads a static family even though the variable endpoint says no", async () => {
    const family = await loadFontsourceFamily(
      "inter",
      stub({ [metadataUrl("inter")]: { body: METADATA }, [variableUrl("inter")]: { status: 404 } }),
    );
    expect(family.axes).toEqual([]);
    expect(family.files.length).toBeGreaterThan(0);
  });

  it("says the id is unknown rather than loading nothing", async () => {
    await expect(
      loadFontsourceFamily("nope", stub({ [metadataUrl("nope")]: { status: 404 } })),
    ).rejects.toThrow(/does not know the id nope/);
    await expect(
      loadFontsourceFamily("empty", stub({ [metadataUrl("empty")]: { body: { family: "Empty" } } })),
    ).rejects.toThrow(/lists no files/);
  });

  it("records the licence as unstated rather than inventing one", async () => {
    const family = await loadFontsourceFamily(
      "x",
      stub({ [metadataUrl("x")]: { body: { ...METADATA, license: undefined } }, [variableUrl("x")]: { status: 404 } }),
    );
    expect(family.licence).toBe("not stated by Fontsource");
  });
});

describe("pickFile", () => {
  const family = {
    id: "inter",
    family: "Inter",
    licence: "OFL-1.1",
    axes: [],
    files: parseFiles(METADATA),
  };

  it("prefers the asked-for subset, weight and style, and WOFF2", () => {
    expect(pickFile(family)?.url).toBe("https://cdn.example/inter-latin-400-normal.woff2");
    expect(pickFile(family, { weight: 600 })?.url).toBe("https://cdn.example/inter-latin-600-normal.woff2");
    expect(pickFile(family, { subset: "latin-ext" })?.url).toBe(
      "https://cdn.example/inter-latin-ext-400-normal.woff2",
    );
  });

  it("falls back to something rather than nothing when the preference is absent", () => {
    expect(pickFile(family, { subset: "cyrillic", weight: 900 })).not.toBeNull();
    expect(pickFile({ ...family, files: [] })).toBeNull();
  });
});
