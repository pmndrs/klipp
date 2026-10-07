import { isInsideInteractiveArea, type InteractiveArea } from './isInsideInteractiveArea';

/** Wheel and trackpad scrolling, in pixels, summed per frame. */
export type WheelState = {
  /** Scroll since the last `update`. */
  deltaX: number;
  deltaY: number;
  /** Trackpad pinch since the last `update`. Browsers send it as a `ctrlKey` wheel with `deltaY = -100 * ln(scale)`. */
  zoomDelta: number;
  /** Only scrolls that start inside this normalized region count. */
  interactiveArea: InteractiveArea | null;
  /** Keep the page from scrolling under the element. */
  preventPageScroll: boolean;
  /** Keep a trackpad pinch from zooming the page. */
  preventPageZoom: boolean;
  /** Pixels per line, for wheels that report lines. */
  pixelsPerLine: number;
  /** Pixels per page, for wheels that report pages. */
  pixelsPerPage: number;
  /** Internal. */
  pendingX: number;
  pendingY: number;
  pendingZoom: number;
};

export const create = (): WheelState => ({
  deltaX: 0,
  deltaY: 0,
  zoomDelta: 0,
  interactiveArea: null,
  preventPageScroll: true,
  preventPageZoom: true,
  pixelsPerLine: 33,
  pixelsPerPage: 800,
  pendingX: 0,
  pendingY: 0,
  pendingZoom: 0,
});

const pixelsPerUnit = (state: WheelState, deltaMode: number): number =>
  deltaMode === WheelEvent.DOM_DELTA_LINE
    ? state.pixelsPerLine
    : deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? state.pixelsPerPage
      : 1;

/** Listens to `element`'s wheel. Returns a function that stops. */
export function connect(state: WheelState, element: HTMLElement, onInput?: () => void): () => void {
  const onWheel = (event: WheelEvent): void => {
    if (!isInsideInteractiveArea(element, state.interactiveArea, event.clientX, event.clientY)) return;
    if (event.ctrlKey ? state.preventPageZoom : state.preventPageScroll) event.preventDefault();
    const scale = pixelsPerUnit(state, event.deltaMode);
    if (event.ctrlKey) {
      state.pendingZoom += event.deltaY * scale;
    } else if (event.shiftKey && event.deltaX === 0) {
      // Most mice have one wheel and report shift+scroll on deltaY.
      state.pendingX += event.deltaY * scale;
    } else {
      state.pendingX += event.deltaX * scale;
      state.pendingY += event.deltaY * scale;
    }
    onInput?.();
  };
  element.addEventListener('wheel', onWheel, { passive: false });
  return () => element.removeEventListener('wheel', onWheel);
}

/** Starts a new frame: the scroll gathered since the last call becomes this frame's. */
export function update(state: WheelState): void {
  state.deltaX = state.pendingX;
  state.deltaY = state.pendingY;
  state.zoomDelta = state.pendingZoom;
  state.pendingX = 0;
  state.pendingY = 0;
  state.pendingZoom = 0;
}
