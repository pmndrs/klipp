import { degreesToRadians } from 'math';

import { isInsideInteractiveArea, type InteractiveArea } from './isInsideInteractiveArea';
import { dominantGesture } from './touch';

/** Safari's trackpad pinch and rotate, summed per frame. Pinches on a touch screen are left to `touch`. */
export type SafariGestureState = {
  /** Pinch this frame, as the change in `ln(scale)`. Spreading is positive. */
  pinchDelta: number;
  /** Rotation this frame, in radians. */
  twistDelta: number;
  /** Only gestures that start inside this normalized region count. */
  interactiveArea: InteractiveArea | null;
  /** Each gesture keeps only the stronger of pinch and twist. */
  lockTouchAxis: boolean;
  /** Keep the gesture from zooming the page. */
  preventPageZoom: boolean;
  /** Internal. */
  pending: {
    pinchDelta: number;
    twistDelta: number;
    active: boolean;
    scale: number;
    rotationDegrees: number;
    twistTotalDegrees: number;
    axisLock: 'pinch' | 'twist' | null;
    /** Touch pointers down on the element, which iOS also reports as gestures. */
    touchIds: number[];
    touchCount: number;
  };
};

// Not part of the standard DOM types.
type GestureEvent = Event & { scale: number; rotation: number; clientX: number; clientY: number };

export const create = (): SafariGestureState => ({
  pinchDelta: 0,
  twistDelta: 0,
  interactiveArea: null,
  lockTouchAxis: false,
  preventPageZoom: true,
  pending: {
    pinchDelta: 0,
    twistDelta: 0,
    active: false,
    scale: 1,
    rotationDegrees: 0,
    twistTotalDegrees: 0,
    axisLock: null,
    touchIds: [],
    touchCount: 0,
  },
});

/** Listens to `element`'s Safari gesture events. Returns a function that stops. */
export function connect(state: SafariGestureState, element: HTMLElement, onInput?: () => void): () => void {
  const pending = state.pending;

  const end = (): void => {
    pending.active = false;
  };
  const liftAll = (): void => {
    end();
    pending.touchIds.fill(-1);
    pending.touchCount = 0;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' || pending.touchIds.indexOf(event.pointerId) !== -1) return;
    pending.touchIds[pending.touchCount++] = event.pointerId;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    const index = pending.touchIds.indexOf(event.pointerId);
    if (index === -1 || index >= pending.touchCount) return;
    pending.touchIds[index] = pending.touchIds[--pending.touchCount];
    pending.touchIds[pending.touchCount] = -1;
  };

  const onGestureStart = (event: Event): void => {
    const gesture = event as GestureEvent;
    if (!isInsideInteractiveArea(element, state.interactiveArea, gesture.clientX, gesture.clientY)) return;
    if (event.cancelable && state.preventPageZoom) event.preventDefault();
    if (pending.touchCount > 0) return;
    pending.active = true;
    pending.scale = gesture.scale;
    pending.rotationDegrees = gesture.rotation;
    pending.twistTotalDegrees = 0;
    pending.axisLock = null;
  };

  const onGestureChange = (event: Event): void => {
    if (!pending.active) return;
    const gesture = event as GestureEvent;
    if (event.cancelable && state.preventPageZoom) event.preventDefault();
    // A finger may land after the gesture started, depending on event order.
    if (pending.touchCount > 0) {
      end();
      return;
    }
    const pinchStep = Math.log(gesture.scale / pending.scale);
    const rotationStep = gesture.rotation - pending.rotationDegrees;
    pending.scale = gesture.scale;
    pending.rotationDegrees = gesture.rotation;
    pending.twistTotalDegrees += rotationStep;

    // `scale` already counts from the start of the gesture.
    if (state.lockTouchAxis && !pending.axisLock) {
      pending.axisLock = dominantGesture(gesture.scale - 1, pending.twistTotalDegrees);
    }
    if (pending.axisLock !== 'twist') pending.pinchDelta += pinchStep;
    if (pending.axisLock !== 'pinch') pending.twistDelta += degreesToRadians(rotationStep);
    onInput?.();
  };

  const onVisibilityChange = (): void => {
    if (document.hidden) liftAll();
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  element.addEventListener('lostpointercapture', onPointerUp);
  element.addEventListener('gesturestart', onGestureStart);
  element.addEventListener('gesturechange', onGestureChange);
  element.addEventListener('gestureend', end);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', liftAll);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
    element.removeEventListener('lostpointercapture', onPointerUp);
    element.removeEventListener('gesturestart', onGestureStart);
    element.removeEventListener('gesturechange', onGestureChange);
    element.removeEventListener('gestureend', end);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', liftAll);
    liftAll();
  };
}

/** Starts a new frame: the input gathered since the last call becomes this frame's. */
export function update(state: SafariGestureState): void {
  state.pinchDelta = state.pending.pinchDelta;
  state.twistDelta = state.pending.twistDelta;
  state.pending.pinchDelta = 0;
  state.pending.twistDelta = 0;
}
