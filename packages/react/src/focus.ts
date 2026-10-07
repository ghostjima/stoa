// Where focus goes when the element that has it is removed: to the tab
// stop that now stands where it was, never to the page's body, from which
// the next Tab starts again at the top of the page.

/** What takes focus from the keyboard, before checking its tabindex. */
export const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, summary, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]';

/** How long keepFocusInPlace waits for the element to go before it stops
 * watching, in milliseconds. */
const WATCH_MS = 10_000;

/** Where an element was: each of its ancestors, nearest first, with the
 * node just before the branch that held it. */
export type FocusPlace = { parent: Element; before: Node | null }[];

export function placeOf(element: Element): FocusPlace {
  const place: FocusPlace = [];
  for (let node: Element = element; node.parentElement; node = node.parentElement) {
    place.push({ parent: node.parentElement, before: node.previousSibling });
  }
  return place;
}

/** A tab stop: focusable from the keyboard, and drawn. */
function isTabStop(el: HTMLElement): boolean {
  if (el.tabIndex < 0 || el.closest("[inert], [hidden], [aria-hidden='true']")) return false;
  // jsdom has no layout and no checkVisibility; there, anything not hidden counts.
  return typeof el.checkVisibility === "function" ? el.checkVisibility({ visibilityProperty: true }) : true;
}

/** The tab stop that stands at `place` now: the first one after it in the
 * document, else the last one before it, else the nearest focusable
 * ancestor (a main region with tabindex -1, for example). Inside a dialog,
 * only the dialog's own. An ancestor that is itself a tab stop, and holds
 * no tab stop after the place, is where the element was: a grid's active
 * cell whose editor closed takes the focus back, rather than the first
 * tab stop after the grid. Null when there is none. */
export function tabStopAt(place: FocusPlace): HTMLElement | null {
  for (const { parent, before } of place) {
    if (!parent.isConnected) continue;
    const from = before && before.parentNode === parent ? before : null;
    const scope = parent.closest('[role="dialog"], [role="alertdialog"]') ?? parent.ownerDocument.body;
    const stops = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isTabStop);
    const after = (el: HTMLElement) => {
      if (!from) return (parent.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const position = from.compareDocumentPosition(el);
      return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && (position & Node.DOCUMENT_POSITION_CONTAINED_BY) === 0;
    };
    const next = stops.find(after);
    if (next && parent.contains(next)) return next;
    if (isTabStop(parent as HTMLElement)) return parent as HTMLElement;
    if (next) return next;
    const previous = stops.filter((el) => !after(el)).pop();
    if (previous) return previous;
    return parent.closest<HTMLElement>("[tabindex]");
  }
  return null;
}

/** Whether the focus has been lost: it is on the body, or nowhere. */
export function focusLost(doc: Document): boolean {
  const active = doc.activeElement;
  return !active || active === doc.body || !active.isConnected;
}

/**
 * For an action that removes the element that has the focus, or holds it:
 * call this with the element before removing it (from the press handler,
 * before the state change). Once the element has left the document, and
 * only if the focus went with it, the focus moves to the tab stop that
 * now stands where it was: the next one after it, else the one before
 * it. A toolbar that closes after its Apply, a row deleted from its own
 * button, a notice dismissed: without this the focus falls to the page's
 * body and the next Tab starts again at the top of the page.
 *
 * Stoa's own components do this where they remove themselves (a
 * dismissed Callout); a Dialog, Sheet or AlertDialog returns focus to its
 * trigger, or to where its opener was.
 */
export function keepFocusInPlace(element: Element): void {
  const doc = element.ownerDocument;
  const place = placeOf(element);
  const View = doc.defaultView;
  if (!View || typeof View.MutationObserver !== "function") return;
  const observer = new View.MutationObserver(() => {
    if (element.isConnected) return;
    stop();
    if (focusLost(doc)) tabStopAt(place)?.focus();
  });
  const timer = View.setTimeout(() => stop(), WATCH_MS);
  const stop = () => {
    observer.disconnect();
    View.clearTimeout(timer);
  };
  observer.observe(doc, { childList: true, subtree: true });
}

/** Where the focus goes after an action: an element, the id of one, or a
 * function that finds it (called again as the page changes, so it can
 * name an element that is not drawn yet). */
export type FocusTarget = HTMLElement | string | (() => HTMLElement | null | undefined);

/**
 * For an action that leads somewhere else (Back to a list, from a record
 * the list opened): call this with where the focus should land, before
 * the state change, from the press handler. The target takes the focus as
 * soon as it is in the document and can take it, even if it is drawn
 * only after the change (a list that comes back in place of the record).
 * Until then, if the control that had the focus (`from`, by default the
 * focused element) leaves the document, the focus goes to the tab stop
 * that stands where it was, as with keepFocusInPlace, and the target takes
 * it from there when it arrives. Watching stops once the target has the
 * focus, once the person or the application puts the focus anywhere else,
 * or after ten seconds. The focus never falls to the page's body to stay.
 */
export function focusWhenReady(target: FocusTarget, from: Element | null = document.activeElement): void {
  const doc = target instanceof HTMLElement ? target.ownerDocument : (from?.ownerDocument ?? document);
  const View = doc.defaultView;
  const place = from && from !== doc.body ? placeOf(from) : null;
  /** Where the focus was put while the target was not there yet. */
  let stand: HTMLElement | null = null;
  const resolve = (): HTMLElement | null => {
    const found = typeof target === "string" ? doc.getElementById(target) : typeof target === "function" ? target() : target;
    return found && found.isConnected ? found : null;
  };
  /** Whether the focus is still ours to move: lost, or on the control
   * that started the action, or where it was put while waiting. */
  const ours = () => focusLost(doc) || doc.activeElement === from || (stand !== null && doc.activeElement === stand);
  /** True when the watching is over. */
  const step = (): boolean => {
    if (!ours()) return true;
    const el = resolve();
    if (el) {
      el.focus();
      if (doc.activeElement === el) return true;
    }
    if (focusLost(doc) && place) {
      stand = tabStopAt(place);
      stand?.focus();
    }
    return false;
  };
  if (step() || !View || typeof View.MutationObserver !== "function") return;
  const observer = new View.MutationObserver(() => {
    if (step()) stop();
  });
  const timer = View.setTimeout(() => stop(), WATCH_MS);
  const stop = () => {
    observer.disconnect();
    View.clearTimeout(timer);
  };
  // Attributes too: a target that is in the document but hidden (inert,
  // `hidden`, a class) can take the focus once it is shown.
  observer.observe(doc, { childList: true, subtree: true, attributes: true });
}
