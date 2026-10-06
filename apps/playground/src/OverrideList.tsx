// Every override in one place: the token, what stoa-default gives it, and
// what it was set to. A hand edit is an explicit layer on top of the token
// files and has to stay visible.
import { Button, StatusBadge } from "@ghostjima/stoa-react";
import { useChromeText } from "./chromeLanguage";
import type { Overrides, ResolvedTokens } from "./tokenModel";

export type OverrideListProps = {
  overrides: Overrides;
  values: ResolvedTokens["values"];
  onReset: (id: string) => void;
  onResetAll: () => void;
  /** Token ids to mark: the tokens a selected verification failure reads. */
  highlighted: string[];
};

export function OverrideList({ overrides, values, onReset, onResetAll, highlighted }: OverrideListProps) {
  const t = useChromeText();
  const ids = Object.keys(overrides).sort();
  return (
    <div className="pg-overrides" data-override-count={ids.length}>
      <div className="pg-row pg-row--between">
        <StatusBadge tone={ids.length > 0 ? "warning" : "neutral"}>
          {ids.length === 0 ? t.overrides.none : t.overrides.count(ids.length)}
        </StatusBadge>
        <Button onPress={onResetAll} isDisabled={ids.length === 0}>
          {t.overrides.resetAll}
        </Button>
      </div>
      {ids.length > 0 && (
        <table className="stoa-table pg-overrides__table">
          <caption className="stoa-visually-hidden">{t.overrides.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.overrides.token}</th>
              <th scope="col">{t.overrides.derived}</th>
              <th scope="col">{t.overrides.override}</th>
              <th scope="col">
                <span className="stoa-visually-hidden">{t.overrides.reset}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => (
              <tr key={id} data-override={id} data-highlighted={highlighted.includes(id) ? "true" : undefined}>
                <td>
                  <code>{id}</code>
                </td>
                <td>
                  <code>{values[id]?.derived ?? t.overrides.unknown}</code>
                </td>
                <td>
                  <code>{overrides[id]}</code>
                </td>
                <td>
                  <Button onPress={() => onReset(id)}>{t.overrides.reset}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
