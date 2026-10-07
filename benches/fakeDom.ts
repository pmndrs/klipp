type Listener = (event: unknown) => void;

/** Something that keeps its listeners, so a bench can call them without a real DOM. */
class FakeTarget {
  readonly listeners = new Map<string, Listener[]>();

  addEventListener = (type: string, listener: Listener): void => {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  };

  removeEventListener = (type: string, listener: Listener): void => {
    const list = this.listeners.get(type);
    if (list)
      this.listeners.set(
        type,
        list.filter((other) => other !== listener),
      );
  };

  /** Calls every listener of `type` with `event`, like a dispatch without bubbling. */
  dispatch = (type: string, event: unknown): void => {
    const list = this.listeners.get(type);
    if (list) for (const listener of list) listener(event);
  };
}

/**
 * Installs a fake `document`, `window` and `WheelEvent` on `globalThis` and returns an element for sources to
 * connect to. Node has no DOM, so this is how input benches feed events.
 */
export function makeFakeDom(): { element: FakeTarget & HTMLElement; document: FakeTarget & Document } {
  const document = Object.assign(new FakeTarget(), { pointerLockElement: null, hidden: false });
  const window = new FakeTarget();
  const element = Object.assign(new FakeTarget(), {
    style: { touchAction: '', userSelect: '' },
    setPointerCapture: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  });
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.document = document;
  globals.window = window;
  globals.WheelEvent ??= { DOM_DELTA_PIXEL: 0, DOM_DELTA_LINE: 1, DOM_DELTA_PAGE: 2 };
  return {
    element: element as unknown as FakeTarget & HTMLElement,
    document: document as unknown as FakeTarget & Document,
  };
}
