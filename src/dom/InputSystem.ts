import { degreesToRadians, deltaAngle, radiansToDegrees } from 'math';

import type { ConsumedInput } from '../core/input/consumedInput';

import * as mouse from './sources/mouse';
import * as wheel from './sources/wheel';
import { isInsideInteractiveArea, type InteractiveArea } from './sources/isInsideInteractiveArea';

export type { InteractiveArea } from './sources/isInsideInteractiveArea';

export const MouseButton = {
  left: 1,
  right: 2,
  middle: 4,
} as const;

type ActivePointer = {
  pointerId: number;
  x: number;
  y: number;
};

// Safari/WebKit's non-standard trackpad gesture event is not included in DOM types.
type WebKitGestureEvent = Event & {
  scale: number;
  rotation: number;
  clientX: number;
  clientY: number;
  cancelable: boolean;
};

function distanceBetween(a: ActivePointer, b: ActivePointer): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleBetween(a: ActivePointer, b: ActivePointer): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

const SCALE_ANGLE_RATIO_INTENT_DEG = 30;

/** Buffers raw pointer and wheel input from a DOM element. */
export class InputSystem {
  /** Lock diagonal two-finger input to pinch or rotation. */
  lockTouchAxis = false;

  readonly mouse = mouse.create();
  readonly wheel = wheel.create();

  private _interactiveArea: InteractiveArea | null = null;
  private element: HTMLElement | null = null;
  private disconnectSources: (() => void) | null = null;
  private touchPointer: ActivePointer | null = null;
  private touchPointer2: ActivePointer | null = null;
  private touchPointer3: ActivePointer | null = null;
  private touchPinchDistance = 0;
  private touchAngle = 0;
  private touchGestureStartDistance = 0;
  private touchGestureRotateTotal = 0;
  private touchAxisLock: 'pinch' | 'rotate' | null = null;

  private gestureActive = false;
  private lastGestureScale = 1;
  private lastGestureRotationDeg = 0;
  private gestureRotateTotalDeg = 0;
  private gestureAxisLock: 'pinch' | 'rotate' | null = null;

  private touchOneDx = 0;
  private touchOneDy = 0;
  private touchTwoDx = 0;
  private touchTwoDy = 0;
  private touchThreeDx = 0;
  private touchThreeDy = 0;
  private touchPinchDelta = 0;
  private touchRotateDelta = 0;
  private gestureZoomDelta = 0;

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
    this.wheel.interactiveArea = area;
  }

  /** Attaches listeners to `element`. Safe to call again with a new element - disconnects the old one first. */
  connect = (element: HTMLElement): void => {
    this.disconnect();
    this.element = element;
    const disconnectMouse = mouse.connect(this.mouse, element);
    const disconnectWheel = wheel.connect(this.wheel, element);
    this.disconnectSources = () => {
      disconnectMouse();
      disconnectWheel();
    };
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('gesturestart', this.onGestureStart as EventListener);
    element.addEventListener('gesturechange', this.onGestureChange as EventListener);
    element.addEventListener('gestureend', this.onGestureEnd);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  };

  disconnect = (): void => {
    if (!this.element) return;
    this.disconnectSources?.();
    this.disconnectSources = null;
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('gesturestart', this.onGestureStart as EventListener);
    this.element.removeEventListener('gesturechange', this.onGestureChange as EventListener);
    this.element.removeEventListener('gestureend', this.onGestureEnd);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    // Keep the pointer lock: it belongs to the document and can outlive this connection, for example across a
    // hand-off to another virtual camera. Release it with exitPointerLock().
    this.element = null;
    this.touchPointer = null;
    this.touchPointer2 = null;
    this.touchPointer3 = null;
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
    out.wheelDeltaX = this.wheel.deltaX;
    out.wheelDeltaY = this.wheel.deltaY;
    out.wheelZoomDelta = this.wheel.zoomDelta;
    out.touchOneDx = this.touchOneDx;
    out.touchOneDy = this.touchOneDy;
    out.touchTwoDx = this.touchTwoDx;
    out.touchTwoDy = this.touchTwoDy;
    out.touchThreeDx = this.touchThreeDx;
    out.touchThreeDy = this.touchThreeDy;
    out.touchPinchDelta = this.touchPinchDelta;
    out.touchRotateDelta = this.touchRotateDelta;
    out.gestureZoomDelta = this.gestureZoomDelta;
    out.touchOneHeld = this.touchPointer !== null && this.touchPointer2 === null;
    out.touchTwoHeld = this.touchPointer2 !== null && this.touchPointer3 === null;
    out.touchThreeHeld = this.touchPointer3 !== null;
    this.touchOneDx = 0;
    this.touchOneDy = 0;
    this.touchTwoDx = 0;
    this.touchTwoDy = 0;
    this.touchThreeDx = 0;
    this.touchThreeDy = 0;
    this.touchPinchDelta = 0;
    this.touchRotateDelta = 0;
    this.gestureZoomDelta = 0;
    return out;
  };

  /** Whether `clientX/Y` falls within `interactiveArea` - always `true` once Pointer Lock is active on
   *  this element, since `clientX/Y` then freezes at the lock-engage position, meaningless as a "where". */
  isInsideInteractiveArea(clientX: number, clientY: number): boolean {
    if (!this.element) return true;
    return isInsideInteractiveArea(this.element, this._interactiveArea, clientX, clientY);
  }

  // re-baselines touchPinchDelta/touchRotateDelta/lockTouchAxis for a fresh two-finger gesture -
  // called both when the second finger joins and when a third finger lifts back down to two
  private resetTwoFingerGestureState(): void {
    if (!this.touchPointer || !this.touchPointer2) return;
    this.touchPinchDistance = distanceBetween(this.touchPointer, this.touchPointer2);
    this.touchAngle = angleBetween(this.touchPointer, this.touchPointer2);
    this.touchGestureStartDistance = this.touchPinchDistance;
    this.touchGestureRotateTotal = 0;
    this.touchAxisLock = null;
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    if (!this.isInsideInteractiveArea(event.clientX, event.clientY)) return;
    if (!this.touchPointer) {
      this.touchPointer = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    } else if (!this.touchPointer2 && event.pointerId !== this.touchPointer.pointerId) {
      this.touchPointer2 = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      this.resetTwoFingerGestureState();
    } else if (
      !this.touchPointer3 &&
      this.touchPointer2 &&
      event.pointerId !== this.touchPointer.pointerId &&
      event.pointerId !== this.touchPointer2.pointerId
    ) {
      this.touchPointer3 = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    } else {
      // a fourth finger, or a duplicate pointerId ignored
      return;
    }

    try {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    } catch {}
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    if (!this.touchPointer) return;
    if (this.touchPointer3) {
      if (!this.touchPointer2) return;
      const moving =
        event.pointerId === this.touchPointer.pointerId
          ? this.touchPointer
          : event.pointerId === this.touchPointer2.pointerId
            ? this.touchPointer2
            : event.pointerId === this.touchPointer3.pointerId
              ? this.touchPointer3
              : null;
      if (!moving) return; // a fourth finger's stray move - ignored

      const oldCentroidX = (this.touchPointer.x + this.touchPointer2.x + this.touchPointer3.x) / 3;
      const oldCentroidY = (this.touchPointer.y + this.touchPointer2.y + this.touchPointer3.y) / 3;
      moving.x = event.clientX;
      moving.y = event.clientY;
      this.touchThreeDx += (this.touchPointer.x + this.touchPointer2.x + this.touchPointer3.x) / 3 - oldCentroidX;
      this.touchThreeDy += (this.touchPointer.y + this.touchPointer2.y + this.touchPointer3.y) / 3 - oldCentroidY;
      return;
    }
    if (this.touchPointer2) {
      const moving =
        event.pointerId === this.touchPointer.pointerId
          ? this.touchPointer
          : event.pointerId === this.touchPointer2.pointerId
            ? this.touchPointer2
            : null;
      if (!moving) return;

      // centroid (pan), pinch distance (dolly), and twist angle (rotate) all come from the same two
      // points, recomputed together on every move
      const oldCentroidX = (this.touchPointer.x + this.touchPointer2.x) / 2;
      const oldCentroidY = (this.touchPointer.y + this.touchPointer2.y) / 2;
      moving.x = event.clientX;
      moving.y = event.clientY;
      this.touchTwoDx += (this.touchPointer.x + this.touchPointer2.x) / 2 - oldCentroidX;
      this.touchTwoDy += (this.touchPointer.y + this.touchPointer2.y) / 2 - oldCentroidY;

      const distance = distanceBetween(this.touchPointer, this.touchPointer2);
      const pinchStepDelta = distance - this.touchPinchDistance;
      this.touchPinchDistance = distance;

      const angle = angleBetween(this.touchPointer, this.touchPointer2);
      const rotateStepDelta = deltaAngle(this.touchAngle, angle);
      this.touchAngle = angle;
      this.touchGestureRotateTotal += rotateStepDelta;

      // decided once per gesture - a later move dominated by the other axis doesn't re-decide
      if (this.lockTouchAxis && !this.touchAxisLock) {
        const scaleFraction = distance / this.touchGestureStartDistance - 1;
        const rotateDegrees = radiansToDegrees(this.touchGestureRotateTotal);
        const intent = Math.abs(scaleFraction) * SCALE_ANGLE_RATIO_INTENT_DEG - Math.abs(rotateDegrees);
        if (intent < 0) this.touchAxisLock = 'rotate';
        else if (intent > 0) this.touchAxisLock = 'pinch';
      }

      if (this.touchAxisLock !== 'rotate') this.touchPinchDelta += pinchStepDelta;
      if (this.touchAxisLock !== 'pinch') this.touchRotateDelta += rotateStepDelta;
      return;
    }
    if (event.pointerId !== this.touchPointer.pointerId) return;
    this.touchOneDx += event.clientX - this.touchPointer.x;
    this.touchOneDy += event.clientY - this.touchPointer.y;
    this.touchPointer.x = event.clientX;
    this.touchPointer.y = event.clientY;
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    if (this.touchPointer3?.pointerId === event.pointerId) {
      this.touchPointer3 = null;
      this.resetTwoFingerGestureState();
    } else if (this.touchPointer2?.pointerId === event.pointerId) {
      this.touchPointer2 = this.touchPointer3;
      this.touchPointer3 = null;
      this.resetTwoFingerGestureState();
    } else if (this.touchPointer?.pointerId === event.pointerId) {
      // promote the remaining finger(s) down a slot - no jump, their positions are already
      // current, a fresh one/two-finger gesture just continues from wherever they already are
      this.touchPointer = this.touchPointer2;
      this.touchPointer2 = this.touchPointer3;
      this.touchPointer3 = null;
      this.resetTwoFingerGestureState();
    }
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.touchPointer = null;
      this.touchPointer2 = null;
      this.touchPointer3 = null;
      this.gestureActive = false;
    }
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
    if (this.gestureAxisLock !== 'pinch') this.touchRotateDelta += degreesToRadians(rotateStepDeg);
  };

  private onGestureEnd = (): void => {
    this.gestureActive = false;
  };
}
