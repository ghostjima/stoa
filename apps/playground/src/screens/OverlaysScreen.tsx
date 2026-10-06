// Overlays and lists: a working order whose details, filters, cancel
// confirmation and shortcut list open as overlays inside this frame; the
// watchlist in an order the person sets; the settlement steps; the
// session log and the order as the gateway sent it.
import { memo, useState } from "react";
import {
  AlertDialog,
  Button,
  Checkbox,
  CheckboxGroup,
  CodeView,
  DescriptionList,
  Dialog,
  EmptyState,
  Kbd,
  LogView,
  Panel,
  RecordList,
  ReorderableList,
  Sheet,
  ShortcutsDialog,
  Skeleton,
  SkeletonLines,
  StatusBadge,
  StepList,
  Toolbar,
  Tooltip,
  groupShortcuts,
  useShortcuts,
  useStoaFormat,
  type Step,
} from "@ghostjima/stoa-react";
import { LOG_STAMPS, ORDER, ORDER_PAYLOAD, VENUES, WATCHLIST, gridOrders, type WatchItem } from "./data";
import { ErrorCallout, type ComponentScreenProps } from "./parts";
import { COMPONENT_WORDS, type ComponentWords } from "./words";

type Overlay = "details" | "filters" | "cancel" | "shortcuts" | null;

export const OverlaysScreen = memo(function OverlaysScreen({ language, state, onRetry, shortcutsEnabled }: ComponentScreenProps) {
  const words = COMPONENT_WORDS[language];
  const text = words.overlays;
  const locale = useStoaFormat();
  const [open, setOpen] = useState<Overlay>(null);
  const [venues, setVenues] = useState<string[]>(VENUES.slice(0, 2));
  const [cancelled, setCancelled] = useState(false);
  const [order, setOrder] = useState(() => WATCHLIST.map((item) => item.id));
  const opener = (overlay: Exclude<Overlay, null>) => (isOpen: boolean) => setOpen(isOpen ? overlay : null);

  const help = useShortcuts(
    [
      { key: "d", description: text.openDetails, group: text.ordersGroup, onTrigger: () => setOpen("details") },
      { key: "f", description: text.openFilters, group: text.ordersGroup, onTrigger: () => setOpen("filters") },
      { key: "c", modifiers: ["shift"], description: text.cancelAllShortcut, group: text.ordersGroup, onTrigger: () => setOpen("cancel") },
      { key: "?", description: text.showShortcuts, group: text.helpGroup, onTrigger: () => setOpen("shortcuts") },
    ],
    // Not while an overlay is open: its own keys (Escape, Tab) are the
    // ones that matter then.
    { enabled: shortcutsEnabled && open === null },
  );

  const watchItems: WatchItem[] = order.flatMap((id) => {
    const item = WATCHLIST.find((candidate) => candidate.id === id);
    return item ? [{ ...item, textValue: `${item.symbol}, ${text.sectors[item.sector]}` }] : [];
  });

  return (
    <div className="pg-components">
      {state === "error" && (
        <ErrorCallout title={text.errorTitle} retry={words.retry} onRetry={onRetry}>
          {text.errorText}
        </ErrorCallout>
      )}
      <div className="pg-screen">
        <div className="pg-screen__column">
          <Panel title={text.orderTitle}>
            <div className="pg-stack">
              <div className="pg-row">
                <span className="pg-mono">{ORDER.id}</span>
                {cancelled ? <StatusBadge tone="negative">{words.status.cancelled}</StatusBadge> : <StatusBadge tone="neutral">{words.status.working}</StatusBadge>}
              </div>
              <Toolbar label={text.orderToolbarLabel}>
                <Dialog
                  trigger={<Button variant="secondary">{text.details}</Button>}
                  isOpen={open === "details"}
                  onOpenChange={opener("details")}
                  title={text.detailsTitle(ORDER.id)}
                  actions={(close) => (
                    <>
                      <Button variant="danger" onPress={close}>
                        {text.cancelOrder}
                      </Button>
                      <Button variant="primary" onPress={close}>
                        {text.amend}
                      </Button>
                    </>
                  )}
                >
                  <dl className="pg-pairs">
                    <dt>{text.symbol}</dt>
                    <dd className="pg-mono">{ORDER.symbol}</dd>
                    <dt>{text.side}</dt>
                    <dd>{words.buy}</dd>
                    <dt>{text.limitPrice}</dt>
                    <dd className="stoa-num">{locale.decimal(ORDER.limit, 2)}</dd>
                    <dt>{text.quantity}</dt>
                    <dd className="stoa-num">{locale.integer(ORDER.quantity)}</dd>
                    <dt>{text.filled}</dt>
                    <dd className="stoa-num">{locale.integer(ORDER.filled)}</dd>
                    <dt>{text.venue}</dt>
                    <dd className="pg-mono">{ORDER.venue}</dd>
                  </dl>
                </Dialog>
                <Sheet
                  trigger={<Button variant="secondary">{text.filters}</Button>}
                  isOpen={open === "filters"}
                  onOpenChange={opener("filters")}
                  placement="end"
                  title={text.filters}
                  actions={(close) => (
                    <>
                      <Button variant="ghost" onPress={() => setVenues(VENUES.slice(0, 2))}>
                        {text.reset}
                      </Button>
                      <Button variant="primary" onPress={close}>
                        {text.apply}
                      </Button>
                    </>
                  )}
                >
                  <CheckboxGroup label={text.venuesLabel} value={venues} onChange={setVenues}>
                    {VENUES.map((venue) => (
                      <Checkbox key={venue} value={venue}>
                        {venue}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </Sheet>
                <AlertDialog
                  trigger={
                    <Button variant="danger" isDisabled={state !== "live" || cancelled}>
                      {text.cancelAll}
                    </Button>
                  }
                  isOpen={open === "cancel"}
                  onOpenChange={opener("cancel")}
                  title={text.cancelTitle}
                  tone="destructive"
                  confirmLabel={text.confirmCancel}
                  cancelLabel={text.keepOrders}
                  onConfirm={() => setCancelled(true)}
                >
                  <p>{text.cancelText(locale.integer(31))}</p>
                </AlertDialog>
                <ShortcutsDialog
                  trigger={<Button variant="ghost">{text.shortcuts}</Button>}
                  isOpen={open === "shortcuts"}
                  onOpenChange={opener("shortcuts")}
                  title={text.shortcutsTitle}
                  groups={groupShortcuts(help, text.helpGroup)}
                />
              </Toolbar>
              <p className="pg-note">
                {text.pressBeforePart} <Kbd>?</Kbd> {text.pressAfterPart}. {words.focusHintText}
              </p>
            </div>
          </Panel>
          <Panel title={text.watchlistTitle}>
            {state === "loading" ? (
              <Skeleton label={text.loadingLabel}>
                <SkeletonLines count={5} />
              </Skeleton>
            ) : (
              <ReorderableList
                label={text.watchlistLabel}
                items={state === "empty" ? [] : watchItems}
                onReorder={(next) => setOrder(next.map((item) => item.id))}
                onRemove={(item) => setOrder((ids) => ids.filter((id) => id !== item.id))}
                emptyText={text.watchlistEmptyText}
                renderItem={(item) => (
                  <span className="pg-watch">
                    <span className="pg-mono">{item.symbol}</span>
                    <span className="pg-watch__sector">{text.sectors[item.sector]}</span>
                    <span className="stoa-num">{locale.decimal(item.last, 2)}</span>
                  </span>
                )}
              />
            )}
          </Panel>
        </div>
        <div className="pg-screen__column">
          <Panel title={text.stepsTitle}>
            <Settlement state={state} text={text} words={words} onRetry={onRetry} />
          </Panel>
          <Panel title={text.ordersTitle}>
            <TodaysOrders state={state} text={text} words={words} />
          </Panel>
        </div>
      </div>
      {/* The log and the payload are left to right and never wrap, so they
          take the frame's whole width rather than a column's: their lines
          fit without a scrollbar sideways. */}
      <Panel title={text.logTitle}>
        {state === "loading" ? (
          <Skeleton label={text.loadingLabel}>
            <SkeletonLines count={4} />
          </Skeleton>
        ) : (
          <LogView
            label={text.logLabel}
            maxLines={6}
            // An empty session has only just opened.
            lines={LOG_STAMPS.slice(0, state === "empty" ? 1 : undefined).map((stamp, index) => ({
              time: locale.digits(stamp.time),
              level: stamp.level,
              text: text.logLines[index] ?? "",
            }))}
          />
        )}
      </Panel>
      <Panel title={text.codeTitle}>
        <CodeView label={text.codeLabel} code={ORDER_PAYLOAD} lineNumbers maxLines={10} />
      </Panel>
    </div>
  );
});

/** Today's orders: a master-detail view, the list of orders and the
 * picked one's details, with its time in force explained in a tooltip. */
const TODAYS_ORDERS = gridOrders(5, 23);

function TodaysOrders({ state, text, words }: { state: ComponentScreenProps["state"]; text: ComponentWords["overlays"]; words: ComponentWords }) {
  const locale = useStoaFormat();
  const [picked, setPicked] = useState<string | null>(TODAYS_ORDERS[0]!.id);
  if (state === "loading") {
    return (
      <Skeleton label={text.loadingLabel}>
        <SkeletonLines count={5} />
      </Skeleton>
    );
  }
  const orders = state === "empty" ? [] : TODAYS_ORDERS;
  const order = orders.find((candidate) => candidate.id === picked);
  return (
    <div className="pg-master-detail">
      <RecordList
        label={text.ordersLabel}
        items={orders.map((o) => ({
          id: o.id,
          label: o.id,
          description: `${o.side === "buy" ? words.buy : words.sell} ${o.symbol}`,
          meta: locale.integer(o.quantity),
        }))}
        value={order ? order.id : null}
        onChange={setPicked}
        emptyText={text.ordersEmptyText}
      />
      {order && (
        <DescriptionList
          items={[
            { term: text.symbol, description: <span className="pg-mono">{order.symbol}</span> },
            { term: text.side, description: order.side === "buy" ? words.buy : words.sell },
            { term: text.quantity, description: locale.integer(order.quantity), numeric: true },
            { term: text.limitPrice, description: locale.decimal(order.price, 2), numeric: true },
            { id: "tif", term: <Tooltip content={text.tifText}>{text.tifTerm}</Tooltip>, description: text.tifDay },
          ]}
        />
      )}
    </div>
  );
}

function Settlement({
  state,
  text,
  words,
  onRetry,
}: {
  state: ComponentScreenProps["state"];
  text: ComponentWords["overlays"];
  words: ComponentWords;
  onRetry: () => void;
}) {
  const locale = useStoaFormat();
  if (state === "loading") {
    return (
      <Skeleton label={text.loadingLabel}>
        <SkeletonLines count={6} />
      </Skeleton>
    );
  }
  if (state === "empty") return <EmptyState title={text.emptyTitle} description={text.emptyText} />;
  const failed = state === "error";
  const steps: Step[] = [
    { id: "match", title: text.steps.match, status: "done", explanation: text.matchedText(locale.integer(248), locale.integer(248)) },
    { id: "confirm", title: text.steps.confirm, status: "done" },
    failed
      ? {
          id: "instruct",
          title: text.steps.instruct,
          status: "error",
          explanation: text.instructErrorText,
          actions: (
            <Button variant="secondary" onPress={onRetry}>
              {words.retry}
            </Button>
          ),
        }
      : { id: "instruct", title: text.steps.instruct, status: "running", explanation: text.instructText, progress: 0.6 },
    {
      id: "approve",
      title: text.steps.approve,
      status: failed ? "waiting" : "awaiting",
      explanation: text.approveText(locale.decimal(111300, 2)),
      actions: failed ? undefined : (
        <>
          <Button variant="primary">{text.approve}</Button>
          <Button variant="ghost">{text.reject}</Button>
        </>
      ),
    },
    { id: "book", title: text.steps.book, status: "waiting" },
    { id: "report", title: text.steps.report, status: "skipped", explanation: text.reportSkippedText },
  ];
  return <StepList label={text.stepsLabel} steps={steps} />;
}
