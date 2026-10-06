import { useId, type ReactNode } from "react";
import { MetricParts, type MetricProps } from "./Metric";

export type PanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
  /** The heading's level in the page's outline: 2 by default, for a panel
   * of the page; 3 or deeper for a panel inside another section. The
   * heading is drawn the same at every level. */
  level?: 2 | 3 | 4 | 5 | 6;
};

/** A titled region: a section with a heading that labels it. */
export function Panel({ title, children, className, level = 2 }: PanelProps) {
  const id = useId();
  const Heading = `h${level}` as const;
  return (
    <section className={`stoa-panel ${className ?? ""}`.trim()} aria-labelledby={id}>
      <Heading id={id} className="stoa-panel__title">
        {title}
      </Heading>
      {children}
    </section>
  );
}

/** One value of a StatBar: a label and preformatted text, or a Metric
 * (`kind: "metric"`) with its unit, basis and threshold. */
export type StatBarItem = { label: string; value: string } | (MetricProps & { kind: "metric" });

/** A row of small labelled values (for example performance counters).
 * Each value is isolated in the direction of its own first letter
 * (`bdi`), so "16.9 ms" keeps its number before its unit in a
 * right-to-left page. */
export function StatBar({ items, label }: { items: StatBarItem[]; label: string }) {
  return (
    <dl className="stoa-statbar" aria-label={label}>
      {items.map((i) =>
        "kind" in i ? (
          <div key={i.label} className="stoa-statbar__item stoa-statbar__item--metric">
            <MetricParts {...i} />
          </div>
        ) : (
          <div key={i.label} className="stoa-statbar__item">
            <dt>{i.label}</dt>
            <dd>
              <bdi>{i.value}</bdi>
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}
