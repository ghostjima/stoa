// Whether one of Stoa's modal overlays (Dialog, Sheet, AlertDialog) is
// open in the page, for what must step out of its way while it is: the
// toast region, which React Aria keeps above everything else.
import { useLayoutEffect, useSyncExternalStore } from "react";

let open = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Counts a modal overlay as open for as long as it is mounted, from its
 * opening to the end of its exit. Rendered inside the overlay. */
export function ModalLayerMark() {
  useLayoutEffect(() => {
    open += 1;
    emit();
    return () => {
      open -= 1;
      emit();
    };
  }, []);
  return null;
}

/** True while any of Stoa's modal overlays is open. */
export function useModalOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open > 0,
    () => false,
  );
}
