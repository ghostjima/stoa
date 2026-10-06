// Charts and tables: a bond's figures (StatBar of metrics, and one
// Metric on its own), its coupon under three rate scenarios, its payments
// to maturity, and the open positions.
import { memo } from "react";
import {
  EmptyState,
  EventStrip,
  LineChart,
  Metric,
  Panel,
  Skeleton,
  SkeletonBlock,
  SkeletonLines,
  StatBar,
  Table,
  formatDate,
  useStoaFormat,
  type TableColumn,
} from "@ghostjima/stoa-react";
import { POSITIONS, STRIP_FROM, bondEvents, couponScenarios, positionValue, type Position } from "./data";
import { ErrorCallout, type ComponentScreenProps } from "./parts";
import { COMPONENT_WORDS } from "./words";

/** The chart's drawing height, in CSS pixels; its skeleton takes the same
 * block size, so the screen does not jump when the data arrives. */
const CHART_HEIGHT = 200;
/** The payments strip's drawing, legend included, for its skeleton. */
const STRIP_SKELETON = "calc(var(--stoa-space-12) * 2)";

export const ChartsScreen = memo(function ChartsScreen({ language, state, onRetry }: ComponentScreenProps) {
  const words = COMPONENT_WORDS[language];
  const text = words.charts;
  const locale = useStoaFormat();
  const loading = state === "loading";
  // No data at all: the empty state, or an error, where the components say
  // that nothing was loaded rather than that nothing exists.
  const hasData = state === "live";
  const notLoaded = state === "error" ? text.notLoadedText : undefined;

  const scenarioNames = { down: text.rateDown, flat: text.rateFlat, up: text.rateUp };
  const series = hasData ? couponScenarios().map((s) => ({ ...s, name: scenarioNames[s.id] })) : [];
  const signed = new Intl.NumberFormat(locale.locale, { signDisplay: "exceptZero", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const columns: TableColumn<Position>[] = [
    { id: "bond", header: text.bond, cell: (row) => text.bonds[row.index] },
    { id: "quantity", header: text.quantity, numeric: true, cell: (row) => locale.integer(row.quantity) },
    { id: "price", header: text.price, numeric: true, cell: (row) => locale.decimal(row.price, 2) },
    { id: "yield", header: text.yieldPercent, numeric: true, cell: (row) => locale.decimal(row.yieldPercent, 2) },
    { id: "value", header: text.value, numeric: true, cell: (row) => locale.integer(positionValue(row)) },
    { id: "change", header: text.change, numeric: true, cell: (row) => signed.format(row.change) },
  ];

  return (
    <div className="pg-components">
      {state === "error" && (
        <ErrorCallout title={text.errorTitle} retry={words.retry} onRetry={onRetry}>
          {text.errorText}
        </ErrorCallout>
      )}
      <Panel title={text.figuresTitle}>
        {loading ? (
          <Skeleton label={text.loadingLabel}>
            <SkeletonLines count={2} />
          </Skeleton>
        ) : hasData ? (
          <div className="pg-figures">
            <StatBar
              label={text.figuresLabel}
              items={[
                { kind: "metric", label: text.yieldLabel, value: 14.82, fractionDigits: 2, unit: "%", basis: text.todayBasis, threshold: { tone: "positive", label: text.aboveTarget } },
                { kind: "metric", label: text.durationLabel, value: 2.41, fractionDigits: 2, unit: text.units.years },
                { kind: "metric", label: text.priceLabel, value: 97.35, fractionDigits: 2, unit: text.units.ofPar, threshold: { tone: "neutral", label: text.withinLimit } },
                { kind: "metric", label: text.couponLabel, value: 41.14, fractionDigits: 2, unit: text.units.rub, basis: text.nextBasis(formatDate(locale.locale, Date.UTC(2027, 0, 15))) },
              ]}
            />
            <Metric
              label={text.spreadLabel}
              value={182}
              unit={text.units.basisPoints}
              basis={text.spreadBasis}
              threshold={{ tone: "negative", label: text.aboveLimit }}
            />
          </div>
        ) : (
          <EmptyState title={state === "error" ? text.errorTitle : text.emptyTitle} description={notLoaded ?? text.emptyText} />
        )}
      </Panel>
      <Panel title={text.chartTitle}>
        {loading ? (
          <Skeleton label={text.loadingLabel}>
            <SkeletonBlock blockSize={`${CHART_HEIGHT}px`} />
          </Skeleton>
        ) : (
          <LineChart
            label={text.chartLabel}
            description={text.chartDescriptionText}
            series={series}
            xLabel={text.dateLabel}
            yLabel={text.couponAxis}
            height={CHART_HEIGHT}
            dataTable="toggle"
            emptyText={notLoaded}
          />
        )}
      </Panel>
      <Panel title={text.stripTitle}>
        {loading ? (
          <Skeleton label={text.loadingLabel}>
            <SkeletonBlock blockSize={STRIP_SKELETON} />
          </Skeleton>
        ) : (
          <EventStrip label={text.stripLabel} events={hasData ? bondEvents() : []} from={STRIP_FROM} emptyText={notLoaded} />
        )}
      </Panel>
      <Panel title={text.tableTitle}>
        {loading ? (
          <Skeleton label={text.loadingLabel}>
            <SkeletonLines count={6} />
          </Skeleton>
        ) : (
          <Table
            columns={columns}
            rows={hasData ? POSITIONS : []}
            rowKey={(row) => row.index}
            caption={text.tableCaption}
            hideCaption
            rowHeader="bond"
            emptyText={notLoaded ?? text.tableEmptyText}
            stickyHeader
          />
        )}
      </Panel>
    </div>
  );
});
