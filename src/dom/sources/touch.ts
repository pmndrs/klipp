import { deltaAngle, radiansToDegrees, type Vec2 } from 'math';

import { isInsideInteractiveArea, type InteractiveArea } from './isInsideInteractiveArea';
import { suppressNativeGestures } from './suppressNativeGestures';

export type FingerCount = 'one' | 'two' | 'three';

/** Up to three fingers: their movement per finger count, and two-finger pinch and twist, summed per frame. */
export type TouchState = {
  /** Fingers down, up to three. */
  fingers: number;
  /** Movement this frame of the fingers' center, by how many were down at the time, in pixels. */
  readonly drag: Record<FingerCount, Vec2>;
  /** Change in the distance between two fingers this frame, in pixels. */
  pinchDelta: number;
  /** Two-finger rotation this frame, in radians. */
  twistDelta: number;
  /** Only touches that start inside this normalized region count. */
  interactiveArea: InteractiveArea | null;
  /** Each two-finger gesture keeps only the stronger of pinch and twist. */
  lockTouchAxis: boolean;
  /** Internal. */
  pending: TouchPending;
};

type Finger = { id: number; x: number; y: number };

type TouchPending = {
  drag: Record<FingerCount, Vec2>;
  pinchDelta: number;
  twistDelta: number;
  /** The first `count` are down, in the order they touched. */
  fingers: [Finger, Finger, Finger];
  count: number;
  /** Two-finger gesture, measured from when the current pair formed. */
  distance: number;
  angle: number;
  startDistance: number;
  twistTotal: number;
  axisLock: 'pinch' | 'twist' | null;
};

/** How many degrees of twist weigh as much as doubling the pinch distance, when choosing one. */
const SCALE_ANGLE_RATIO_INTENT_DEG = 30;

export const create = (): TouchState => ({
  fingers: 0,
  drag: { one: [0, 0], two: [0, 0], three: [0, 0] },
  pinchDelta: 0,
  twistDelta: 0,
  interactiveArea: null,
  lockTouchAxis: false,
  pending: {
    drag: { one: [0, 0], two: [0, 0], three: [0, 0] },
    pinchDelta: 0,
    twistDelta: 0,
    fingers: [
      { id: 0, x: 0, y: 0 },
      { id: 0, x: 0, y: 0 },
      { id: 0, x: 0, y: 0 },
    ],
    count: 0,
    distance: 0,
    angle: 0,
    startDistance: 0,
    twistTotal: 0,
    axisLock: null,
  },
});

function indexOf(pending: TouchPending, id: number): number {
  for (let i = 0; i < pending.count; i++) if (pending.fingers[i].id === id) return i;
  return -1;
}

/** Starts a fresh two-finger gesture from where the first two fingers are now. */
function resetPair(pending: TouchPending): void {
  if (pending.count < 2) return;
  const [a, b] = pending.fingers;
  pending.distance = Math.hypot(b.x - a.x, b.y - a.y);
  pending.angle = Math.atan2(b.y - a.y, b.x - a.x);
  pending.startDistance = pending.distance;
  pending.twistTotal = 0;
  pending.axisLock = null;
}

function moveCenter(drag: Vec2, count: number, moving: Finger, x: number, y: number): void {
  drag[0] += (x - moving.x) / count;
  drag[1] += (y - moving.y) / count;
  moving.x = x;
  moving.y = y;
}

function movePair(state: TouchState, moving: Finger, x: number, y: number): void {
  const pending = state.pending;
  moveCenter(pending.drag.two, 2, moving, x, y);

  const [a, b] = pending.fingers;
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const pinchStep = distance - pending.distance;
  pending.distance = distance;

  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const twistStep = deltaAngle(pending.angle, angle);
  pending.angle = angle;
  pending.twistTotal += twistStep;

  // Decided once per gesture, so a later move leaning the other way doesn't flip it.
  if (state.lockTouchAxis && !pending.axisLock) {
    const scaleFraction = distance / pending.startDistance - 1;
    const intent =
      Math.abs(scaleFraction) * SCALE_ANGLE_RATIO_INTENT_DEG - Math.abs(radiansToDegrees(pending.twistTotal));
    if (intent < 0) pending.axisLock = 'twist';
    else if (intent > 0) pending.axisLock = 'pinch';
  }

  if (pending.axisLock !== 'twist') pending.pinchDelta += pinchStep;
  if (pending.axisLock !== 'pinch') pending.twistDelta += twistStep;
}

/** Listens to `element`'s touches. Returns a function that stops. */
export function connect(state: TouchState, element: HTMLElement, onInput?: () => void): () => void {
  const pending = state.pending;

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    if (!isInsideInteractiveArea(element, state.interactiveArea, event.clientX, event.clientY)) return;
    // A fourth finger, or a repeat of one already down, is ignored.
    if (pending.count === 3 || indexOf(pending, event.pointerId) !== -1) return;
    const finger = pending.fingers[pending.count++];
    finger.id = event.pointerId;
    finger.x = event.clientX;
    finger.y = event.clientY;
    if (pending.count === 2) resetPair(pending);
    try {
      element.setPointerCapture(event.pointerId);
    } catch {}
    onInput?.();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    const index = indexOf(pending, event.pointerId);
    if (index === -1) return;
    const moving = pending.fingers[index];
    if (pending.count === 3) moveCenter(pending.drag.three, 3, moving, event.clientX, event.clientY);
    else if (pending.count === 2) movePair(state, moving, event.clientX, event.clientY);
    else moveCenter(pending.drag.one, 1, moving, event.clientX, event.clientY);
    onInput?.();
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    const index = indexOf(pending, event.pointerId);
    if (index === -1) return;
    // The remaining fingers move down a slot and carry on from where they are, so nothing jumps.
    const lifted = pending.fingers[index];
    for (let i = index; i < pending.count - 1; i++) pending.fingers[i] = pending.fingers[i + 1];
    pending.fingers[--pending.count] = lifted;
    resetPair(pending);
    onInput?.();
  };

  const liftAll = (): void => {
    pending.count = 0;
  };
  const onVisibilityChange = (): void => {
    if (document.hidden) liftAll();
  };

  const restoreStyles = suppressNativeGestures(element);
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  element.addEventListener('lostpointercapture', onPointerUp);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', liftAll);

  return () => {
    restoreStyles();
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
    element.removeEventListener('lostpointercapture', onPointerUp);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', liftAll);
    liftAll();
  };
}

const copyAndZero = (out: Vec2, source: Vec2): void => {
  out[0] = source[0];
  out[1] = source[1];
  source[0] = 0;
  source[1] = 0;
};

/** Starts a new frame: the input gathered since the last call becomes this frame's. */
export function update(state: TouchState): void {
  const pending = state.pending;
  state.fingers = pending.count;
  copyAndZero(state.drag.one, pending.drag.one);
  copyAndZero(state.drag.two, pending.drag.two);
  copyAndZero(state.drag.three, pending.drag.three);
  state.pinchDelta = pending.pinchDelta;
  state.twistDelta = pending.twistDelta;
  pending.pinchDelta = 0;
  pending.twistDelta = 0;
}
