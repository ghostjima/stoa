import { useEffect, useState, type ReactNode } from "react";
import {
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastQueue as AriaToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components";
import { TONE_SYMBOL, toneWord, type FeedbackTone } from "./Callout";
import { Button } from "./Controls";
import { VisuallyHidden } from "./LiveRegion";
import { useStoaFormat } from "./locale";

/** How long a toast stays, in milliseconds, unless it says otherwise. */
export const DEFAULT_TOAST_TIMEOUT = 8000;

export type ToastAction = {
  /** The button's text ("Undo"). */
  label: string;
  /** Called on press; the toast closes after it. */
  onAction: () => void;
};

export type ToastOptions = {
  tone?: FeedbackTone;
  /** What happened, in one sentence: the toast's name, and what is
   * announced when it appears. */
  text: string;
  /** More about it, drawn under the text in the muted colour and given to
   * assistive technology as the toast's description, not announced. Any
   * content: a component here can update itself while the toast is shown,
   * a countdown to the end of an undo window, for example. The text cannot
   * change once shown; for news, close the toast and add another. */
  description?: ReactNode;
  /** One action on what the toast reports, for example Undo. */
  action?: ToastAction;
  /** Milliseconds before the toast closes by itself, 8000 by default; null
   * keeps it until it is closed. The time runs only while the pointer is
   * outside the toasts and focus is elsewhere. */
  timeout?: number | null;
  /** Called when the toast closes because its time ran out, not when it is
   * dismissed or its action is pressed. */
  onExpire?: () => void;
};

type QueuedToast = ToastOptions & { tone: FeedbackTone };

/** The toasts of an application: create one, render a ToastRegion with
 * it, and `add` toasts from anywhere. On React Aria's toast queue. */
export class ToastQueue {
  /** React Aria's queue, which the region renders. */
  readonly queue = new AriaToastQueue<QueuedToast>();
  // Keys closed by a person or by `close`, so the queue's close callback
  // can tell them from a toast whose time ran out.
  readonly #closed = new Set<string>();

  /** Shows a toast and returns its key. */
  add({ tone = "info", timeout = DEFAULT_TOAST_TIMEOUT, ...rest }: ToastOptions): string {
    const key: string = this.queue.add(
      { ...rest, tone, timeout },
      {
        timeout: timeout ?? undefined,
        onClose: () => {
          if (!this.#closed.delete(key)) rest.onExpire?.();
        },
      },
    );
    return key;
  }

  /** Closes a toast without calling its `onExpire`. */
  close(key: string): void {
    if (!this.queue.visibleToasts.some((toast) => toast.key === key)) return;
    this.#closed.add(key);
    this.queue.close(key);
  }
}

export type ToastRegionProps = {
  queue: ToastQueue;
  /** The region's name; the locale's "Notifications" by default. */
  label?: string;
};

/** Where toasts appear: a landmark region at the end corner of the
 * viewport (F6 moves to it, as to any React Aria landmark), drawn only
 * while it holds a toast. Toasts never take focus. Each one is announced
 * through a polite live region that stays in the document, so it does not
 * interrupt the screen reader. A toast closes after `timeout` (8 seconds
 * by default); the timers stop while the pointer is over the region or
 * focus is inside it, and go on from where they stopped when both leave
 * (WCAG 2.2.1). Its action and close button are reached with Tab.
 *
 * A toast has role alertdialog with aria-modal="false", as React Aria
 * makes it (its region finds its toasts by that role), so it shares the
 * role of an AlertDialog. Tell them apart by where they are and by
 * aria-modal: a toast is inside this region, named "Notifications" in the
 * locale's words, and is not modal; an AlertDialog is outside it, and the
 * page behind it is hidden while it is open. In a test, look for a toast
 * inside the region (`within(region).getByRole("alertdialog")`). */
export function ToastRegion({ queue, label }: ToastRegionProps) {
  const { messages } = useStoaFormat();
  const [announcement, setAnnouncement] = useState({ count: 0, text: "" });

  useEffect(() => {
    let seen = new Set(queue.queue.visibleToasts.map((toast) => toast.key));
    return queue.queue.subscribe(() => {
      const visible = queue.queue.visibleToasts;
      const fresh = visible.filter((toast) => !seen.has(toast.key));
      seen = new Set(visible.map((toast) => toast.key));
      if (fresh.length === 0) return;
      const text = fresh.map((toast) => `${toneWord(messages, toast.content.tone)}: ${toast.content.text}`).join(" ");
      setAnnouncement((previous) => ({ count: previous.count + 1, text }));
    });
  }, [queue, messages]);

  return (
    <>
      {/* A new node per toast, so the same text twice is read twice. */}
      <div role="status" aria-live="polite" className="stoa-visually-hidden">
        <span key={announcement.count}>{announcement.text}</span>
      </div>
      <AriaToastRegion queue={queue.queue} className="stoa-toast-region" aria-label={label ?? messages.notifications}>
        {({ toast }) => (
          <AriaToast toast={toast} className={`stoa-toast stoa-toast--${toast.content.tone}`}>
            <span className={`stoa-tone-symbol stoa-tone-symbol--${toast.content.tone}`} aria-hidden="true">
              {TONE_SYMBOL[toast.content.tone]}
            </span>
            {/* The toast's name. React Aria's content element, a role alert,
                is left out: the live region above announces politely. */}
            <div className="stoa-toast__body">
              <Text slot="title" className="stoa-toast__text">
                <VisuallyHidden>{`${toneWord(messages, toast.content.tone)}:`}</VisuallyHidden> {toast.content.text}
              </Text>
              {toast.content.description !== undefined && (
                <Text slot="description" className="stoa-toast__description">
                  {toast.content.description}
                </Text>
              )}
            </div>
            {toast.content.action && (
              <Button
                className="stoa-toast__action"
                onPress={() => {
                  toast.content.action?.onAction();
                  queue.close(toast.key);
                }}
              >
                {toast.content.action.label}
              </Button>
            )}
            <Button className="stoa-dismiss" aria-label={messages.dismiss} onPress={() => queue.close(toast.key)}>
              <span aria-hidden="true">×</span>
            </Button>
          </AriaToast>
        )}
      </AriaToastRegion>
    </>
  );
}
