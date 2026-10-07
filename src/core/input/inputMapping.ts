import * as inputAxis from './axis';
import type { InputAxisData } from './axis';
import type { ConsumedInput } from './consumedInput';

export type InputAxisPair = {
  x: InputAxisData;
  y: InputAxisData;
};

/** Inverts both axes or configures them independently. */
export type InputInvert = boolean | { x?: boolean; y?: boolean };

export type InputSourceMapping = {
  axes: InputAxisPair;
  /** Multiplies the raw delta before it reaches the axes. */
  gain?: number;
  /** Whether either axis is inverted. */
  invert?: InputInvert;
};

/** One input feeding one axis. */
export type InputAxisMapping = {
  axis: InputAxisData;
  /** Multiplies the raw delta before it reaches the axis. */
  gain?: number;
  invert?: boolean;
};

export type InputControllerConfig = {
  mouseButtons: {
    left: InputSourceMapping | null;
    right: InputSourceMapping | null;
    middle: InputSourceMapping | null;
  };
  touches: {
    one: InputSourceMapping | null;
    two: InputSourceMapping | null;
    three: InputSourceMapping | null;
  };
  /** Vertical wheel scrolling, in pixels. Scrolling up is positive, like spreading a pinch. */
  wheel?: InputAxisMapping | null;
  /** Change in the distance between two fingers, in pixels. Spreading is positive. */
  touchPinch?: InputAxisMapping | null;
  /** Trackpad pinch, as the change in `ln(scale)`. Spreading is positive. */
  trackpadPinch?: InputAxisMapping | null;
};

const isInverted = (invert: InputInvert | undefined, axis: 'x' | 'y'): boolean =>
  invert === true || (typeof invert === 'object' && !!invert[axis]);

function applySource(mapping: InputSourceMapping | null, dx: number, dy: number): void {
  if (!mapping || (dx === 0 && dy === 0)) return;
  const gain = mapping.gain ?? 1;
  inputAxis.applyDelta(mapping.axes.x, dx * gain * (isInverted(mapping.invert, 'x') ? -1 : 1));
  inputAxis.applyDelta(mapping.axes.y, dy * gain * (isInverted(mapping.invert, 'y') ? -1 : 1));
}

function applyAxis(mapping: InputAxisMapping | null | undefined, delta: number): void {
  if (!mapping || delta === 0) return;
  inputAxis.applyDelta(mapping.axis, delta * (mapping.gain ?? 1) * (mapping.invert ? -1 : 1));
}

function resetHeld(mapping: InputSourceMapping | null): void {
  if (!mapping) return;
  mapping.axes.x.held = false;
  mapping.axes.y.held = false;
}

function applyHeld(mapping: InputSourceMapping | null, held: boolean): void {
  if (!mapping || !held) return;
  mapping.axes.x.held = true;
  mapping.axes.y.held = true;
}

/** Feeds every configured source's shaped delta and hold state into its axis pair. */
export function feedAxes(config: InputControllerConfig, input: ConsumedInput, enabled: boolean): void {
  const { mouseButtons, touches } = config;
  // Reset held state first so shared mappings can combine multiple sources.
  resetHeld(mouseButtons.left);
  resetHeld(mouseButtons.right);
  resetHeld(mouseButtons.middle);
  resetHeld(touches.one);
  resetHeld(touches.two);
  resetHeld(touches.three);
  if (config.touchPinch) config.touchPinch.axis.held = false;
  if (!enabled) return;
  applySource(mouseButtons.left, input.leftDx, input.leftDy);
  applySource(mouseButtons.right, input.rightDx, input.rightDy);
  applySource(mouseButtons.middle, input.middleDx, input.middleDy);
  applySource(touches.one, input.touchOneDx, input.touchOneDy);
  applySource(touches.two, input.touchTwoDx, input.touchTwoDy);
  applySource(touches.three, input.touchThreeDx, input.touchThreeDy);
  applySource(mouseButtons.left, input.lockedDx, input.lockedDy);
  applyHeld(mouseButtons.left, input.leftHeld);
  applyHeld(mouseButtons.right, input.rightHeld);
  applyHeld(mouseButtons.middle, input.middleHeld);
  applyHeld(touches.one, input.touchOneHeld);
  applyHeld(touches.two, input.touchTwoHeld);
  applyHeld(touches.three, input.touchThreeHeld);
  applyAxis(config.wheel, -input.wheelDeltaY);
  applyAxis(config.touchPinch, input.touchPinchDelta);
  // Both arrive as ln(scale): Safari's gesture directly, other browsers as a ctrlKey wheel's -100 * ln(scale).
  applyAxis(config.trackpadPinch, input.gestureZoomDelta - input.wheelZoomDelta / 100);
  if (config.touchPinch && input.touchTwoHeld) config.touchPinch.axis.held = true;
}
