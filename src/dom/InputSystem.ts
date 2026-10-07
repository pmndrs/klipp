import type { ConsumedInput } from '../core/input/consumedInput';

import * as mouse from '../input-sources/mouse';
import * as safariGesture from '../input-sources/safariGesture';
import * as touch from '../input-sources/touch';
import * as wheel from '../input-sources/wheel';
import { isInsideInteractiveArea, type InteractiveArea } from '../input-sources/isInsideInteractiveArea';

export type { InteractiveArea } from '../input-sources/isInsideInteractiveArea';
export { MouseButton } from '../input-sources/mouse';

/** Mouse, touch, wheel and Safari gesture input from a DOM element, read once per frame. */
export class InputSystem {
  readonly mouse = mouse.create();
  readonly touch = touch.create();
  readonly wheel = wheel.create();
  readonly safariGesture = safariGesture.create();

  private _interactiveArea: InteractiveArea | null = null;
  private element: HTMLElement | null = null;
  private disconnectSources: (() => void) | null = null;

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
    this.safariGesture.interactiveArea = area;
  }

  /** Lock diagonal two-finger input to pinch or rotation. */
  get lockTouchAxis(): boolean {
    return this.touch.lockTouchAxis;
  }

  set lockTouchAxis(lock: boolean) {
    this.touch.lockTouchAxis = lock;
    this.safariGesture.lockTouchAxis = lock;
  }

  /**
   * Attaches listeners to `element`, calling `onInput` for every event that changes the input. Safe to call
   * again with a new element - disconnects the old one first.
   */
  connect = (element: HTMLElement, onInput?: () => void): void => {
    this.disconnect();
    this.element = element;
    const disconnectMouse = mouse.connect(this.mouse, element, onInput);
    const disconnectTouch = touch.connect(this.touch, element, onInput);
    const disconnectWheel = wheel.connect(this.wheel, element, onInput);
    const disconnectSafariGesture = safariGesture.connect(this.safariGesture, element, onInput);
    this.disconnectSources = () => {
      disconnectMouse();
      disconnectTouch();
      disconnectWheel();
      disconnectSafariGesture();
    };
  };

  /** Detaches every listener. A pointer lock stays: it belongs to the document, release it with `exitPointerLock`. */
  disconnect = (): void => {
    this.disconnectSources?.();
    this.disconnectSources = null;
    this.element = null;
  };

  requestPointerLock = (): void => {
    this.element?.requestPointerLock();
  };

  exitPointerLock = (): void => {
    if (document.pointerLockElement === this.element) document.exitPointerLock();
  };

  /** Starts a new frame in every source and writes it to `out`. */
  consume = (out: ConsumedInput): ConsumedInput => {
    mouse.update(this.mouse);
    touch.update(this.touch);
    wheel.update(this.wheel);
    safariGesture.update(this.safariGesture);
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
    out.touchRotateDelta = touchState.twistDelta + this.safariGesture.twistDelta;
    out.touchOneHeld = touchState.fingers === 1;
    out.touchTwoHeld = touchState.fingers === 2;
    out.touchThreeHeld = touchState.fingers === 3;
    out.wheelDeltaX = this.wheel.deltaX;
    out.wheelDeltaY = this.wheel.deltaY;
    out.pinchDelta = touchState.pinchDelta + this.wheel.pinchDelta + this.safariGesture.pinchDelta;
    return out;
  };

  /** Whether `clientX/Y` falls within `interactiveArea`. A locked pointer counts as inside: its position is frozen. */
  isInsideInteractiveArea(clientX: number, clientY: number): boolean {
    if (!this.element) return true;
    return isInsideInteractiveArea(this.element, this._interactiveArea, clientX, clientY);
  }
}
