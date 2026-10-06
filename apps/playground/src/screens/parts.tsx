// What every component screen takes, and the pieces they share.
import type { ReactNode } from "react";
import { Button, Callout } from "@ghostjima/stoa-react";
import type { Language } from "../screenText";
import type { Stream } from "../stream";
import type { DataState, GridRowCount } from "./model";

export type ComponentScreenProps = {
  language: Language;
  state: DataState;
  /** Retry on an error callout: sets the global state back to Live. */
  onRetry: () => void;
  /** The frame has the focus, so its keyboard shortcuts run; the other
   * frame's do not. */
  shortcutsEnabled: boolean;
  stream: Stream;
  gridRows: GridRowCount;
};

/** The error of a screen's data: a negative callout that interrupts, with
 * a Retry that brings the data back. */
export function ErrorCallout({ title, children, retry, onRetry }: { title: string; children: ReactNode; retry: string; onRetry: () => void }) {
  return (
    <Callout
      tone="negative"
      role="alert"
      title={title}
      action={
        <Button variant="secondary" onPress={onRetry}>
          {retry}
        </Button>
      }
    >
      {children}
    </Callout>
  );
}
