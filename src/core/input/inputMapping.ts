import * as inputAxis from './axis';
import type { InputAxisData } from './axis';
import type { ConsumedInput } from './consumedInput';
import { ModifierKeys, type ModifierKey } from './ModifierKeys';

/** Inverts both axes or configures them independently. */
export type InputInvert = boolean | { x?: boolean; y?: boolean };

/** One input feeding up to two axes, given as the axes or their names. Leave one out to ignore that direction. */
export type InputSourceMapping<A = InputAxisData> = {
  axes: { x?: A; y?: A };
  /** Multiplies the raw delta before it reaches the axes. */
  gain?: number;
  /** Whether either axis is inverted. */
  invert?: InputInvert;
  /** A zoom axis like `zoom` on `Lens`: the drag slows down as it magnifies the view. */
  zoomAxis?: A;
};

/** One input feeding one axis, given as the axis or its name. */
export type InputAxisMapping<A = InputAxisData> = {
  axis: A;
  /** Multiplies the raw delta before it reaches the axis. */
  gain?: number;
  invert?: boolean;
};

/** What dragging with each mouse button drives. */
export type InputMouseButtons<A = InputAxisData> = {
  left?: InputSourceMapping<A> | null;
  right?: InputSourceMapping<A> | null;
  middle?: InputSourceMapping<A> | null;
};

/** Which axes each input drives. Leave a source out, or set it to `null`, to ignore it. */
export type InputControllerConfig<A = InputAxisData> = {
  /** Dragging with each mouse button held. */
  mouseButtons?: InputMouseButtons<A>;
  /**
   * What the mouse buttons drive instead while a key is held as they go down. A button a key leaves out drives what
   * it always does. With several keys held, the first of `ctrl`, `meta`, `shift` and `alt` that maps it wins.
   */
  modifiers?: {
    ctrl?: InputMouseButtons<A> | null;
    meta?: InputMouseButtons<A> | null;
    shift?: InputMouseButtons<A> | null;
    alt?: InputMouseButtons<A> | null;
  } | null;
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
  const { axes, invert, zoomAxis } = mapping;
  const gain = (mapping.gain ?? 1) * (zoomAxis ? Math.exp(-zoomAxis.value) : 1);
  if (axes.x) inputAxis.applyDelta(axes.x, dx * gain * (isInverted(invert, 'x') ? -1 : 1));
  if (axes.y) inputAxis.applyDelta(axes.y, dy * gain * (isInverted(invert, 'y') ? -1 : 1));
}

function applyAxis(mapping: InputAxisMapping | null | undefined, delta: number): void {
  if (!mapping || delta === 0) return;
  inputAxis.applyDelta(mapping.axis, delta * (mapping.gain ?? 1) * (mapping.invert ? -1 : 1));
}

function setHeld(mapping: Mapping, held: boolean): void {
  if (!mapping) return;
  if (mapping.axes.x) mapping.axes.x.held = held;
  if (mapping.axes.y) mapping.axes.y.held = held;
}

function resetHeld(mapping: Mapping): void {
  setHeld(mapping, false);
}

function resetHeldButtons(buttons: InputMouseButtons | null | undefined): void {
  if (!buttons) return;
  resetHeld(buttons.left);
  resetHeld(buttons.right);
  resetHeld(buttons.middle);
}

const modifierOrder: readonly ModifierKey[] = ['ctrl', 'meta', 'shift', 'alt'];

/** What `button` drives, or what a key held as it went down maps it to instead. */
function buttonMapping(config: InputControllerConfig, button: keyof InputMouseButtons, keys: number): Mapping {
  const { modifiers } = config;
  if (modifiers && keys !== 0) {
    for (let i = 0; i < modifierOrder.length; i++) {
      const key = modifierOrder[i];
      if ((keys & ModifierKeys[key]) === 0) continue;
      const mapping = modifiers[key]?.[button];
      if (mapping !== undefined) return mapping;
    }
  }
  return config.mouseButtons?.[button];
}

function applyHeld(mapping: Mapping, held: boolean): void {
  if (held) setHeld(mapping, true);
}

/** Feeds every configured source's shaped delta and hold state into its axes. */
export function feedAxes(config: InputControllerConfig, input: ConsumedInput, enabled: boolean): void {
  const { mouseButtons, touches } = config;
  // Reset held state first so shared mappings can combine multiple sources.
  resetHeldButtons(mouseButtons);
  const { modifiers } = config;
  if (modifiers) {
    resetHeldButtons(modifiers.ctrl);
    resetHeldButtons(modifiers.meta);
    resetHeldButtons(modifiers.shift);
    resetHeldButtons(modifiers.alt);
  }
  resetHeld(touches?.one);
  resetHeld(touches?.two);
  resetHeld(touches?.three);
  if (config.pinch) config.pinch.axis.held = false;
  if (!enabled) return;
  const left = buttonMapping(config, 'left', input.leftModifiers);
  const right = buttonMapping(config, 'right', input.rightModifiers);
  const middle = buttonMapping(config, 'middle', input.middleModifiers);
  applySource(left, input.leftDx, input.leftDy);
  applySource(right, input.rightDx, input.rightDy);
  applySource(middle, input.middleDx, input.middleDy);
  applySource(touches?.one, input.touchOneDx, input.touchOneDy);
  applySource(touches?.two, input.touchTwoDx, input.touchTwoDy);
  applySource(touches?.three, input.touchThreeDx, input.touchThreeDy);
  applySource(mouseButtons?.left, input.lockedDx, input.lockedDy);
  applyHeld(left, input.leftHeld);
  applyHeld(right, input.rightHeld);
  applyHeld(middle, input.middleHeld);
  applyHeld(touches?.one, input.touchOneHeld);
  applyHeld(touches?.two, input.touchTwoHeld);
  applyHeld(touches?.three, input.touchThreeHeld);
  applyAxis(config.wheel, -input.wheelDeltaY);
  applyAxis(config.pinch, input.pinchDelta);
  if (config.pinch && input.touchTwoHeld) config.pinch.axis.held = true;
}
