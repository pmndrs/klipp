import type { CameraState } from '../CameraState';
import { withDefaults } from '../params';

import * as damping from '../damping/damping';
import type { DamperState, DampingConstant } from '../damping/damping';

export type LensParams = {
  /** Overrides the camera's field of view, in degrees. `undefined` leaves the current value untouched. */
  fov?: number;
  /** Overrides the near clip plane. `undefined` leaves the current value untouched. */
  near?: number;
  /** Overrides the far clip plane. `undefined` leaves the current value untouched. */
  far?: number;
  /** Spring response time to `fov` as it changes. `0` is instant. */
  fovDamping: DampingConstant;
  /** Spring response time to `near` as it changes. `0` is instant. */
  nearDamping: DampingConstant;
  /** Spring response time to `far` as it changes. `0` is instant. */
  farDamping: DampingConstant;
  /** Caps how fast `fovDamping` can close the gap, in degrees/sec. `Infinity` means no cap. */
  fovMaxSpeed: number;
  /** Caps how fast `nearDamping` can close the gap, in world units/sec. `Infinity` means no cap. */
  nearMaxSpeed: number;
  /** Caps how fast `farDamping` can close the gap, in world units/sec. `Infinity` means no cap. */
  farMaxSpeed: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<LensParams>): LensParams =>
  withDefaults(
    {
      fov: undefined,
      near: undefined,
      far: undefined,
      fovDamping: 0,
      nearDamping: 0,
      farDamping: 0,
      fovMaxSpeed: Infinity,
      nearMaxSpeed: Infinity,
      farMaxSpeed: Infinity,
    },
    settings,
  );

export type LensState = {
  fovDamper: DamperState;
  nearDamper: DamperState;
  farDamper: DamperState;
  currentFov: number;
  currentNear: number;
  currentFar: number;
  primed: boolean;
};

export const createState = (): LensState => ({
  fovDamper: damping.createState(),
  nearDamper: damping.createState(),
  farDamper: damping.createState(),
  currentFov: 0,
  currentNear: 0,
  currentFar: 0,
  primed: false,
});

function start(damper: DamperState, value: number): number {
  damping.damp(damper, value, 0, 0);
  return value;
}

/** Start the next activation from the lens fields `initial` sets instead of snapping to the settings. */
export function prime(state: LensState, initial: Partial<Pick<CameraState, 'fov' | 'near' | 'far'>>): void {
  if (initial.fov !== undefined) state.currentFov = start(state.fovDamper, initial.fov);
  if (initial.near !== undefined) state.currentNear = start(state.nearDamper, initial.near);
  if (initial.far !== undefined) state.currentFar = start(state.farDamper, initial.far);
  state.primed = true;
}

function dampLensField(
  damper: DamperState,
  current: number,
  target: number,
  dampingTime: DampingConstant,
  dt: number,
  maxSpeed: number,
): number {
  if (typeof dampingTime === 'number' && dampingTime <= 0) return target;
  damper.value = current;
  return damping.damp(damper, target, dampingTime, dt, maxSpeed).value;
}

/** Overrides the lens fields that are set in `params`, each with its own damping. Returns true while still moving. */
export function update(
  out: CameraState,
  state: LensState,
  params: LensParams,
  dt: number,
  justActivated: boolean,
): boolean {
  if (justActivated) {
    if (state.primed) {
      state.primed = false;
    } else {
      damping.reset(state.fovDamper);
      damping.reset(state.nearDamper);
      damping.reset(state.farDamper);
    }
  }

  if (params.fov !== undefined) {
    state.currentFov = dampLensField(
      state.fovDamper,
      state.currentFov,
      params.fov,
      params.fovDamping,
      dt,
      params.fovMaxSpeed,
    );
    out.fov = state.currentFov;
  }
  if (params.near !== undefined) {
    state.currentNear = dampLensField(
      state.nearDamper,
      state.currentNear,
      params.near,
      params.nearDamping,
      dt,
      params.nearMaxSpeed,
    );
    out.near = state.currentNear;
  }
  if (params.far !== undefined) {
    state.currentFar = dampLensField(
      state.farDamper,
      state.currentFar,
      params.far,
      params.farDamping,
      dt,
      params.farMaxSpeed,
    );
    out.far = state.currentFar;
  }

  return (
    (params.fov !== undefined && state.currentFov !== params.fov) ||
    (params.near !== undefined && state.currentNear !== params.near) ||
    (params.far !== undefined && state.currentFar !== params.far)
  );
}
