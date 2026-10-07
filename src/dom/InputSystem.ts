import { degreesToRadians } from 'math';

import type { ConsumedInput } from '../core/input/consumedInput';

import * as mouse from './sources/mouse';
import * as touch from './sources/touch';
import * as wheel from './sources/wheel';
import { isInsideInteractiveArea, type InteractiveArea } from './sources/isInsideInteractiveArea';

export type { InteractiveArea } from './sources/isInsideInteractiveArea';

export const MouseButton = {
  left: 1,
  right: 2,
  middle: 4,
} as const;

// Safari/WebKit's non-standard trackpad gesture event is not included in DOM types.
type WebKitGestureEvent = Event & {
  scale: number;
  rotation: number;
  clientX: number;
  clientY: number;
  cancelable: boolean;
};

const SCALE_ANGLE_RATIO_INTENT_DEG = 30;

/** Buffers raw pointer and wheel input from a DOM element. */
export class InputSystem {
  readonly mouse = mouse.create();
  readonly touch = touch.create();
  readonly wheel = wheel.create();

  private _interactiveArea: InteractiveArea | null = null;
  private element: HTMLElement | null = null;
  private disconnectSources: (() => void) | null = null;

  private gestureActive = false;
  private lastGestureScale = 1;
  private lastGestureRotationDeg = 0;
  private gestureRotateTotalDeg = 0;
  private gestureAxisLock: 'pinch' | 'rotate' | null = null;
  private gestureZoomDelta = 0;
  private gestureRotateDelta = 0;

  /** Suppress the native right-click menu. */
  get suppressContextMenu(): boolean {
    return this.mouse.suppressContextMenu;
  }

  set suppressContextMenu(suppress: boolean) {
    this.mouse.suppressContextMenu = suppress;
  }

  /** Restrict gesture starts to a normalized region. */
  get interactiveArea(): InteractiveArea | null {
    return this._interactiveArea;
  }

  set interactiveArea(area: InteractiveArea | null) {
    this._interactiveArea = area;
    this.mouse.interactiveArea = area;
    this.touch.interactiveArea = area;
    this.wheel.interactiveArea = area;
  }

  /** Lock diagonal two-finger input to pinch or rotation. */
  get lockTouchAxis(): boolean {
    return this.touch.lockTouchAxis;
  }

  set lockTouchAxis(lock: boolean) {
    this.touch.lockTouchAxis = lock;
  }

  /** Attaches listeners to `element`. Safe to call again with a new element - disconnects the old one first. */
  connect = (element: HTMLElement): void => {
    this.disconnect();
    this.element = element;
    const disconnectMouse = mouse.connect(this.mouse, element);
    const disconnectTouch = touch.connect(this.touch, element);
    const disconnectWheel = wheel.connect(this.wheel, element);
    this.disconnectSources = () => {
      disconnectMouse();
      disconnectTouch();
      disconnectWheel();
    };
    element.addEventListener('gesturestart', this.onGestureStart as EventListener);
    element.addEventListener('gesturechange', this.onGestureChange as EventListener);
    element.addEventListener('gestureend', this.onGestureEnd);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  };

  disconnect = (): void => {
    if (!this.element) return;
    this.disconnectSources?.();
    this.disconnectSources = null;
    this.element.removeEventListener('gesturestart', this.onGestureStart as EventListener);
    this.element.removeEventListener('gesturechange', this.onGestureChange as EventListener);
    this.element.removeEventListener('gestureend', this.onGestureEnd);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    // Keep the pointer lock: it belongs to the document and can outlive this connection, for example across a
    // hand-off to another virtual camera. Release it with exitPointerLock().
    this.element = null;
    this.gestureActive = false;
  };

  requestPointerLock = (): void => {
    this.element?.requestPointerLock();
  };

  exitPointerLock = (): void => {
    if (document.pointerLockElement === this.element) document.exitPointerLock();
  };

  consume = (out: ConsumedInput): ConsumedInput => {
    mouse.update(this.mouse);
    touch.update(this.touch);
    wheel.update(this.wheel);
    const { drag, buttons, lockedMovement } = this.mouse;
    out.leftDx = drag.left[0];
    out.leftDy = drag.left[1];
    out.middleDx = drag.middle[0];
    out.middleDy = drag.middle[1];
    out.rightDx = drag.right[0];
    out.rightDy = drag.right[1];
    out.lockedDx = lockedMovement[0];
    out.lockedDy = lockedMovement[1];
    out.leftHeld = buttons.pressed.has('left');
    out.middleHeld = buttons.pressed.has('middle');
    out.rightHeld = buttons.pressed.has('right');
    const touchState = this.touch;
    out.touchOneDx = touchState.drag.one[0];
    out.touchOneDy = touchState.drag.one[1];
    out.touchTwoDx = touchState.drag.two[0];
    out.touchTwoDy = touchState.drag.two[1];
    out.touchThreeDx = touchState.drag.three[0];
    out.touchThreeDy = touchState.drag.three[1];
    out.touchPinchDelta = touchState.pinchDelta;
    out.touchRotateDelta = touchState.twistDelta + this.gestureRotateDelta;
    out.touchOneHeld = touchState.fingers === 1;
    out.touchTwoHeld = touchState.fingers === 2;
    out.touchThreeHeld = touchState.fingers === 3;
    out.wheelDeltaX = this.wheel.deltaX;
    out.wheelDeltaY = this.wheel.deltaY;
    out.wheelZoomDelta = this.wheel.zoomDelta;
    out.gestureZoomDelta = this.gestureZoomDelta;
    this.gestureZoomDelta = 0;
    this.gestureRotateDelta = 0;
    return out;
  };

  /** Whether `clientX/Y` falls within `interactiveArea` - always `true` once Pointer Lock is active on
   *  this element, since `clientX/Y` then freezes at the lock-engage position, meaningless as a "where". */
  isInsideInteractiveArea(clientX: number, clientY: number): boolean {
    if (!this.element) return true;
    return isInsideInteractiveArea(this.element, this._interactiveArea, clientX, clientY);
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) this.gestureActive = false;
  };

  private onGestureStart = (event: WebKitGestureEvent): void => {
    if (!this.isInsideInteractiveArea(event.clientX, event.clientY)) return;
    if (event.cancelable) event.preventDefault();
    this.gestureActive = true;
    this.lastGestureScale = event.scale;
    this.lastGestureRotationDeg = event.rotation;
    this.gestureRotateTotalDeg = 0;
    this.gestureAxisLock = null;
  };

  private onGestureChange = (event: WebKitGestureEvent): void => {
    if (!this.gestureActive) return;
    if (event.cancelable) event.preventDefault();
    const zoomStepDelta = event.scale - this.lastGestureScale;
    const rotateStepDeg = event.rotation - this.lastGestureRotationDeg;
    this.lastGestureScale = event.scale;
    this.lastGestureRotationDeg = event.rotation;
    this.gestureRotateTotalDeg += rotateStepDeg;

    // same formula as touch's axis-intent lock, but scaleFraction is already relative to
    // gesture start (WebKit's own `scale`) and rotation never needs unwrapping (WebKit tracks it continuously)
    if (this.lockTouchAxis && !this.gestureAxisLock) {
      const scaleFraction = event.scale - 1;
      const intent = Math.abs(scaleFraction) * SCALE_ANGLE_RATIO_INTENT_DEG - Math.abs(this.gestureRotateTotalDeg);
      if (intent < 0) this.gestureAxisLock = 'rotate';
      else if (intent > 0) this.gestureAxisLock = 'pinch';
    }

    if (this.gestureAxisLock !== 'rotate') this.gestureZoomDelta += zoomStepDelta;
    if (this.gestureAxisLock !== 'pinch') this.gestureRotateDelta += degreesToRadians(rotateStepDeg);
  };

  private onGestureEnd = (): void => {
    this.gestureActive = false;
  };
}
