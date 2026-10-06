// Feedback: a small application page (PageShell and AppHeader) with the
// import's progress, the notices about its data, toasts raised from its
// buttons, and the last trade as a live region.
import { memo, useEffect, useState } from "react";
import {
  AppHeader,
  Button,
  Callout,
  EmptyState,
  LiveRegion,
  PageShell,
  Panel,
  ProgressBar,
  Skeleton,
  SkeletonBlock,
  SkeletonLines,
  ToastQueue,
  ToastRegion,
  VisuallyHidden,
  useStoaFormat,
} from "@ghostjima/stoa-react";
import { timeAt, type Stream } from "../stream";
import { ErrorCallout, type ComponentScreenProps } from "./parts";
import { COMPONENT_WORDS, type ComponentWords } from "./words";

/** The settlement file's size and how much of it has arrived, in MB. */
const FILE_MB = 4.3;
const ARRIVED_MB = { live: 3.1, loading: 0.6 };

export const FeedbackScreen = memo(function FeedbackScreen({ language, state, onRetry, stream }: ComponentScreenProps) {
  const words = COMPONENT_WORDS[language];
  const text = words.feedback;
  const locale = useStoaFormat();
  // One queue per frame: a toast raised in a frame appears in that frame.
  const [toasts] = useState(() => new ToastQueue());
  const [reconciledShown, setReconciledShown] = useState(true);
  const megabytes = (value: number) => text.megabytes(locale.decimal(value, 1));
  const percent = new Intl.NumberFormat(locale.locale, { style: "percent", maximumFractionDigits: 0 });

  return (
    <PageShell
      headerPosition="static"
      header={<AppHeader title={text.appTitle} subtitle={text.appSubtitle} note={text.appNote} />}
      footer={text.footerText}
    >
      <div className="pg-components">
        {state === "error" && (
          <ErrorCallout title={text.errorTitle} retry={words.retry} onRetry={onRetry}>
            {text.errorText}
          </ErrorCallout>
        )}
        <div className="pg-screen">
          <div className="pg-screen__column">
            <Panel title={text.importTitle}>
              <div className="pg-stack">
                <ProgressBar
                  label={text.importLabel}
                  value={state === "loading" ? ARRIVED_MB.loading : state === "live" ? ARRIVED_MB.live : 0}
                  maxValue={FILE_MB}
                  formatValue={megabytes}
                />
                {state === "loading" ? (
                  <ProgressBar label={text.loadingLabel} isIndeterminate />
                ) : (
                  state === "live" && <ProgressBar label={text.reconcileLabel} isIndeterminate />
                )}
              </div>
            </Panel>
            <Panel title={text.noticesTitle}>
              <Notices
                state={state}
                text={text}
                percent={percent.format(0.82)}
                count={locale.integer(248)}
                reconciledShown={reconciledShown}
                onDismiss={() => setReconciledShown(false)}
                onImport={onRetry}
              />
            </Panel>
          </div>
          <div className="pg-screen__column">
            <Panel title={text.notificationsTitle}>
              <div className="pg-row">
                <Button
                  onPress={() =>
                    toasts.add({
                      tone: "positive",
                      text: text.fillText(locale.integer(500), locale.decimal(222.61, 2)),
                      action: { label: text.undo, onAction: () => undefined },
                    })
                  }
                >
                  {text.reportFill}
                </Button>
                <Button onPress={() => toasts.add({ tone: "warning", text: text.delayText(locale.decimal(3, 0)) })}>{text.reportDelay}</Button>
                <Button onPress={() => toasts.add({ tone: "negative", text: text.rejectionText("ORD-000215"), timeout: null })}>
                  {text.reportRejection}
                </Button>
                <Button variant="ghost" onPress={() => toasts.add({ tone: "info", text: text.savedText })}>
                  {text.reportSaved}
                </Button>
              </div>
              <ToastRegion queue={toasts} />
            </Panel>
            <Panel title={text.lastTradeTitle}>
              <LastTrade stream={stream} text={text} />
            </Panel>
          </div>
        </div>
      </div>
    </PageShell>
  );
});

function Notices({
  state,
  text,
  percent,
  count,
  reconciledShown,
  onDismiss,
  onImport,
}: {
  state: ComponentScreenProps["state"];
  text: ComponentWords["feedback"];
  percent: string;
  count: string;
  reconciledShown: boolean;
  onDismiss: () => void;
  onImport: () => void;
}) {
  if (state === "loading") {
    return (
      <Skeleton label={text.loadingLabel}>
        <SkeletonLines count={4} />
        <SkeletonBlock blockSize="calc(var(--stoa-space-12) * 2)" />
      </Skeleton>
    );
  }
  if (state === "empty") {
    return (
      <EmptyState
        title={text.emptyTitle}
        description={text.emptyText}
        action={
          <Button variant="primary" onPress={onImport}>
            {text.importAction}
          </Button>
        }
      />
    );
  }
  if (state === "error") return null;
  return (
    <div className="pg-stack">
      <Callout tone="info" role="none" title={text.delayedTitle}>
        {text.delayedText}
      </Callout>
      <Callout tone="warning" title={text.marginTitle}>
        {text.marginText(percent)}
      </Callout>
      {reconciledShown && (
        <Callout tone="positive" title={text.reconciledTitle} onDismiss={onDismiss}>
          {text.reconciledText(count)}
        </Callout>
      )}
    </div>
  );
}

/** The stream's mid price, drawn bare with its currency for assistive
 * technology, and announced at most every two seconds. Only this part of
 * the screen follows the stream. */
function LastTrade({ stream, text }: { stream: Stream; text: ComponentWords["feedback"] }) {
  const locale = useStoaFormat();
  const [frame, setFrame] = useState(() => stream.current());
  useEffect(() => stream.subscribe(setFrame), [stream]);
  const price = locale.decimal(frame.mid, 2);
  const time = locale.digits(timeAt(frame.tick).slice(0, 8));
  return (
    <div className="pg-stack">
      <p className="pg-figure">
        {price}
        <VisuallyHidden> {text.units.currency}</VisuallyHidden>
      </p>
      <dl className="pg-pairs">
        <dt>{text.announceLabel}</dt>
        <dd>
          <LiveRegion visible announceEvery={2000}>
            {text.lastTradeText(price, time)}
          </LiveRegion>
        </dd>
      </dl>
    </div>
  );
}
