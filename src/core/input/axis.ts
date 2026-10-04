import { clamp, repeat } from 'math';
import type { DamperState, DampingConstant } from '../damping/damping';
import * as damping from '../damping/damping';
import { withDefaults } from '../params';
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
  /** The current value. */
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

/** Wrap `value` and `rawValue` back into `range`. */
export function normalize(axis: InputAxisData): void {
  if (!axis.wrap || !axis.range) return;
  const [min, max] = axis.range;
  const span = max - min;
  axis.value = min + repeat(axis.value - min, span);
  axis.rawValue = min + repeat(axis.rawValue - min, span);
}

/** Advance the axis and apply damping or recentering. */
export function update(axis: InputAxisData, dt: number): void {
  const active = axis.held || axis.hadDelta;
  axis.hadDelta = false;
  if (active) axis.idleTime = 0;
  else axis.idleTime += dt;
  // Recenter starts on the first idle frame, even when the wait is zero.
  const isRecentering = !active && axis.recentering.enabled && axis.idleTime >= axis.recentering.wait;

  let dampTarget: number;
  let dampTime: DampingConstant;
  if (isRecentering) {
    dampTarget =
      axis.wrap && axis.range ? axis.value + shortestWrappedDelta(axis.value, axis.center, axis.range) : axis.center;
    dampTime = axis.recentering.time;
  } else {
    dampTarget = axis.rawValue;
    dampTime = axis.damping;
  }

  axis.damper.value = axis.value;
  const eased = damping.damp(axis.damper, dampTarget, dampTime, dt, axis.maxSpeed).value;
  axis.value = axis.wrap ? eased : clampToRange(axis, eased);

  if (isRecentering) axis.rawValue = axis.value;

  if (axis.autoNormalize && axis.value === axis.rawValue) normalize(axis);
}

/** Reset damping so the next update snaps to the raw value. */
export function reset(axis: InputAxisData): void {
  damping.reset(axis.damper);
}
