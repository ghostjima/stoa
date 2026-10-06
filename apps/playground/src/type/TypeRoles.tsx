// The six roles. The two hierarchies are edited differently on purpose: a
// reading role has a step on the scale, a working role has an offset from
// the density mode's font size, and each row says which rule produced the
// size on screen.
import { Button, ChoiceGroup, Disclosure, StatusBadge, TextField, TimeSlider } from "@ghostjima/stoa-react";
import { useChromeText } from "../chromeLanguage";
import type { DensityMode } from "../tokenModel";
import type { Axis } from "./report.ts";
import {
  DEFAULT_ROLES,
  NO_METRICS,
  RATIO_MAX,
  RATIO_MIN,
  ROLE_IDS,
  WEIGHT_MAX,
  WEIGHT_MIN,
  featuresText,
  parseFeatureSettings,
  roleSize,
  roleSizeAdjust,
  sizeProvenance,
  type FaceMetrics,
  type RoleId,
  type ScaleSettings,
  type SizeContext,
  type Tracking,
  type TypeRole,
} from "./roles.ts";

export type FamilyChoice = { value: string; label: string };

export type TypeRolesProps = {
  roles: Record<RoleId, TypeRole>;
  scale: ScaleSettings;
  density: DensityMode;
  /** The density mode's font size on screen, which the working roles are
   * measured from. */
  densityFontSize: number;
  families: FamilyChoice[];
  /** Families that have Arabic-Indic digits, for the pairing. */
  arabicFamilies: FamilyChoice[];
  metricsFor: (family: string) => FaceMetrics;
  axesFor: (family: string) => Axis[];
  featureTagsFor: (family: string) => string[];
  onScale: (scale: ScaleSettings) => void;
  onRole: (id: RoleId, role: TypeRole) => void;
};

const TRACKING_UNITS: FamilyChoice[] = [
  { value: "px", label: "px" },
  { value: "rem", label: "rem" },
];

export function TypeRoles({
  roles,
  scale,
  density,
  densityFontSize,
  families,
  arabicFamilies,
  metricsFor,
  axesFor,
  featureTagsFor,
  onScale,
  onRole,
}: TypeRolesProps) {
  const t = useChromeText();
  const words = t.type.scale;
  const densityName = t.session.densityModes[density];
  const context: SizeContext = { scale, densityFontSize };
  return (
    <div className="pg-stack pg-type__roles">
      <div className="pg-stack">
        <TimeSlider
          label={words.ratio}
          hideLabel
          min={RATIO_MIN}
          max={RATIO_MAX}
          step={0.001}
          value={scale.ratio}
          onChange={(ratio) => onScale({ ...scale, ratio: Math.round(ratio * 1000) / 1000 })}
          format={(value) => value.toFixed(3)}
        />
        <TimeSlider
          label={words.base}
          hideLabel
          min={10}
          max={24}
          step={1}
          value={scale.base}
          onChange={(base) => onScale({ ...scale, base })}
          format={(value) => `${value}px`}
        />
        <p className="pg-note">{words.note(densityName, String(densityFontSize))}</p>
      </div>

      {ROLE_IDS.map((id) => (
        <RoleFields
          key={id}
          role={roles[id]}
          size={roleSize(roles[id], context)}
          provenance={sizeProvenance(roles[id], context, density, t.type.report, densityName)}
          families={families}
          arabicFamilies={arabicFamilies}
          metrics={metricsFor(roles[id].family)}
          metricsFor={metricsFor}
          axes={axesFor(roles[id].family)}
          featureTags={featureTagsFor(roles[id].family)}
          onRole={onRole}
        />
      ))}
    </div>
  );
}

function RoleFields({
  role,
  size,
  provenance,
  families,
  arabicFamilies,
  metrics,
  metricsFor,
  axes,
  featureTags,
  onRole,
}: {
  role: TypeRole;
  size: number;
  provenance: string;
  families: FamilyChoice[];
  arabicFamilies: FamilyChoice[];
  /** The role face's own metrics, which the pairing is computed against. */
  metrics: FaceMetrics;
  /** Any family's metrics, for the pairing the owner picks. */
  metricsFor: (family: string) => FaceMetrics;
  axes: Axis[];
  featureTags: string[];
  onRole: (id: RoleId, role: TypeRole) => void;
}) {
  const t = useChromeText();
  const words = t.type.scale;
  const set = (changes: Partial<TypeRole>) => onRole(role.id, { ...role, ...changes });
  const parsed = parseFeatureSettings(featuresText(role.features));
  const unknown = Object.keys(parsed.features).filter(
    (tag) => featureTags.length > 0 && !featureTags.includes(tag),
  );
  const sizeAdjust = roleSizeAdjust(role, metrics);
  // Six roles on one page means six of every field, so each one is named
  // after its role rather than leaving six identical labels behind.
  const roleName = t.type.roleNames[role.id];
  const named = (field: string) => words.named(roleName, field);

  return (
    <Disclosure
      className="pg-type__role"
      data-role={role.id}
      summary={
        <>
          <span className="pg-type__role-name">{roleName}</span>
          <code data-testid={`type-size-${role.id}`}>{size}px</code>
          <span className="pg-note">
            {words.hierarchy[role.hierarchy]}, {role.family}
          </span>
        </>
      }
    >

      <div className="pg-stack">
        <p className="pg-note" data-testid={`type-provenance-${role.id}`}>
          {words.sizeFrom(String(size), provenance)}
        </p>

        <ChoiceGroup
          label={named(words.family)}
          hideLabel
          choices={families.map((family) => ({ id: family.value, label: family.label }))}
          value={role.family}
          onChange={(family) => set({ family, axes: {} })}
        />

        {role.hierarchy === "reading" ? (
          <TimeSlider
            label={named(words.step)}
            hideLabel
            min={0}
            max={5}
            step={1}
            value={role.step}
            onChange={(step) => set({ step })}
            format={(value) => words.stepValue(String(value))}
          />
        ) : (
          <TimeSlider
            label={named(words.offset)}
            hideLabel
            min={-4}
            max={8}
            step={1}
            value={role.densityOffset}
            onChange={(densityOffset) => set({ densityOffset })}
            format={(value) => `${value >= 0 ? "+" : ""}${value}px`}
          />
        )}

        <TimeSlider
          label={named(words.weight)}
          hideLabel
          min={WEIGHT_MIN}
          max={WEIGHT_MAX}
          step={1}
          value={role.weight}
          onChange={(weight) => set({ weight })}
          format={(value) => String(value)}
        />
        <TimeSlider
          label={named(words.lineHeight)}
          hideLabel
          min={1}
          max={2}
          step={0.01}
          value={role.lineHeight}
          onChange={(lineHeight) => set({ lineHeight: Math.round(lineHeight * 100) / 100 })}
          format={(value) => value.toFixed(2)}
        />

        <div className="pg-row">
          <TextField
            label={named(words.tracking)}
            value={String(role.tracking.value)}
            onChange={(text) => {
              const value = Number.parseFloat(text);
              set({ tracking: { ...role.tracking, value: Number.isFinite(value) ? value : 0 } });
            }}
            dir="ltr"
            mono
            description={words.trackingDescription(role.tracking.unit)}
          />
          <ChoiceGroup
            label={named(words.trackingUnit)}
            hideLabel
            choices={TRACKING_UNITS.map((unit) => ({ id: unit.value, label: unit.label }))}
            value={role.tracking.unit}
            onChange={(unit) => set({ tracking: { ...role.tracking, unit: unit as Tracking["unit"] } })}
          />
        </div>

        {axes.length > 0 &&
          axes.map((axis) => (
            <TimeSlider
              key={axis.tag}
              label={named(`${axis.name} (${axis.tag})`)}
              hideLabel
              min={axis.min}
              max={axis.max}
              step={1}
              value={role.axes[axis.tag] ?? axis.default}
              onChange={(value) => set({ axes: { ...role.axes, [axis.tag]: value } })}
              format={(value) => String(value)}
            />
          ))}

        <TextField
          label={named(words.features)}
          value={featuresText(role.features)}
          onChange={(text) => {
            const { features } = parseFeatureSettings(text);
            set({ features });
          }}
          dir="ltr"
          mono
          description={
            featureTags.length === 0 ? words.featuresNoFont : words.featuresInFile(featureTags.join(" "))
          }
        />
        {unknown.length > 0 && (
          <StatusBadge tone="warning">{words.notInLoadedFile(unknown.join(", "))}</StatusBadge>
        )}

        <ChoiceGroup
          label={named(words.arabicPairing)}
          hideLabel
          choices={[{ id: "", label: words.none }, ...arabicFamilies.map((family) => ({ id: family.value, label: family.label }))]}
          value={role.arabic.family}
          onChange={(family) =>
            set({ arabic: { family, metrics: family === "" ? NO_METRICS : metricsFor(family) } })
          }
        />
        <p className="pg-note" data-testid={`type-size-adjust-${role.id}`}>
          {role.arabic.family === ""
            ? words.noPairing
            : sizeAdjust === null
              ? words.sizeAdjustUnknown
              : words.sizeAdjustOn(String(sizeAdjust), role.arabic.family)}
        </p>

        <div className="pg-row">
          <Button onPress={() => onRole(role.id, DEFAULT_ROLES[role.id])}>{words.reset}</Button>
        </div>
      </div>
    </Disclosure>
  );
}
