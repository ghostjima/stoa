import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { NumberField } from "./Controls";
import { StatusBadge, Tabs, TextField } from "./Form";
import { Panel } from "./Panel";

const meta: Meta = { title: "Controls/Form" };
export default meta;

/** A labelled field with a description. Maths and prices stay left to
 * right inside a right-to-left page (`dir="ltr"` on the input), and take
 * the monospace face with tabular figures (`mono`), as NumberField does. */
export const Fields: StoryObj = {
  render: () => {
    const [limit, setLimit] = useState("222.60");
    const [quantity, setQuantity] = useState(500);
    return (
      <Panel title="Order">
        <div style={{ display: "grid", gap: "var(--stoa-space-3)", maxInlineSize: 320 }}>
          <TextField label="Limit price" value={limit} onChange={setLimit} dir="ltr" mono description="Tick 0.01" />
          <NumberField label="Quantity" value={quantity} onChange={setQuantity} minValue={1} step={100} />
          <NumberField label="Row height in px" unit="px" size="small" value={28} onChange={() => {}} minValue={0} />
        </div>
      </Panel>
    );
  },
};

/** The two faces: a name in the sans face, the default, which joins the
 * letters of an Arabic name; and an amount in the monospace face with
 * tabular figures (`mono`). */
export const TextFieldFaces: StoryObj = {
  render: () => {
    const [issuer, setIssuer] = useState("شركة غازبروم كابيتال");
    const [amount, setAmount] = useState("1,250,000.00");
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-3)", maxInlineSize: 320 }}>
        <TextField label="Issuer" value={issuer} onChange={setIssuer} dir="auto" />
        <TextField label="Amount" value={amount} onChange={setAmount} dir="ltr" mono />
      </div>
    );
  },
};

/** An invalid value: the input is marked invalid and the message under
 * it says what is wrong, read after the description. */
export const TextFieldInvalid: StoryObj = {
  render: () => {
    const [name, setName] = useState("");
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-3)", maxInlineSize: 320 }}>
        <TextField
          label="View name"
          value={name}
          onChange={setName}
          description="Up to 40 letters"
          isInvalid={name.trim() === ""}
          errorMessage="A view needs a name."
        />
      </div>
    );
  },
};

/** A search box (role searchbox). */
export const TextFieldSearch: StoryObj = {
  render: () => {
    const [query, setQuery] = useState("");
    return (
      <div style={{ display: "grid", gap: "var(--stoa-space-3)", maxInlineSize: 320 }}>
        <TextField type="search" label="Find an issue" value={query} onChange={setQuery} placeholder="ISIN or name" />
      </div>
    );
  },
};

/** A typed value is rounded to the step by default, as React Aria does;
 * with `keepTypedValue` it is kept as typed (still within the range),
 * while the arrow keys move by the step. Under the Arabic locale, digits
 * typed on a Latin keyboard layout are written in Arabic-Indic digits. */
export const NumberFieldSteps: StoryObj = {
  render: () => {
    const [rounded, setRounded] = useState(20000);
    const [kept, setKept] = useState(20000);
    return (
      <Panel title="Amounts">
        <div style={{ display: "grid", gap: "var(--stoa-space-3)", maxInlineSize: 320 }}>
          <NumberField label="Rounded to 10,000" value={rounded} onChange={setRounded} minValue={0} maxValue={1000000} step={10000} />
          <NumberField label="Kept as typed" value={kept} onChange={setKept} minValue={0} maxValue={1000000} step={10000} keepTypedValue />
        </div>
      </Panel>
    );
  },
};

/** Every tone carries a symbol and a word, never colour alone. */
export const Badges: StoryObj = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--stoa-space-4)", flexWrap: "wrap" }}>
      <StatusBadge tone="positive">Filled</StatusBadge>
      <StatusBadge tone="negative">Rejected</StatusBadge>
      <StatusBadge tone="warning">Marketable</StatusBadge>
      <StatusBadge tone="neutral">Pending</StatusBadge>
    </div>
  ),
};

/** Arrow keys move between tabs; the panel follows the selection. */
export const TabList: StoryObj = {
  render: () => (
    <Panel title="Trades">
      <Tabs
        label="Trades view"
        items={[
          { id: "tape", label: "Tape", content: <p>The tape: every trade, newest first.</p> },
          { id: "summary", label: "Summary", content: <p>Mid, count and volume.</p> },
          { id: "notes", label: "Notes", content: <p>Nothing noted yet.</p> },
        ]}
      />
    </Panel>
  ),
};
