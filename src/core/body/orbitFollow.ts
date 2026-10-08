import { clamp, degreesToRadians, quat, vec3, type Euler, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import { withDefaults } from '../params';
import type { TargetPose } from '../TargetPose';

import * as damping from '../damping/damping';
import type { DamperState, DampingConstant } from '../damping/damping';
import type { InputAxisParams } from '../input/axis';
import { InputAxis } from '../input/InputAxis';

import * as tracker from './tracker';
import { BindingModes, type BindingMode } from './BindingModes';
import type { TrackerState } from './tracker';

export type OrbitFollowParams = {
  /** Distance from the target while `radial` is `0`. Changes ease in with `radial.damping`. */
  radius: number;
  /** Center of the orbit relative to the target, rotated according to `bindingMode`. */
  targetOffset: Vec3;
  /** Rotation frame the orbit is measured in. */
  bindingMode: BindingMode;
  /** Response time for following the target position. */
  damping: DampingConstant;
  /** Maximum damping speed, in world units/sec. */
  maxSpeed: number;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<OrbitFollowParams>): OrbitFollowParams =>
  withDefaults(
    { radius: 10, targetOffset: [0, 0, 0], bindingMode: BindingModes.worldSpace, damping: 0, maxSpeed: Infinity },
    settings,
  );

/**
 * `horizontal` (around the target, wraps ±180°) and `vertical` (elevation) in degrees, and `radial` as the natural
 * log of the radius scale.
 */
export type OrbitFollowState = {
  horizontal: InputAxis;
  vertical: InputAxis;
  radial: InputAxis;
  radius: DamperState;
  tracker: TrackerState;
};

type AxisSettings = Partial<InputAxisParams>;

/** Default settings of each axis. Every axis starts at its `center`. */
export const createAxisSettings = (): { horizontal: AxisSettings; vertical: AxisSettings; radial: AxisSettings } => ({
  horizontal: { center: 0, range: [-180, 180], wrap: true },
  vertical: { center: 17.5, range: [-90, 90] },
  radial: { center: 0, range: [Math.log(0.5), Math.log(2)] },
});

export function createState(): OrbitFollowState {
  const { horizontal, vertical, radial } = createAxisSettings();
  return {
    horizontal: new InputAxis({ ...horizontal, value: horizontal.center }),
    vertical: new InputAxis({ ...vertical, value: vertical.center }),
    radial: new InputAxis({ ...radial, value: radial.center }),
    radius: damping.createState(),
    tracker: tracker.createState(),
  };
}

const poleLimit = 90 - 1e-3;
const worldUp: Vec3 = [0, 1, 0];
const scratchEuler: Euler = [0, 0, 0, 'yxz'];
const scratchRotation: Quat = [0, 0, 0, 1];
const scratchOffset: Vec3 = [0, 0, 0];
const scratchOrientation: Quat = [0, 0, 0, 1];

/**
 * Advances the axes and places `out` on the orbit around the target. A `null` target leaves `out` as is.
 * Returns `true` while an axis still has to move.
 */
export function update(
  out: CameraState,
  state: OrbitFollowState,
  params: OrbitFollowParams,
  target: TargetPose | null,
  dt: number,
  justActivated: boolean,
): boolean {
  const horizontalMoving = state.horizontal.update(dt);
  const verticalMoving = state.vertical.update(dt);
  const radialMoving = state.radial.update(dt);
  if (justActivated) {
    tracker.reset(state.tracker);
    damping.reset(state.radius);
  }
  const radius = damping.damp(state.radius, params.radius, state.radial.damping, dt).value;
  const moving = horizontalMoving || verticalMoving || radialMoving || radius !== params.radius;
  if (!target) return moving;

  // At a pole the horizontal angle no longer moves the camera, so the view could not turn with it.
  scratchEuler[0] = -degreesToRadians(clamp(state.vertical.value, -poleLimit, poleLimit));
  scratchEuler[1] = -degreesToRadians(state.horizontal.value);
  quat.fromEuler(scratchRotation, scratchEuler);
  vec3.set(scratchOffset, 0, 0, radius * Math.exp(state.radial.value));
  vec3.transformQuat(scratchOffset, scratchOffset, scratchRotation);

  tracker.trackTarget(
    out.target,
    scratchOrientation,
    state.tracker,
    params,
    target,
    scratchOffset,
    params.targetOffset,
    dt,
  );
  vec3.add(out.position, out.target, vec3.transformQuat(scratchOffset, scratchOffset, scratchOrientation));
  out.hasTarget = true;
  vec3.transformQuat(out.referenceUp, worldUp, scratchOrientation);
  return moving;
}
