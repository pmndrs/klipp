import { degreesToRadians, EulerOrder, quat, radiansToDegrees, vec3, type Euler, type Quat, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';

import * as inputAxis from '../input/axis';
import type { DampingConstant } from '../damping/damping';
import type { InputAxisSettings } from '../input/axis';
import { InputAxis } from '../input/InputAxis';

/** `pan` (yaw, wraps ±180°) and `tilt` (pitch, clamped) in degrees, and the `referenceUp` of the last update. */
export type PanTiltState = { pan: InputAxis; tilt: InputAxis; referenceUp: Vec3 };

/** Default settings of each axis. Every axis starts at its `center`. */
export const createAxisSettings = (): { pan: InputAxisSettings; tilt: InputAxisSettings } => ({
  pan: { center: 0, range: [-180, 180], wrap: true },
  tilt: { center: 0, range: [-90, 90] },
});

export function createState(): PanTiltState {
  const { pan, tilt } = createAxisSettings();
  return {
    pan: new InputAxis({ ...pan, value: pan.center }),
    tilt: new InputAxis({ ...tilt, value: tilt.center }),
    referenceUp: [0, 1, 0],
  };
}

const worldUp: Vec3 = [0, 1, 0];
const forwardAxis: Vec3 = [0, 0, -1];
const epsilon = 1e-6;

const scratchFrame: Quat = [0, 0, 0, 1];
const scratchRotation: Quat = [0, 0, 0, 1];
const scratchAxisRotation: Quat = [0, 0, 0, 1];
const scratchEuler: Euler = [0, 0, 0, EulerOrder.YXZ];
const scratchForward: Vec3 = [0, 0, 0];
const scratchTargetForward: Vec3 = [0, 0, 0];
const scratchA: Vec3 = [0, 0, 0];
const scratchB: Vec3 = [0, 0, 0];
const scratchRight: Vec3 = [0, 0, 0];

/** The frame pan and tilt are measured in: the target's rotation, or `referenceUp` alone. */
function referenceFrame(out: Quat, targetRotation: Quat | null, referenceUp: Vec3): Quat {
  return targetRotation ? quat.copy(out, targetRotation) : quat.rotationTo(out, worldUp, referenceUp);
}

function projectOnPlane(out: Vec3, v: Vec3, normal: Vec3): Vec3 {
  const lengthSq = vec3.squaredLength(normal);
  if (lengthSq === 0) return vec3.copy(out, v);
  return vec3.scaleAndAdd(out, v, normal, -vec3.dot(normal, v) / lengthSq);
}

/** Advances both axes and writes the resulting rotation to `out`. Returns `true` while an axis still has to move. */
export function update(out: CameraState, state: PanTiltState, targetRotation: Quat | null, dt: number): boolean {
  const { pan, tilt } = state;
  if (pan.held || pan.hadDelta || tilt.held || tilt.hadDelta) {
    inputAxis.stopEasing(pan);
    inputAxis.stopEasing(tilt);
  }
  const panMoving = pan.update(dt);
  const tiltMoving = tilt.update(dt);

  vec3.copy(state.referenceUp, out.referenceUp);
  referenceFrame(scratchFrame, targetRotation, out.referenceUp);
  scratchEuler[0] = -degreesToRadians(tilt.value);
  scratchEuler[1] = -degreesToRadians(pan.value);
  quat.multiply(out.quaternion, scratchFrame, quat.fromEuler(scratchRotation, scratchEuler));
  return panMoving || tiltMoving;
}

/** Moves `pan` and `tilt` toward `rotation`'s forward direction, right away or eased with `time`. */
export function setFromRotation(
  state: PanTiltState,
  targetRotation: Quat | null,
  rotation: Quat,
  referenceUp: Vec3,
  time: DampingConstant = 0,
): void {
  vec3.transformQuat(scratchTargetForward, forwardAxis, rotation);
  easeToward(state, targetRotation, scratchTargetForward, referenceUp, time);
}

/** Moves `pan` and `tilt` so a camera at `position` looks at `point`, right away or eased with `time`. */
export function lookAt(
  state: PanTiltState,
  targetRotation: Quat | null,
  position: Vec3,
  point: Vec3,
  referenceUp: Vec3,
  time: DampingConstant = 0,
): void {
  vec3.subtract(scratchTargetForward, point, position);
  if (vec3.squaredLength(scratchTargetForward) < epsilon) return;
  vec3.normalize(scratchTargetForward, scratchTargetForward);
  easeToward(state, targetRotation, scratchTargetForward, referenceUp, time);
}

/** Moves `pan` and `tilt` until the camera looks along the unit `direction`. */
function easeToward(
  state: PanTiltState,
  targetRotation: Quat | null,
  direction: Vec3,
  referenceUp: Vec3,
  time: DampingConstant,
): void {
  referenceFrame(scratchFrame, targetRotation, referenceUp);
  vec3.transformQuat(scratchForward, forwardAxis, scratchFrame);

  projectOnPlane(scratchA, scratchForward, referenceUp);
  projectOnPlane(scratchB, direction, referenceUp);
  let panRawDeg = 0;
  if (vec3.squaredLength(scratchA) > epsilon && vec3.squaredLength(scratchB) > epsilon) {
    panRawDeg = radiansToDegrees(vec3.signedAngle(scratchA, scratchB, referenceUp));
  }

  quat.setAxisAngle(scratchAxisRotation, referenceUp, degreesToRadians(panRawDeg));
  vec3.transformQuat(scratchForward, scratchForward, scratchAxisRotation);
  vec3.cross(scratchRight, referenceUp, scratchForward);
  let tiltDeg = 0;
  if (vec3.squaredLength(scratchRight) > epsilon) {
    vec3.normalize(scratchRight, scratchRight);
    tiltDeg = radiansToDegrees(vec3.signedAngle(scratchForward, direction, scratchRight));
  }

  // pan.value grows in the opposite direction from a standard signed angle around referenceUp.
  inputAxis.easeTo(state.pan, -panRawDeg, time);
  inputAxis.easeTo(state.tilt, tiltDeg, time);
}
