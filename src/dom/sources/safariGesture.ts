import { degreesToRadians } from 'math';

import { isInsideInteractiveArea, type InteractiveArea } from './isInsideInteractiveArea';
import { dominantGesture } from './touch';

/** Safari's trackpad pinch and rotate, summed per frame. */
export type SafariGestureState = {
  /** Change in pinch scale this frame, where `1` is the scale at the start of the gesture. */
  scaleDelta: number;
  /** Rotation this frame, in radians. */
  twistDelta: number;
  /** Only gestures that start inside this normalized region count. */
  interactiveArea: InteractiveArea | null;
  /** Each gesture keeps only the stronger of pinch and twist. */
  lockTouchAxis: boolean;
  /** Internal. */
  pending: {
    scaleDelta: number;
    twistDelta: number;
    active: boolean;
    scale: number;
    rotationDegrees: number;
    twistTotalDegrees: number;
    axisLock: 'pinch' | 'twist' | null;
  };
};

// Not part of the standard DOM types.
type GestureEvent = Event & { scale: number; rotation: number; clientX: number; clientY: number };

export const create = (): SafariGestureState => ({
  scaleDelta: 0,
  twistDelta: 0,
  interactiveArea: null,
  lockTouchAxis: false,
  pending: {
    scaleDelta: 0,
    twistDelta: 0,
    active: false,
    scale: 1,
    rotationDegrees: 0,
    twistTotalDegrees: 0,
    axisLock: null,
  },
});

/** Listens to `element`'s Safari gesture events. Returns a function that stops. */
export function connect(state: SafariGestureState, element: HTMLElement, onInput?: () => void): () => void {
  const pending = state.pending;

  const onGestureStart = (event: Event): void => {
    const gesture = event as GestureEvent;
    if (!isInsideInteractiveArea(element, state.interactiveArea, gesture.clientX, gesture.clientY)) return;
    if (event.cancelable) event.preventDefault();
    pending.active = true;
    pending.scale = gesture.scale;
    pending.rotationDegrees = gesture.rotation;
    pending.twistTotalDegrees = 0;
    pending.axisLock = null;
  };

  const onGestureChange = (event: Event): void => {
    if (!pending.active) return;
    const gesture = event as GestureEvent;
    if (event.cancelable) event.preventDefault();
    const scaleStep = gesture.scale - pending.scale;
    const rotationStep = gesture.rotation - pending.rotationDegrees;
    pending.scale = gesture.scale;
    pending.rotationDegrees = gesture.rotation;
    pending.twistTotalDegrees += rotationStep;

    // `scale` already counts from the start of the gesture.
    if (state.lockTouchAxis && !pending.axisLock) {
      pending.axisLock = dominantGesture(gesture.scale - 1, pending.twistTotalDegrees);
    }
    if (pending.axisLock !== 'twist') pending.scaleDelta += scaleStep;
    if (pending.axisLock !== 'pinch') pending.twistDelta += degreesToRadians(rotationStep);
    onInput?.();
  };

  const end = (): void => {
    pending.active = false;
  };
  const onVisibilityChange = (): void => {
    if (document.hidden) end();
  };

  element.addEventListener('gesturestart', onGestureStart);
  element.addEventListener('gesturechange', onGestureChange);
  element.addEventListener('gestureend', end);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', end);

  return () => {
    element.removeEventListener('gesturestart', onGestureStart);
    element.removeEventListener('gesturechange', onGestureChange);
    element.removeEventListener('gestureend', end);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', end);
    end();
  };
}

/** Starts a new frame: the input gathered since the last call becomes this frame's. */
export function update(state: SafariGestureState): void {
  state.scaleDelta = state.pending.scaleDelta;
  state.twistDelta = state.pending.twistDelta;
  state.pending.scaleDelta = 0;
  state.pending.twistDelta = 0;
}
