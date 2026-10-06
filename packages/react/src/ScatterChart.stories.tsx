import type { Meta, StoryObj } from "@storybook/react-vite";
import { Panel } from "./Panel";
import { ScatterChart, type ScatterCategory, type ScatterPoint } from "./ScatterChart";
import { useStoaFormat, type StoaFormat } from "./locale";

const meta: Meta = { title: "Data/ScatterChart" };
export default meta;

/** Deterministic numbers for stories only. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const RATINGS = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B"];

type Words = {
  label: string;
  description: string;
  duration: string;
  rating: string;
  years: (f: StoaFormat, v: number) => string;
  self: string;
  analogue: string;
  compared: string;
  other: string;
  table: string;
  issue: string;
};

const WORDS: Record<"en" | "ar", Words> = {
  en: {
    label: "Peers by rating and duration",
    description:
      "Every issue is a point: Macaulay duration across, the rating down from AAA. This issue is the diamond, its analogues are squares, the issues in the comparison are triangles, and the others are dots.",
    duration: "Duration, years",
    rating: "Rating",
    years: (f, v) => `${f.decimal(v, 2)} years`,
    self: "This issue",
    analogue: "Analogue",
    compared: "In the comparison",
    other: "Other issue",
    table: "Highlighted issues on the map",
    issue: "Issue",
  },
  ar: {
    label: "الإصدارات حسب التصنيف والمدة",
    description:
      "كل إصدار نقطة: مدة ماكولي على المحور الأفقي، والتصنيف من AAA نزولًا. هذا الإصدار هو المعيّن، ونظائره مربعات، والإصدارات في المقارنة مثلثات، والبقية نقاط.",
    duration: "المدة، بالسنوات",
    rating: "التصنيف",
    years: (f, v) => `${f.decimal(v, 2)} سنة`,
    self: "هذا الإصدار",
    analogue: "إصدار مشابه",
    compared: "في المقارنة",
    other: "إصدار آخر",
    table: "الإصدارات المميزة على الخريطة",
    issue: "الإصدار",
  },
};

const useWords = () => {
  const f = useStoaFormat();
  return { f, w: WORDS[f.locale.startsWith("ar") ? "ar" : "en"] };
};

const peerCategories = (w: Words): ScatterCategory[] => [
  { id: "self", name: w.self, shape: "diamond", tone: "accent" },
  { id: "analogue", name: w.analogue, shape: "square", tone: "accent" },
  { id: "compared", name: w.compared, shape: "triangle", tone: "warning" },
  { id: "other", name: w.other, shape: "circle", tone: "neutral", size: "small" },
];

/** A bond market of `count` issues, one of them "this issue", its
 * analogues within a notch and half a year of duration, and two issues in
 * the comparison. */
function peers(f: StoaFormat, w: Words, count = 120): ScatterPoint[] {
  const r = rng(11);
  const self = { id: "RU000A1F3", rating: 10, duration: 3.4 };
  const out: ScatterPoint[] = [];
  const point = (id: string, rating: number, duration: number, category: string) =>
    out.push({ id, x: duration, y: RATINGS[rating]!, category, label: `${id} · ${RATINGS[rating]} · ${w.years(f, duration)}` });
  point(self.id, self.rating, self.duration, "self");
  let analogues = 0;
  for (let i = 0; i < count - 1; i++) {
    // Most issues in the middle of the scale, the better rated ones longer.
    const rating = Math.min(RATINGS.length - 1, Math.floor(((r() + r() + r()) / 3) * RATINGS.length));
    const duration = +(0.3 + r() * (1.5 + (RATINGS.length - rating) * 0.5)).toFixed(2);
    const id = `RU000A${(100 + i).toString(36).toUpperCase()}`;
    const near = Math.abs(rating - self.rating) <= 1 && Math.abs(duration - self.duration) <= 0.5;
    const category = near && analogues < 5 ? (analogues++, "analogue") : i === 7 || i === 31 ? "compared" : "other";
    point(id, rating, duration, category);
  }
  // Analogues by construction, so the story always shows some.
  for (const [n, d] of [[9, 3.1], [11, 3.7], [10, 3.0]] as const) if (analogues++ < 5) point(`RU000A2${n}${analogues}`, n, d, "analogue");
  return out;
}

/** The map of peers in a bond terminal: every issue by duration and
 * rating, this issue, its analogues and the issues in the comparison in
 * their own shapes, drawn above the others. Tab to the chart, then walk
 * the points with the arrow keys; the highlighted points are also a table
 * behind the disclosure. */
export const PeerMap: StoryObj = {
  render: () => {
    const { f, w } = useWords();
    return (
      <Panel title={w.label}>
        <ScatterChart
          label={w.label}
          description={w.description}
          categories={peerCategories(w)}
          points={peers(f, w)}
          xLabel={w.duration}
          yLabel={w.rating}
          yCategories={RATINGS}
          includeZero
          formatX={(x) => w.years(f, x)}
          dataTable="toggle"
          tableCategories={["self", "analogue", "compared"]}
          tableCaption={w.table}
          labelHeader={w.issue}
        />
      </Panel>
    );
  },
};

/** A numeric value axis: yield against duration for three kinds of
 * issuer, each in its own shape and the default tones. */
export const NumericValues: StoryObj = {
  render: () => {
    const f = useStoaFormat();
    const arabic = f.locale.startsWith("ar");
    const r = rng(5);
    const kinds = [
      { id: "ofz", name: arabic ? "سندات حكومية" : "Government", base: 14 },
      { id: "regional", name: arabic ? "سندات إقليمية" : "Regional", base: 15.5 },
      { id: "corporate", name: arabic ? "سندات شركات" : "Corporate", base: 17 },
    ];
    const points: ScatterPoint[] = kinds.flatMap((k) =>
      Array.from({ length: 14 }, (_, i) => {
        const x = +(0.5 + r() * 9).toFixed(2);
        const y = +(k.base + x * 0.12 + (r() - 0.5) * 1.6).toFixed(2);
        return { id: `${k.id}-${i}`, x, y, category: k.id, label: `${k.name}: ${f.decimal(x, 2)}, ${f.decimal(y, 2)}%` };
      }),
    );
    return (
      <ScatterChart
        label={arabic ? "العائد مقابل المدة" : "Yield against duration"}
        categories={kinds.map(({ id, name }) => ({ id, name }))}
        points={points}
        xLabel={arabic ? "المدة، بالسنوات" : "Duration, years"}
        yLabel={arabic ? "العائد، %" : "Yield, %"}
      />
    );
  },
};

/** One highlighted point at the far end of the x axis: on the right left
 * to right, and on the left in a right-to-left locale, where the axis is
 * mirrored and the value axis stands on the right. */
export const XDirection: StoryObj = {
  render: () => {
    const { f, w } = useWords();
    const points: ScatterPoint[] = [
      { id: "far", x: 9.5, y: "BB", category: "self", label: `RU000A1F3 · BB · ${w.years(f, 9.5)}` },
      ...Array.from({ length: 10 }, (_, i) => ({ id: `near-${i}`, x: 0.5 + i * 0.25, y: RATINGS[i]!, category: "other", label: `RU000A0${i} · ${RATINGS[i]}` })),
    ];
    return (
      <ScatterChart
        label={w.label}
        categories={peerCategories(w)}
        points={points}
        xLabel={w.duration}
        yLabel={w.rating}
        yCategories={RATINGS}
        includeZero
      />
    );
  },
};

/** Four hundred points in five categories, every shape in the default
 * order: drawn as one path per category, and walked with the keyboard like
 * a small chart. */
export const ManyPoints: StoryObj = {
  render: () => {
    const f = useStoaFormat();
    const arabic = f.locale.startsWith("ar");
    const r = rng(23);
    const names = arabic ? ["الفئة أ", "الفئة ب", "الفئة ج", "الفئة د", "الفئة هـ"] : ["Group A", "Group B", "Group C", "Group D", "Group E"];
    // The default shapes and tones by position: up and down are kept for
    // values that rise and fall.
    const categories: ScatterCategory[] = names.map((name, i) => ({ id: `g${i}`, name }));
    const points: ScatterPoint[] = Array.from({ length: 400 }, (_, i) => {
      const x = +(r() * 100).toFixed(1);
      const y = +(x * 0.4 + (r() - 0.5) * 40).toFixed(1);
      return { id: `p${i}`, x, y, category: `g${i % 5}`, label: `${names[i % 5]}: ${f.decimal(x, 1)}, ${f.decimal(y, 1)}` };
    });
    return <ScatterChart label={arabic ? "أربعمئة نقطة" : "Four hundred points"} categories={categories} points={points} xLabel="x" yLabel="y" height={320} />;
  },
};

/** Nothing to draw yet: the chart says so, on the canvas and as text, and
 * is not a tab stop. */
export const Empty: StoryObj = {
  render: () => {
    const { w } = useWords();
    return <ScatterChart label={w.label} categories={peerCategories(w)} points={[]} xLabel={w.duration} yLabel={w.rating} yCategories={RATINGS} />;
  },
};
