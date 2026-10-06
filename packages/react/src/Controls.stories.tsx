import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, ChoiceGroup, Select, TimeSlider } from "./Controls";
import { Panel, StatBar } from "./Panel";
import { TradeTable } from "./TradeTable";

const meta: Meta = { title: "Controls/Playback" };
export default meta;

const fmt = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return [h, m, sec].map((x) => String(x).padStart(2, "0")).join(":");
};

export const Transport: StoryObj = {
  render: () => {
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(10);
    const [t, setT] = useState(9.5 * 3600);
    return (
      <Panel title="Playback">
        <div style={{ display: "flex", gap: "var(--stoa-space-3)", alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="primary" onPress={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</Button>
          <ChoiceGroup label="Speed" hideLabel value={speed} onChange={setSpeed} choices={[1, 10, 60, 600].map((s) => ({ id: s, label: `${s}x` }))} />
          <TimeSlider label="Time" hideLabel min={4 * 3600} max={20 * 3600} step={1} value={t} onChange={setT} format={fmt} />
        </div>
      </Panel>
    );
  },
};

/** A ChoiceGroup is one segmented control; a Select holds a choice with
 * more options, or less room, than a segmented control can show. Both
 * show their label above them by default. */
export const Choices: StoryObj = {
  render: () => {
    const [density, setDensity] = useState("regular");
    const [view, setView] = useState("light-ltr");
    return (
      <Panel title="Choices">
        <div style={{ display: "flex", gap: "var(--stoa-space-4)", alignItems: "end", flexWrap: "wrap" }}>
          <ChoiceGroup
            label="Density"
            value={density}
            onChange={setDensity}
            choices={["compact", "regular", "comfortable"].map((id) => ({ id, label: id }))}
          />
          <Select
            label="View"
            value={view}
            onChange={setView}
            options={[
              { id: "light-ltr", label: "Light, left to right" },
              { id: "light-rtl", label: "Light, right to left" },
              { id: "dark-ltr", label: "Dark, left to right" },
              { id: "dark-rtl", label: "Dark, right to left" },
            ]}
          />
        </div>
      </Panel>
    );
  },
};

/** Options in both directions: each keeps the order of its own text, in
 * the list and in the button, so "1 day" stays "1 day" in a right-to-left
 * page and "3 أشهر" keeps its number at the right in a left-to-right one.
 * Open the list to see them all. */
export const SelectMixedDirections: StoryObj = {
  render: () => {
    const [range, setRange] = useState("1d");
    return (
      <Select
        label="Range"
        value={range}
        onChange={setRange}
        options={[
          { id: "1d", label: "1 day" },
          { id: "1w", label: "1 week" },
          { id: "3m", label: "3 أشهر" },
        ]}
      />
    );
  },
};

/** A ChoiceGroup with its label above it (the default) and a description
 * under it; and one disabled as a whole, its description saying why. */
export const ChoiceGroupLabelled: StoryObj = {
  render: () => {
    const [basis, setBasis] = useState("act365");
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-4)" }}>
        <ChoiceGroup
          label="Day count"
          description="How accrued interest counts the days."
          value={basis}
          onChange={setBasis}
          choices={[
            { id: "act365", label: "Actual/365" },
            { id: "30360", label: "30/360" },
          ]}
        />
        <ChoiceGroup
          label="Engine"
          description="WebAssembly is not available in this browser."
          isDisabled
          value="js"
          onChange={() => {}}
          choices={[
            { id: "wasm", label: "WebAssembly" },
            { id: "js", label: "JavaScript" },
          ]}
        />
      </div>
    );
  },
};

export const Trades: StoryObj = {
  render: () => (
    <Panel title="Trades">
      <TradeTable
        caption="Recent trades"
        trades={[
          { id: "1", time: "10:03:08.082", side: "sell", price: 222.66, size: 22 },
          { id: "2", time: "10:03:06.582", side: "sell", price: 222.66, size: 100 },
          { id: "3", time: "10:03:04.275", side: "buy", price: 222.64, size: 1200 },
          { id: "4", time: "10:02:59.006", side: "buy", price: 222.61, size: 1 },
        ]}
      />
    </Panel>
  ),
};

/** Before the first trade: one row that says so. */
export const TradesEmpty: StoryObj = {
  render: () => (
    <Panel title="Trades">
      <TradeTable caption="Recent trades" trades={[]} />
    </Panel>
  ),
};

export const Counters: StoryObj = {
  render: () => (
    <StatBar
      label="Performance counters"
      items={[
        { label: "frames/s", value: "60" },
        { label: "frame p95", value: "16.9 ms" },
        { label: "book p95", value: "0.50 ms" },
      ]}
    />
  ),
};
