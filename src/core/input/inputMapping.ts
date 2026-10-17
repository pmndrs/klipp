import * as inputAxis from './axis';
import type { InputAxisData } from './axis';
import type { ConsumedInput } from './consumedInput';

/** Inverts both axes or configures them independently. */
export type InputInvert = boolean | { x?: boolean; y?: boolean };

/** One input feeding two axes, given as the axes or their names. */
export type InputSourceMapping<A = InputAxisData> = {
  axes: { x: A; y: A };
  /** Multiplies the raw delta before it reaches the axes. */
  gain?: number;
  /** Whether either axis is inverted. */
  invert?: InputInvert;
};

/** One input feeding one axis, given as the axis or its name. */
export type InputAxisMapping<A = InputAxisData> = {
  axis: A;
  /** Multiplies the raw delta before it reaches the axis. */
  gain?: number;
  invert?: boolean;
};

/** Which axes each input drives. Leave a source out, or set it to `null`, to ignore it. */
export type InputControllerConfig<A = InputAxisData> = {
  /** Dragging with each mouse button held. */
  mouseButtons?: {
    left?: InputSourceMapping<A> | null;
    right?: InputSourceMapping<A> | null;
    middle?: InputSourceMapping<A> | null;
  };
  /** Dragging with one, two or three fingers. */
  touches?: {
    one?: InputSourceMapping<A> | null;
    two?: InputSourceMapping<A> | null;
    three?: InputSourceMapping<A> | null;
  };
  /** Vertical wheel scrolling, in pixels. Scrolling up is positive, like spreading a pinch. */
  wheel?: InputAxisMapping<A> | null;
  /** Pinch with two fingers or on a trackpad, as the change in `ln(scale)`. Spreading is positive. */
  pinch?: InputAxisMapping<A> | null;
};

const isInverted = (invert: InputInvert | undefined, axis: 'x' | 'y'): boolean =>
  invert === true || (typeof invert === 'object' && !!invert[axis]);

type Mapping = InputSourceMapping | null | undefined;

function applySource(mapping: Mapping, dx: number, dy: number): void {
  if (!mapping || (dx === 0 && dy === 0)) return;
  const gain = mapping.gain ?? 1;
  inputAxis.applyDelta(mapping.axes.x, dx * gain * (isInverted(mapping.invert, 'x') ? -1 : 1));
  inputAxis.applyDelta(mapping.axes.y, dy * gain * (isInverted(mapping.invert, 'y') ? -1 : 1));
}

function applyAxis(mapping: InputAxisMapping | null | undefined, delta: number): void {
  if (!mapping || delta === 0) return;
  inputAxis.applyDelta(mapping.axis, delta * (mapping.gain ?? 1) * (mapping.invert ? -1 : 1));
}

function resetHeld(mapping: Mapping): void {
  if (!mapping) return;
  mapping.axes.x.held = false;
  mapping.axes.y.held = false;
}

function applyHeld(mapping: Mapping, held: boolean): void {
  if (!mapping || !held) return;
  mapping.axes.x.held = true;
  mapping.axes.y.held = true;
}

/** Feeds every configured source's shaped delta and hold state into its axes. */
export function feedAxes(config: InputControllerConfig, input: ConsumedInput, enabled: boolean): void {
  const { mouseButtons, touches } = config;
  // Reset held state first so shared mappings can combine multiple sources.
  resetHeld(mouseButtons?.left);
  resetHeld(mouseButtons?.right);
  resetHeld(mouseButtons?.middle);
  resetHeld(touches?.one);
  resetHeld(touches?.two);
  resetHeld(touches?.three);
  if (config.pinch) config.pinch.axis.held = false;
  if (!enabled) return;
  applySource(mouseButtons?.left, input.leftDx, input.leftDy);
  applySource(mouseButtons?.right, input.rightDx, input.rightDy);
  applySource(mouseButtons?.middle, input.middleDx, input.middleDy);
  applySource(touches?.one, input.touchOneDx, input.touchOneDy);
  applySource(touches?.two, input.touchTwoDx, input.touchTwoDy);
  applySource(touches?.three, input.touchThreeDx, input.touchThreeDy);
  applySource(mouseButtons?.left, input.lockedDx, input.lockedDy);
  applyHeld(mouseButtons?.left, input.leftHeld);
  applyHeld(mouseButtons?.right, input.rightHeld);
  applyHeld(mouseButtons?.middle, input.middleHeld);
  applyHeld(touches?.one, input.touchOneHeld);
  applyHeld(touches?.two, input.touchTwoHeld);
  applyHeld(touches?.three, input.touchThreeHeld);
  applyAxis(config.wheel, -input.wheelDeltaY);
  applyAxis(config.pinch, input.pinchDelta);
  if (config.pinch && input.touchTwoHeld) config.pinch.axis.held = true;
}
