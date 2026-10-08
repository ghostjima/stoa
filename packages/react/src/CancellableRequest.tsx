import { useId, useState, type ReactNode } from "react";
import { Button } from "./Controls";
import { AlertDialog } from "./Dialog";
import { focusWhenReady } from "./focus";
import { useStoaFormat } from "./locale";

export type CancellableRequestProps = {
  /** Whether the request is recorded. The application keeps it: it sets
   * this from `onRequest` and `onCancel`. */
  isRequested: boolean;
  /** The button that asks for the request: a verb for what it asks
   * ("Request redemption"), on the primary fill. */
  requestLabel: string;
  /** The confirmation's title ("Redeem RU000A1F3 at the offer?"). */
  confirmTitle: ReactNode;
  /** The confirmation's text: what will be requested, and until when it
   * can be cancelled. */
  children: ReactNode;
  /** The confirmation's primary action: a verb, not "OK" ("Request"). */
  confirmLabel: string;
  /** Called when the person confirms; the application records the
   * request. */
  onRequest: () => void;
  /** What the recorded request is, shown beside Cancel and read as its
   * description ("40 bonds to redeem; you can cancel until 12 October."). */
  recordedText: ReactNode;
  /** Cancel's label; the locale's "Cancel request" by default. */
  cancelLabel?: string;
  /** Called when the person cancels the recorded request. */
  onCancel: () => void;
  /** Requests can no longer be made or cancelled (the deadline has
   * passed): `closedText` stands in place of the buttons. */
  isClosed?: boolean;
  /** What a closed request says; the locale's "Requests are closed." by
   * default. */
  closedText?: ReactNode;
  /** A line above the buttons, read as their description too: the
   * deadline, for example with a Countdown. */
  deadline?: ReactNode;
};

/**
 * A request that is confirmed, then can be cancelled until a deadline: a
 * button that opens an AlertDialog; once confirmed, what was recorded and
 * a Cancel button in its place; after the deadline, a sentence instead of
 * either. The application keeps the request (`isRequested`) and the
 * deadline (`isClosed`); a redemption at a put offer is one.
 *
 * The focus moves to the control that replaces the one pressed: to Cancel
 * once the request is confirmed, to the request button once it is
 * cancelled. Declining the confirmation (its safe action or Escape)
 * returns the focus to the request button. Cancel is described by what
 * was recorded, and both buttons by the deadline line.
 */
export function CancellableRequest({
  isRequested,
  requestLabel,
  confirmTitle,
  children,
  confirmLabel,
  onRequest,
  recordedText,
  cancelLabel,
  onCancel,
  isClosed = false,
  closedText,
  deadline,
}: CancellableRequestProps) {
  const { messages } = useStoaFormat();
  const [confirming, setConfirming] = useState(false);
  const id = useId();
  const requestId = `${id}-request`;
  const cancelId = `${id}-cancel`;
  const deadlineId = `${id}-deadline`;
  const recordedId = `${id}-recorded`;
  const deadlineRef = deadline === undefined ? undefined : deadlineId;
  return (
    <div className="stoa-request">
      {deadline !== undefined && (
        <div id={deadlineId} className="stoa-request__deadline">
          {deadline}
        </div>
      )}
      {isClosed ? (
        <p className="stoa-request__closed">{closedText ?? messages.requestClosed}</p>
      ) : isRequested ? (
        <div className="stoa-request__recorded">
          <p id={recordedId} className="stoa-request__text">
            {recordedText}
          </p>
          <Button
            id={cancelId}
            aria-describedby={[recordedId, deadlineRef].filter(Boolean).join(" ")}
            onPress={() => {
              focusWhenReady(requestId);
              onCancel();
            }}
          >
            {cancelLabel ?? messages.requestCancel}
          </Button>
        </div>
      ) : (
        <div>
          <Button id={requestId} variant="primary" aria-describedby={deadlineRef} onPress={() => setConfirming(true)}>
            {requestLabel}
          </Button>
        </div>
      )}
      <AlertDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title={confirmTitle}
        confirmLabel={confirmLabel}
        onConfirm={() => {
          focusWhenReady(cancelId);
          onRequest();
        }}
      >
        {children}
      </AlertDialog>
    </div>
  );
}
