type Suppression = { count: number; touchAction: string; userSelect: string };

const suppressed = new WeakMap<HTMLElement, Suppression>();

/**
 * Turns off native touch scrolling and text selection on `element`, which would fight a drag. Returns a
 * function that restores the inline styles from before the first of any overlapping calls.
 */
export function suppressNativeGestures(element: HTMLElement): () => void {
  let entry = suppressed.get(element);
  if (!entry) {
    entry = { count: 0, touchAction: element.style.touchAction, userSelect: element.style.userSelect };
    suppressed.set(element, entry);
    element.style.touchAction = 'none';
    element.style.userSelect = 'none';
  }
  entry.count++;

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    const current = suppressed.get(element)!;
    if (--current.count > 0) return;
    element.style.touchAction = current.touchAction;
    element.style.userSelect = current.userSelect;
    suppressed.delete(element);
  };
}
