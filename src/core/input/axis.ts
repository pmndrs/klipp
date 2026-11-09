import { clamp, repeat } from 'math';

import { withDefaults } from '../params';

import * as damping from '../damping/damping';
import type { DamperState, DampingConstant } from '../damping/damping';

import { shortestWrappedDelta } from './shortestWrappedDelta';

export type InputAxisRecentering = {
  enabled: boolean;
  /** Seconds of no delta/hold before recentering starts. */
  wait: number;
  /** Seconds to ease back to `center` once recentering starts. */
  time: number;
};

/** An input axis's settings. */
export type InputAxisParams = {
  value: number;
  /** The value `recentering` returns to. */
  center: number;
  /** `[min, max]` limits, or `null` for none. */
  range: [number, number] | null;
  /** Loop around at the edges of `range` instead of stopping. */
  wrap: boolean;
  /** Return to `center` after a while without input. */
  recentering: InputAxisRecentering;
  /** Response time to the input. */
  damping: DampingConstant;
  /** Maximum change per second. */
  maxSpeed: number;
  /** Whether to normalize a wrapped axis after it settles. */
  autoNormalize: boolean;
};

/** How a method moves a camera. */
export type EaseOptions = {
  /** `0` jumps there. Above it, the camera eases there with this response time, until input takes over. */
  damping?: DampingConstant;
};

/** Settings of an axis that starts at its `center`. */
export type InputAxisSettings = Partial<Omit<InputAxisParams, 'value'>>;

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<InputAxisParams>): InputAxisParams =>
  withDefaults(
    {
      value: 0,
      center: 0,
      range: null,
      wrap: false,
      recentering: { enabled: false, wait: 1, time: 1 },
      damping: 0,
      maxSpeed: Infinity,
      autoNormalize: false,
    },
    settings,
  );

/** An input axis as plain data: settings plus the state the functions below advance. */
export type InputAxisData = InputAxisParams & {
  /** Whether the input source is currently held. */
  held: boolean;
  /** Target the value eases toward. Internal. */
  rawValue: number;
  /** Seconds without input. Internal. */
  idleTime: number;
  /** Whether a delta arrived since the last update. Internal. */
  hadDelta: boolean;
  /** Internal. */
  damper: DamperState;
  /** Whether a move from `easeTo` is under way. Internal. */
  easing: boolean;
  /** Where that move goes. Internal. */
  easeGoal: number;
  /** Damping of that move. Internal. */
  easeDamping: DampingConstant;
  /** Whether `triggerRecentering` started a recentering that hasn't finished. Internal. */
  recenterTriggered: boolean;
};

const clampToRange = (axis: InputAxisData, value: number): number =>
  axis.range ? clamp(value, axis.range[0], axis.range[1]) : value;

/** Add an input delta to the axis target. */
export function applyDelta(axis: InputAxisData, delta: number): void {
  if (delta === 0) return;
  axis.rawValue = axis.wrap ? axis.rawValue + delta : clampToRange(axis, axis.rawValue + delta);
  axis.idleTime = 0;
  axis.hadDelta = true;
}

/** Jump straight to `value`, without easing and without counting as input. Stops a move from `easeTo`. */
export function setValue(axis: InputAxisData, value: number): void {
  const next = axis.wrap ? value : clampToRange(axis, value);
  axis.value = next;
  axis.rawValue = next;
  axis.damper.velocity = 0;
  axis.damper.previousDistance = 0;
  stopEasing(axis);
}

/**
 * Moves to `value` with `time` as damping, the short way around when the axis wraps: `0` jumps there. Input stops
 * it where it is, and recentering waits until after it.
 */
export function easeTo(axis: InputAxisData, value: number, time: DampingConstant): void {
  const goal = axis.wrap && axis.range ? axis.value + shortestWrappedDelta(axis.value, value, axis.range) : value;
  axis.idleTime = 0;
  if (typeof time === 'number' && time <= 0) {
    setValue(axis, goal);
    return;
  }
  axis.recenterTriggered = false;
  axis.easing = true;
  axis.easeGoal = goal;
  axis.easeDamping = time;
  damping.start(axis.damper);
}

/** Recenters now, over `recentering.time`, also while recentering is off. Input stops it where it is. */
export function triggerRecentering(axis: InputAxisData): void {
  axis.easing = false;
  axis.recenterTriggered = true;
  damping.start(axis.damper);
}

/** Stops a move from `easeTo` or `triggerRecentering` where it is. */
export function stopEasing(axis: InputAxisData): void {
  axis.easing = false;
  axis.recenterTriggered = false;
}

/** Wrap `value` and `rawValue` back into `range`, and the goal of a move from `easeTo` with them. */
export function normalize(axis: InputAxisData): void {
  if (!axis.wrap || !axis.range) return;
  const [min, max] = axis.range;
  const span = max - min;
  const before = axis.value;
  axis.value = min + repeat(axis.value - min, span);
  axis.rawValue = min + repeat(axis.rawValue - min, span);
  axis.easeGoal += axis.value - before;
}

/** Whether the axis still has to move: easing toward its target, or a recentering yet to finish. */
function isMoving(axis: InputAxisData, center: number): boolean {
  if (axis.easing || axis.recenterTriggered || axis.value !== axis.rawValue) return true;
  if (axis.held || !axis.recentering.enabled) return false;
  const offCenter =
    axis.wrap && axis.range ? shortestWrappedDelta(axis.value, center, axis.range) : center - axis.value;
  return Math.abs(offCenter) > 1e-9;
}

/** Advance the axis and apply damping, or recentering toward `center`. Returns `true` while it still has to move. */
export function update(axis: InputAxisData, dt: number, center = axis.center): boolean {
  const active = axis.held || axis.hadDelta;
  axis.hadDelta = false;
  if (active) stopEasing(axis);
  // A move holds recentering, which waits again from where it ends.
  if (active || axis.easing) axis.idleTime = 0;
  else axis.idleTime += dt;
  // Recenter starts on the first idle frame, even when the wait is zero.
  const isRecentering =
    !active &&
    !axis.easing &&
    (axis.recenterTriggered || (axis.recentering.enabled && axis.idleTime >= axis.recentering.wait));

  let dampTarget: number;
  let dampTime: DampingConstant;
  if (axis.easing) {
    dampTarget = axis.wrap ? axis.easeGoal : clampToRange(axis, axis.easeGoal);
    dampTime = axis.easeDamping;
  } else if (isRecentering) {
    dampTarget = axis.wrap && axis.range ? axis.value + shortestWrappedDelta(axis.value, center, axis.range) : center;
    dampTime = axis.recentering.time;
  } else {
    dampTarget = axis.rawValue;
    dampTime = axis.damping;
  }

  axis.damper.value = axis.value;
  const eased = damping.damp(axis.damper, dampTarget, dampTime, dt, axis.maxSpeed).value;
  axis.value = axis.wrap ? eased : clampToRange(axis, eased);

  if (axis.easing || isRecentering) axis.rawValue = axis.value;
  if (eased === dampTarget) stopEasing(axis);

  if (axis.autoNormalize && axis.value === axis.rawValue) normalize(axis);
  return isMoving(axis, center);
}

/** Reset damping so the next update snaps to the raw value. */
export function reset(axis: InputAxisData): void {
  damping.reset(axis.damper);
}
