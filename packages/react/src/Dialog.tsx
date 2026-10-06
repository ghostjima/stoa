import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from "react";
import { Dialog as AriaDialog, DialogTrigger, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Button } from "./Controls";
import { focusLost, placeOf, tabStopAt, type FocusPlace } from "./focus";
import { useStoaFormat } from "./locale";
import { PageScrollLock } from "./PageShell";

/** How an overlay opens: from a trigger it wraps, or from the caller's own
 * state. */
export type OverlayOpenProps = {
  /** The control that opens the overlay, usually a Button. Focus returns to
   * it on close. Leave it out to open the overlay with `isOpen`; focus then
   * returns to whatever had it before the overlay opened. */
  trigger?: ReactElement;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

type ContentProps = {
  /** The dialog's heading, which also names it. */
  title: ReactNode;
  /** The body. */
  children: ReactNode;
  /** Buttons at the end of the dialog. A function is given `close`. */
  actions?: ReactNode | ((close: () => void) => ReactNode);
};

export type DialogProps = OverlayOpenProps &
  ContentProps & {
    /** Close on a press outside the dialog as well as on Escape and the
     * close button. On by default. */
    isDismissable?: boolean;
  };

export type SheetProps = DialogProps & {
  /** Where the sheet comes from: the inline end (right in left-to-right
   * text, left in right-to-left), the bottom, or "auto": the inline end on
   * a wide screen and the bottom on a narrow one. */
  placement?: "end" | "bottom" | "auto";
};

/** Holds the scroll of the page shell around it for as long as it is
 * mounted: from an overlay's opening to the end of its exit. */
function LockPageScroll() {
  const lock = useContext(PageScrollLock);
  useEffect(() => lock?.(), [lock]);
  return null;
}

/** The modal frame every overlay here shares. React Aria's ModalOverlay
 * traps focus inside, locks the document's scroll, closes on Escape and
 * hides the rest of the page from assistive technology while it is open;
 * inside a PageShell, whose region scrolls instead of the document, the
 * region is locked too. */
function Overlay({
  trigger,
  isOpen,
  defaultOpen,
  onOpenChange,
  isDismissable,
  overlayClassName = "stoa-overlay",
  modalClassName,
  children,
}: OverlayOpenProps & { isDismissable: boolean; overlayClassName?: string; modalClassName: string; children: ReactNode }) {
  if (!trigger) {
    return (
      <ModalOverlay
        className={overlayClassName}
        isDismissable={isDismissable}
        isOpen={isOpen}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        <Modal className={modalClassName}>
          <LockPageScroll />
          {children}
        </Modal>
      </ModalOverlay>
    );
  }
  return (
    <DialogTrigger isOpen={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger}
      <ModalOverlay className={overlayClassName} isDismissable={isDismissable}>
        <Modal className={modalClassName}>
          <LockPageScroll />
          {children}
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

/** Where focus goes when the dialog closes, when React Aria leaves it on
 * the page's body: React Aria returns it to whatever had it when the
 * dialog opened, and gives up when that is gone or was the body itself.
 * Then the trigger takes it, if the dialog has one (a dialog open from
 * the start had no opener), else the tab stop that stands where the
 * opener was (a confirmation opened from a control that its own press
 * removed). `inside` is any element of the dialog. */
function useReturnFocus(inside: RefObject<HTMLElement | null>) {
  // Read during the first render, before React removes anything: the
  // opener may leave the document in the same commit that opens the
  // dialog.
  const [opener] = useState<FocusPlace | null>(() => {
    if (typeof document === "undefined") return null;
    const active = document.activeElement;
    return active && active !== document.body ? placeOf(active) : null;
  });
  useLayoutEffect(() => {
    const el = inside.current;
    if (!el) return;
    const doc = el.ownerDocument;
    const view = doc.defaultView ?? window;
    const dialog = el.closest('[role="dialog"], [role="alertdialog"]');
    const trigger = dialog?.id ? doc.querySelector<HTMLElement>(`[aria-controls="${view.CSS.escape(dialog.id)}"]`) : null;
    return () => {
      // React Aria restores focus a frame after the dialog goes; look one
      // frame later, and only when the focus is still lost.
      view.requestAnimationFrame(() =>
        view.requestAnimationFrame(() => {
          if (!focusLost(doc)) return;
          if (trigger?.isConnected) trigger.focus();
          else if (opener) tabStopAt(opener)?.focus();
        }),
      );
    };
  }, [inside, opener]);
}

function ReturnFocus({ inside }: { inside: RefObject<HTMLElement | null> }) {
  useReturnFocus(inside);
  return null;
}

/** Title, close button, body and actions, inside React Aria's Dialog,
 * which labels the dialog with its heading. */
function DialogContent({ title, children, actions }: ContentProps) {
  const { messages } = useStoaFormat();
  const header = useRef<HTMLDivElement>(null);
  useReturnFocus(header);
  return (
    <AriaDialog className="stoa-dialog">
      {({ close }) => (
        <>
          <div ref={header} className="stoa-dialog__header">
            <Heading slot="title" level={2} className="stoa-dialog__title">
              {title}
            </Heading>
            <Button className="stoa-dialog__close" aria-label={messages.close} onPress={close}>
              <span aria-hidden="true">×</span>
            </Button>
          </div>
          <div className="stoa-dialog__body">{children}</div>
          {actions && <div className="stoa-dialog__actions">{typeof actions === "function" ? actions(close) : actions}</div>}
        </>
      )}
    </AriaDialog>
  );
}

/** A modal dialog: a title that names it, a body, optional actions and a
 * close button with the locale's word for "Close". Escape closes it, Tab
 * stays inside it, the page behind does not scroll, and focus returns to
 * the trigger on close. */
export function Dialog({ title, children, actions, isDismissable = true, ...open }: DialogProps) {
  return (
    <Overlay {...open} isDismissable={isDismissable} modalClassName="stoa-modal">
      <DialogContent title={title} actions={actions}>
        {children}
      </DialogContent>
    </Overlay>
  );
}

/** A Dialog drawn as a side panel from the inline end, or as a bottom
 * sheet; it behaves exactly as a Dialog does. */
export function Sheet({ title, children, actions, isDismissable = true, placement = "auto", ...open }: SheetProps) {
  return (
    <Overlay
      {...open}
      isDismissable={isDismissable}
      overlayClassName={`stoa-overlay stoa-overlay--sheet stoa-overlay--${placement}`}
      modalClassName={`stoa-modal stoa-sheet stoa-sheet--${placement}`}
    >
      <DialogContent title={title} actions={actions}>
        {children}
      </DialogContent>
    </Overlay>
  );
}

export type AlertDialogProps = OverlayOpenProps & {
  title: ReactNode;
  /** What will happen, and what cannot be taken back. */
  children: ReactNode;
  /** The primary action's label: a verb for what it does ("Delete run"),
   * not "OK". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Called when the person declines: the safe action or Escape. Not when
   * the primary action closes the dialog, and not when the caller closes
   * it by setting `isOpen`. */
  onCancel?: () => void;
  /** "destructive" draws the primary action in the negative colour, for an
   * action that loses work; "neutral" in the accent. */
  tone?: "destructive" | "neutral";
  /** The safe action's label; the locale's "Cancel" by default. */
  cancelLabel?: string;
  /** The action focused when the dialog opens: the safe one by default, so
   * an Enter pressed by habit does not confirm. */
  autoFocus?: "cancel" | "confirm";
};

/** A confirmation that interrupts: role alertdialog, a safe action and a
 * primary one, focus on the safe action by default. A press outside does
 * not close it; Escape and the safe action do, and call `onCancel`. */
export function AlertDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "neutral",
  cancelLabel,
  autoFocus = "cancel",
  ...open
}: AlertDialogProps) {
  const { messages } = useStoaFormat();
  // Set by the primary action just before it closes the dialog, so the
  // close that follows is not taken for a cancel.
  const confirmed = useRef(false);
  const header = useRef<HTMLDivElement>(null);
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (!confirmed.current) onCancel?.();
      confirmed.current = false;
    }
    open.onOpenChange?.(isOpen);
  };
  return (
    <Overlay {...open} onOpenChange={onOpenChange} isDismissable={false} modalClassName="stoa-modal stoa-modal--alert">
      <AriaDialog className="stoa-dialog" role="alertdialog">
        {({ close }) => (
          <>
            <div ref={header} className="stoa-dialog__header">
              <Heading slot="title" level={2} className="stoa-dialog__title">
                {title}
              </Heading>
            </div>
            <div className="stoa-dialog__body">{children}</div>
            <div className="stoa-dialog__actions">
              <Button autoFocus={autoFocus === "cancel"} onPress={close}>
                {cancelLabel ?? messages.cancel}
              </Button>
              <Button
                variant={tone === "destructive" ? "danger" : "primary"}
                autoFocus={autoFocus === "confirm"}
                onPress={() => {
                  confirmed.current = true;
                  onConfirm();
                  close();
                }}
              >
                {confirmLabel}
              </Button>
            </div>
            {/* After the header, so its ref is set when this mounts. */}
            <ReturnFocus inside={header} />
          </>
        )}
      </AriaDialog>
    </Overlay>
  );
}
