import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { Button } from "./Controls";
import { Heatmap, type HeatmapHandle } from "./Heatmap";
import { sampleHeatmap } from "./fixtures";
import { useStoaFormat } from "./locale";

const meta: Meta<typeof Heatmap> = {
  title: "Data/Heatmap",
  component: Heatmap,
  args: {
    label: "Displayed liquidity over the last 10 minutes",
    description: "Bids below the midpoint, asks above; darker cells hold more shares.",
    height: 320,
  },
};
export default meta;

export const Liquidity: StoryObj<typeof Heatmap> = { args: { data: sampleHeatmap() } };
export const Sparse: StoryObj<typeof Heatmap> = { args: { data: sampleHeatmap(60, 40, 11) } };

/** Nothing to draw yet: the chart says so, on the canvas and as text. */
export const Empty: StoryObj<typeof Heatmap> = { args: { data: null } };

/** Liquidity only in the newest columns, so the direction of time can be
 * seen: time runs left to right, and right to left in a right-to-left
 * locale, as the TimeSlider that scrubs it does; the newest column is at
 * the inline end. */
export const TimeDirection: StoryObj<typeof Heatmap> = {
  args: {
    data: (() => {
      const columns = 40;
      const rows = 20;
      const cells = new Float32Array(columns * rows);
      for (let c = columns - 6; c < columns; c++) for (let r = 0; r < rows; r++) cells[c * rows + r] = r < rows / 2 ? -500 : 500;
      return { cells, columns, rows, top: 101.0, tick: 0.05 };
    })(),
  },
};

/** Drawn once through the handle, as a paused replay is; the button
 * changes its height. The canvas is refitted to its new box with nothing
 * new to draw, so the cells and price labels are not stretched or
 * squeezed. */
export const HeightChange: StoryObj<typeof Heatmap> = {
  render: (args) => {
    const arabic = useStoaFormat().locale.startsWith("ar");
    const ref = useRef<HeatmapHandle>(null);
    const [tall, setTall] = useState(true);
    useEffect(() => ref.current?.draw(sampleHeatmap()), []);
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-3)" }}>
        <div>
          <Button onPress={() => setTall((t) => !t)}>{tall ? (arabic ? "أقصر" : "Shorter") : arabic ? "أطول" : "Taller"}</Button>
        </div>
        <Heatmap label={args.label} description={args.description} height={tall ? 320 : 200} ref={ref} />
      </div>
    );
  },
};
