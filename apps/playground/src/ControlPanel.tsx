// The editing side of the playground. Every control is a Stoa component:
// the system's own slider, choice group and text field, so tuning the
// tokens exercises the components the tokens are for.
import { useEffect, useId, useRef, useState } from "react";
import { Button, NumberField, StatusBadge, Tabs, TextField, TimeSlider } from "@ghostjima/stoa-react";
import { rulesForToken } from "./browserChecks";
import { RulesTooltip } from "./RulesTooltip";
import type { EditableItem, EditableTab } from "./editable";
import type { Overrides, ResolvedTokens } from "./tokenModel";

export type ControlPanelProps = {
  tabs: EditableTab[];
  overrides: Overrides;
  values: ResolvedTokens["values"];
  /** One edit to one field. `held` marks an edit inside a gesture that has
   * not ended (a slider drag), so the whole drag is one step back. */
  onEdit: (id: string, value: string, held?: boolean) => void;
  /** The gesture ended: the slider was released. */
  onEditEnd: () => void;
  onReset: (id: string) => void;
  /** Which tab is open. Controlled by the app shell, so selecting a
   * verification failure can switch to the tab that holds its token. */
  selected: string | undefined;
  onSelectTab: (id: string) => void;
  /** Token ids to mark and scroll to: the tokens a selected failure reads. */
  highlighted: string[];
};

/** Whether the browser would accept this text as a colour. Guarded because
 * `CSS.supports` is missing in the unit-test environment. */
function isColor(value: string): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
  return CSS.supports("color", value);
}

const sourceText = (value: string | number | (string | number)[]) =>
  Array.isArray(value) ? value.join(", ") : String(value);

export function ControlPanel({
  tabs,
  overrides,
  values,
  onEdit,
  onEditEnd,
  onReset,
  selected,
  onSelectTab,
  highlighted,
}: ControlPanelProps) {
  return (
    <Tabs
      label="Token groups"
      selected={selected ?? tabs[0]?.id}
      onChange={onSelectTab}
      items={tabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        content: (
          <div className="pg-groups">
            {tab.groups.map((group) => (
              <section key={group.id} className="pg-group" aria-label={group.label}>
                <h3 className="pg-group__title">{group.label}</h3>
                {group.items.map((item) => (
                  <TokenControl
                    key={item.entry.id}
                    item={item}
                    override={overrides[item.entry.id]}
                    resolved={values[item.entry.id]}
                    onEdit={onEdit}
                    onEditEnd={onEditEnd}
                    onReset={onReset}
                    highlighted={highlighted.includes(item.entry.id)}
                  />
                ))}
              </section>
            ))}
          </div>
        ),
      }))}
    />
  );
}

function TokenControl({
  item,
  override,
  resolved,
  onEdit,
  onEditEnd,
  onReset,
  highlighted,
}: {
  item: EditableItem;
  override: string | undefined;
  resolved: { derived: string; effective: string } | undefined;
  onEdit: (id: string, value: string, held?: boolean) => void;
  onEditEnd: () => void;
  onReset: (id: string) => void;
  highlighted: boolean;
}) {
  const id = item.entry.id;
  const derived = resolved?.derived ?? sourceText(item.entry.value);
  const effective = resolved?.effective ?? derived;
  const text = override ?? sourceText(item.entry.value);
  const control = item.control;
  const number = Number.parseFloat(effective);
  const rules = rulesForToken(id);
  // The checks reading this token describe its field, for a screen reader,
  // from a visually hidden list; while the field is being edited the same
  // list is drawn as a tooltip beside the side panel.
  const rulesId = useId();
  const describedBy = rules.length > 0 ? rulesId : undefined;
  const [editing, setEditing] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlighted) container.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlighted]);

  return (
    <div
      ref={container}
      className="pg-token"
      data-token={id}
      data-overridden={override !== undefined ? "true" : undefined}
      data-highlighted={highlighted ? "true" : undefined}
      // Only a field being edited opens the tooltip: a text input or a
      // slider's thumb, not the Reset button beside them.
      onFocus={(event) => setEditing(event.target instanceof HTMLInputElement)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setEditing(false);
      }}
    >
      {rules.length > 0 && (
        <ul id={rulesId} className="stoa-visually-hidden">
          {rules.map((rule, index) => (
            <li key={index}>
              {rule.rule}
              {rule.theme ? ` (${rule.theme})` : ""}: {rule.subject}
            </li>
          ))}
        </ul>
      )}
      {editing && rules.length > 0 && (
        <RulesTooltip anchor={container} title={`Checks reading ${item.label}`} rules={rules} />
      )}
      {control.kind === "length" && Number.isFinite(number) ? (
        <div className="pg-token__slider">
          {/* The value in the heading is a field: typed by hand, or stepped
              with the arrow keys, past the slider's range if need be. */}
          <div className="pg-token__head">
            <span className="pg-token__label">{item.label}</span>
            <NumberField
              label={`${item.label} in px`}
              hideLabel
              size="small"
              unit="px"
              value={number}
              minValue={0}
              step={control.step}
              onChange={(value) => onEdit(id, `${value}px`)}
              aria-describedby={describedBy}
            />
          </div>
          <TimeSlider
            label={`${item.label} (${item.entry.variable})`}
            hideLabel
            min={control.min}
            max={control.max}
            step={control.step}
            value={number}
            // The drag holds one step open; releasing it closes that step.
            onChange={(value) => onEdit(id, `${value}px`, true)}
            onChangeEnd={onEditEnd}
            format={(value) => `${value}px`}
            aria-describedby={describedBy}
            showOutput={false}
          />
        </div>
      ) : (
        <div className={control.kind === "color" ? "pg-token__field pg-token__field--swatch" : "pg-token__field"}>
          {control.kind === "color" && (
            <span
              className="pg-swatch"
              style={{ background: effective }}
              aria-hidden="true"
              data-swatch={id}
            />
          )}
          <TextField
            label={item.label}
            value={text}
            onChange={(value) => onEdit(id, value)}
            dir="ltr"
            mono
            aria-describedby={describedBy}
            description={
              control.kind === "color" && !isColor(effective)
                ? `${effective}: not a colour this browser accepts`
                : effective === text
                  ? item.entry.variable
                  : `${item.entry.variable} resolves to ${effective}`
            }
          />
        </div>
      )}
      {override !== undefined && (
        <div className="pg-token__override">
          <StatusBadge tone="warning">Override detected</StatusBadge>
          <code>{id}</code>
          <span>
            derived <code>{derived}</code>
          </span>
          <span>
            override <code>{override}</code>
          </span>
          <Button onPress={() => onReset(id)}>Reset</Button>
        </div>
      )}
    </div>
  );
}
