import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heatmap } from "./Heatmap";
import { sampleHeatmap } from "./fixtures";

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
