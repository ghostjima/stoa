import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { Callout } from "./Callout";
import { Button } from "./Controls";
import { Dialog, Sheet } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { keepFocusInPlace } from "./focus";
import { LiveRegion, VisuallyHidden } from "./LiveRegion";
import { PageShell } from "./PageShell";
import { Panel } from "./Panel";
import { ProgressBar, Skeleton, SkeletonBlock, SkeletonLines } from "./Progress";
import { ToastQueue, ToastRegion } from "./Toast";
import { useStoaFormat } from "./locale";

const meta: Meta = { title: "Feedback/Feedback and layout" };
export default meta;

function Column({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "var(--stoa-space-3)", maxInlineSize: "calc(var(--stoa-space-12) * 10)" }}>
      {children}
    </div>
  );
}

/** Info: a note about what the view shows. Every tone is a symbol, a word
 * read by assistive technology, and a colour. */
export const CalloutInfo: StoryObj = {
  render: () => (
    <Column>
      <Callout tone="info" title="Delayed data">
        Quotes from IEX arrive fifteen minutes late.
      </Callout>
    </Column>
  ),
};

export const CalloutPositive: StoryObj = {
  render: () => (
    <Column>
      <Callout tone="positive" title="Session loaded">
        2 hours 14 minutes of AAPL, ready to replay.
      </Callout>
    </Column>
  ),
};

export const CalloutWarning: StoryObj = {
  render: () => (
    <Column>
      <Callout tone="warning" title="Gap in the data">
        No quotes between 11:02 and 11:09; the book holds its last state.
      </Callout>
    </Column>
  ),
};

/** An error after an action, with a retry: role alert, so it interrupts. */
export const CalloutNegativeWithRetry: StoryObj = {
  render: () => (
    <Column>
      <Callout tone="negative" role="alert" title="Could not load AAPL" action={<Button>Retry</Button>}>
        The download stopped at 38 percent.
      </Callout>
    </Column>
  ),
};

/** A callout the person can close: the close button is named "Dismiss"
 * in the locale's language. */
export const CalloutDismissible: StoryObj = {
  render: () => {
    const [shown, setShown] = useState(true);
    return (
      <Column>
        {shown ? (
          <Callout tone="info" onDismiss={() => setShown(false)}>
            Replays start at ten times real speed; change it under Speed.
          </Callout>
        ) : (
          <Button style={{ justifySelf: "start" }} onPress={() => setShown(true)}>Show the callout again</Button>
        )}
      </Column>
    );
  },
};

/** An application's own action that removes the focused control: Apply
 * closes the selection bar it sits in. keepFocusInPlace, called before
 * the bar goes, moves focus to the next tab stop where the bar was
 * ("Export") instead of letting it fall to the page's body. */
export const FocusAfterRemoval: StoryObj = {
  render: () => {
    const [selected, setSelected] = useState(3);
    const [status, setStatus] = useState("Three rows selected.");
    return (
      <Column>
        {selected > 0 && (
          <div role="group" aria-label="Selection" style={{ display: "flex", gap: "var(--stoa-space-2)", alignItems: "center" }}>
            <span>{selected} selected</span>
            <Button
              variant="primary"
              onPress={(e) => {
                keepFocusInPlace(e.target);
                setSelected(0);
                setStatus("Status set to Approved on three rows.");
              }}
            >
              Approve
            </Button>
          </div>
        )}
        <p>{status}</p>
        <Button style={{ justifySelf: "start" }}>Export</Button>
        <Button style={{ justifySelf: "start" }} onPress={() => setSelected(3)}>
          Select three rows again
        </Button>
      </Column>
    );
  },
};

/** A static note that is part of the page: no title, no live region. */
export const CalloutStaticNote: StoryObj = {
  render: () => (
    <Column>
      <Callout tone="info" role="none">
        Each step is checked by substituting the solution back into the equation.
      </Callout>
    </Column>
  ),
};

/** A region with nothing yet, and the action that fills it. */
export const EmptyStateWithAction: StoryObj = {
  render: () => (
    <Panel title="Orders">
      <EmptyState title="No orders yet" description="Orders you place during the replay appear here." action={<Button variant="primary">Place an order</Button>} />
    </Panel>
  ),
};

export const EmptyStateTitleOnly: StoryObj = {
  render: () => (
    <Panel title="Audit">
      <EmptyState title="Nothing to audit" />
    </Panel>
  ),
};

/** Three lines while text loads; one "Loading" is announced, the shapes
 * are hidden from assistive technology. They pulse, and stand still under
 * reduced motion. */
export const SkeletonText: StoryObj = {
  render: () => (
    <Panel title="Lesson">
      <Skeleton />
    </Panel>
  ),
};

/** A block for a chart and lines for its caption, under one label. */
export const SkeletonBlockAndLines: StoryObj = {
  render: () => (
    <Panel title="Liquidity">
      <Skeleton label="Loading the heatmap">
        <SkeletonBlock blockSize="calc(var(--stoa-space-12) * 3)" />
        <SkeletonLines count={2} />
      </Skeleton>
    </Panel>
  ),
};

/** A percentage, in the locale's digits. */
export const ProgressPercent: StoryObj = {
  render: () => (
    <Column>
      <ProgressBar label="Building the book" value={45} />
    </Column>
  ),
};

/** An amount out of a total, with the caller's format for bytes. */
export const ProgressBytes: StoryObj = {
  render: () => {
    const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
    return (
      <Column>
        <ProgressBar label="Loading AAPL" value={1.8e6} maxValue={4.8e6} formatValue={mb} />
      </Column>
    );
  },
};

/** The total is unknown: a segment slides along the track, and stands in
 * the middle under reduced motion. */
export const ProgressIndeterminate: StoryObj = {
  render: () => (
    <Column>
      <ProgressBar label="Starting the engine" isIndeterminate />
    </Column>
  ),
};

/** A toast with an Undo action. It closes after 8 seconds; the time stops
 * while the pointer is over the toasts or focus is inside them (F6 or Tab
 * reaches them), so there is time to press Undo. */
export const ToastWithUndo: StoryObj = {
  render: () => {
    const [queue] = useState(() => new ToastQueue());
    const [log, setLog] = useState("No order cancelled yet.");
    return (
      <Column>
        <Button
          style={{ justifySelf: "start" }}
          onPress={() => {
            setLog("Order 1042 cancelled.");
            queue.add({
              text: "Order 1042 cancelled.",
              action: { label: "Undo", onAction: () => setLog("Order 1042 restored.") },
              onExpire: () => setLog("Order 1042 cancelled; the undo has expired."),
            });
          }}
        >
          Cancel order 1042
        </Button>
        <p>{log}</p>
        <ToastRegion queue={queue} />
      </Column>
    );
  },
};

/** One toast of each tone, kept until closed (timeout null). */
export const ToastTones: StoryObj = {
  render: () => {
    const [queue] = useState(() => new ToastQueue());
    useEffect(() => {
      const keys = [
        queue.add({ tone: "info", text: "Replay paused at 10:31.", timeout: null }),
        queue.add({ tone: "positive", text: "Order 1043 filled.", timeout: null }),
        queue.add({ tone: "warning", text: "Feed delayed by 4 seconds.", timeout: null }),
        queue.add({ tone: "negative", text: "Order 1044 rejected.", timeout: null, action: { label: "Retry", onAction: () => {} } }),
      ];
      return () => keys.forEach((key) => queue.close(key));
    }, [queue]);
    return <ToastRegion queue={queue} />;
  },
};

/** The seconds left until a deadline, updated every second. */
function SecondsLeft({ until }: { until: number }) {
  const { integer } = useStoaFormat();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>Undo possible for {integer(Math.max(0, Math.ceil((until - now) / 1000)))} s</>;
}

/** A toast whose description updates itself while it is shown: the time
 * left to undo. The text is announced once; the description is the
 * toast's description for assistive technology, not news. */
export const ToastWithCountdown: StoryObj = {
  render: () => {
    const [queue] = useState(() => new ToastQueue());
    useEffect(() => {
      const until = Date.now() + 60_000;
      const key = queue.add({
        text: "Step 3 deleted.",
        description: <SecondsLeft until={until} />,
        action: { label: "Undo", onAction: () => {} },
        timeout: null,
      });
      return () => queue.close(key);
    }, [queue]);
    return <ToastRegion queue={queue} />;
  },
};

/** A visible live region: each press changes the count, which is read
 * out at most twice a second, ending on the latest value. */
export const LiveRegionCounter: StoryObj = {
  render: () => {
    const [count, setCount] = useState(0);
    return (
      <Column>
        <Button style={{ justifySelf: "start" }} onPress={() => setCount((c) => c + 1)}>Add a row</Button>
        <LiveRegion visible>{`${count} rows`}</LiveRegion>
      </Column>
    );
  },
};

/** A close button drawn as a cross and named in words for assistive
 * technology. */
export const VisuallyHiddenText: StoryObj = {
  render: () => (
    <Button>
      <span aria-hidden="true">×</span>
      <VisuallyHidden>Close the panel</VisuallyHidden>
    </Button>
  ),
};

/** The frame of a page: the skip link (the first Tab stop), the AppHeader
 * as the banner, the main region and a footer. */
export const PageShellFrame: StoryObj = {
  render: () => (
    <PageShell
      header={<AppHeader title="Tyche Replay" subtitle="AAPL on IEX" actions={<Button>Settings</Button>} />}
      footer="Data provided for free by IEX."
    >
      <Panel title="Session">
        <EmptyState title="No session loaded" description="Pick a symbol and a day to start." action={<Button variant="primary">Load a session</Button>} />
      </Panel>
    </PageShell>
  ),
  parameters: { layout: "fullscreen" },
};

/** A long page: the header stays at the top, the page scrolls under it,
 * and the scrollbar starts below the header in its own lane. */
export const PageShellLongPage: StoryObj = {
  render: () => (
    <PageShell
      header={<AppHeader title="Tyche Replay" subtitle="AAPL on IEX" actions={<Button>Settings</Button>} />}
      footer="Data provided for free by IEX."
    >
      <Column>
        {Array.from({ length: 24 }, (_, i) => (
          <Panel key={i} title={`Session ${i + 1}`}>
            AAPL on IEX, one trading day replayed from the recorded messages.
          </Panel>
        ))}
      </Column>
    </PageShell>
  ),
  parameters: { layout: "fullscreen" },
};

function LongPageWithOverlays() {
  return (
    <PageShell
      header={
        <AppHeader
          title="Tyche Replay"
          subtitle="AAPL on IEX"
          actions={
            <>
              <Dialog title="Session details" trigger={<Button>Details</Button>}>
                <p>AAPL on IEX, 24 September 2026, replayed from the recorded messages.</p>
              </Dialog>
              <Sheet title="Filters" trigger={<Button>Filters</Button>}>
                <p>Venues, sides and sizes to show.</p>
              </Sheet>
            </>
          }
        />
      }
      footer="Data provided for free by IEX."
    >
      <Column>
        {Array.from({ length: 24 }, (_, i) => (
          <Panel key={i} title={`Session ${i + 1}`}>
            AAPL on IEX, one trading day replayed from the recorded messages.
          </Panel>
        ))}
      </Column>
    </PageShell>
  );
}

/** A long page with a dialog and a sheet: while one is open, the page
 * under the header does not scroll behind it, by wheel or keys, and the
 * overlay stays in view. */
export const PageShellWithOverlays: StoryObj = {
  render: () => <LongPageWithOverlays />,
  parameters: { layout: "fullscreen" },
};
