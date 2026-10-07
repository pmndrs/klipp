import type { Vec2 } from 'math';

import * as buttonInput from './buttonInput';
import type { ButtonInput } from './buttonInput';
import { isInsideInteractiveArea, type InteractiveArea } from './isInsideInteractiveArea';
import { suppressNativeGestures } from './suppressNativeGestures';

export type MouseButton = 'left' | 'middle' | 'right';

/** Mouse buttons and movement, summed per frame. */
export type MouseState = {
  /** Which buttons are held, and which went down or up this frame. */
  readonly buttons: ButtonInput<MouseButton>;
  /** Movement this frame while each button was held, in pixels. */
  readonly drag: Record<MouseButton, Vec2>;
  /** Movement this frame while the pointer was locked with no button held. */
  readonly lockedMovement: Vec2;
  /** Whether the pointer is locked to the element. */
  locked: boolean;
  /** Only presses that start inside this normalized region count. */
  interactiveArea: InteractiveArea | null;
  /** Suppress the native right-click menu. */
  suppressContextMenu: boolean;
  /** Internal. */
  pending: MousePending;
};

type MousePending = {
  drag: Record<MouseButton, Vec2>;
  lockedMovement: Vec2;
  /** Button changes since the last update, in order, as `bit | (down ? DOWN : 0)`. */
  changes: number[];
  changeCount: number;
  /** `event.buttons` as of the last event. */
  held: number;
  pointerId: number | null;
  x: number;
  y: number;
  /** The next move sets the position instead of measuring from it, since it went stale. */
  reanchor: boolean;
};

const DOWN = 8;
const BITS = [1, 2, 4] as const;
const bits: Record<number, MouseButton> = { 1: 'left', 2: 'right', 4: 'middle' };

export const create = (): MouseState => ({
  buttons: buttonInput.create(),
  drag: { left: [0, 0], middle: [0, 0], right: [0, 0] },
  lockedMovement: [0, 0],
  locked: false,
  interactiveArea: null,
  suppressContextMenu: false,
  pending: {
    drag: { left: [0, 0], middle: [0, 0], right: [0, 0] },
    lockedMovement: [0, 0],
    changes: [],
    changeCount: 0,
    held: 0,
    pointerId: null,
    x: 0,
    y: 0,
    reanchor: false,
  },
});

/** Queues a press or release for every button that differs between the last event and `held`. */
function setHeld(pending: MousePending, held: number): void {
  for (const bit of BITS) {
    if ((pending.held & bit) === (held & bit)) continue;
    pending.changes[pending.changeCount++] = bit | (held & bit ? DOWN : 0);
  }
  pending.held = held;
}

function addDrag(pending: MousePending, buttons: number, dx: number, dy: number): void {
  for (const bit of BITS) {
    if ((buttons & bit) === 0) continue;
    const drag = pending.drag[bits[bit]];
    drag[0] += dx;
    drag[1] += dy;
  }
}

/** Listens to `element`'s mouse. Returns a function that stops; a pointer lock it holds stays. */
export function connect(state: MouseState, element: HTMLElement, onInput?: () => void): () => void {
  const pending = state.pending;
  const isLocked = () => document.pointerLockElement === element;

  const release = (): void => {
    pending.pointerId = null;
    setHeld(pending, 0);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    if (!isInsideInteractiveArea(element, state.interactiveArea, event.clientX, event.clientY)) return;
    if (pending.pointerId !== null && pending.pointerId !== event.pointerId) return;
    pending.pointerId = event.pointerId;
    pending.x = event.clientX;
    pending.y = event.clientY;
    setHeld(pending, event.buttons);
    try {
      element.setPointerCapture(event.pointerId);
    } catch {}
    onInput?.();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    if (pending.pointerId !== event.pointerId) {
      if (!isLocked()) return;
      pending.lockedMovement[0] += event.movementX;
      pending.lockedMovement[1] += event.movementY;
      onInput?.();
      return;
    }
    setHeld(pending, event.buttons);
    if (pending.reanchor) {
      pending.reanchor = false;
    } else if (isLocked()) {
      // clientX/Y stay frozen while locked.
      addDrag(pending, event.buttons, event.movementX, event.movementY);
    } else {
      addDrag(pending, event.buttons, event.clientX - pending.x, event.clientY - pending.y);
    }
    pending.x = event.clientX;
    pending.y = event.clientY;
    onInput?.();
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' || pending.pointerId !== event.pointerId) return;
    release();
    onInput?.();
  };

  const onContextMenu = (event: MouseEvent): void => {
    if (state.suppressContextMenu) event.preventDefault();
  };

  const onPointerLockChange = (): void => {
    const locked = isLocked();
    // The position froze while locked, so the first move after it would jump.
    if (state.locked && !locked && pending.pointerId !== null) pending.reanchor = true;
    state.locked = locked;
  };

  const onPointerLockError = (): void => {
    console.warn('requestPointerLock() failed - the browser rejected the request.');
  };

  // Without focus, the release may never arrive.
  const onBlur = (): void => release();
  const onVisibilityChange = (): void => {
    if (document.hidden) release();
  };

  const restoreStyles = suppressNativeGestures(element);
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  element.addEventListener('lostpointercapture', onPointerUp);
  element.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('pointerlockerror', onPointerLockError);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onBlur);
  // A lock can outlive a previous connection, and no event reports it again.
  state.locked = isLocked();

  return () => {
    restoreStyles();
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
    element.removeEventListener('lostpointercapture', onPointerUp);
    element.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('pointerlockerror', onPointerLockError);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onBlur);
    release();
    pending.reanchor = false;
    state.locked = false;
  };
}

const copyAndZero = (out: Vec2, source: Vec2): void => {
  out[0] = source[0];
  out[1] = source[1];
  source[0] = 0;
  source[1] = 0;
};

/** Starts a new frame: the input gathered since the last call becomes this frame's. */
export function update(state: MouseState): void {
  const pending = state.pending;
  buttonInput.clear(state.buttons);
  for (let i = 0; i < pending.changeCount; i++) {
    const change = pending.changes[i];
    const button = bits[change & ~DOWN];
    if (change & DOWN) buttonInput.press(state.buttons, button);
    else buttonInput.release(state.buttons, button);
  }
  pending.changeCount = 0;
  copyAndZero(state.drag.left, pending.drag.left);
  copyAndZero(state.drag.middle, pending.drag.middle);
  copyAndZero(state.drag.right, pending.drag.right);
  copyAndZero(state.lockedMovement, pending.lockedMovement);
}
