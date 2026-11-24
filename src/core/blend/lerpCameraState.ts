import {
  clamp,
  deltaAngle,
  lerp as lerpNumber,
  quat,
  spherical,
  vec2,
  vec3,
  vec4,
  type Quat,
  type Spherical,
  type Vec3,
} from 'math';

import type { CameraState } from '../cameraState';
import { upFrame } from '../upFrame';

import { BlendHints } from './BlendHints';

const negatedB: Quat = [0, 0, 0, 1];

const scratchOffsetA: Vec3 = [0, 0, 0];
const scratchOffsetB: Vec3 = [0, 0, 0];
const scratchTarget: Vec3 = [0, 0, 0];
const scratchSpherical: Spherical = [0, 0, 0];
const scratchLookAtCurrent: Quat = [0, 0, 0, 1];
const scratchDeltaA: Quat = [0, 0, 0, 1];
const scratchDeltaB: Quat = [0, 0, 0, 1];
const scratchPitch: Quat = [0, 0, 0, 1];
const xAxis: Vec3 = [1, 0, 0];
const yAxis: Vec3 = [0, 1, 0];
/** The frame of the scene up the last arc turns around, and its inverse. */
const arcUp: Quat = [0, 0, 0, 1];
const arcUpInverse: Quat = [0, 0, 0, 1];

/** Interpolates look-at rotation while preserving each state's additional aim offset. */
function lerpLookAtRotation(out: Quat, a: CameraState, b: CameraState, t: number, current: CameraState): void {
  quat.targetTo(scratchDeltaA, a.position, a.lookAtTarget, a.referenceUp);
  quat.multiply(scratchDeltaA, quat.conjugate(scratchDeltaA, scratchDeltaA), a.quaternion);
  quat.targetTo(scratchDeltaB, b.position, b.lookAtTarget, b.referenceUp);
  quat.multiply(scratchDeltaB, quat.conjugate(scratchDeltaB, scratchDeltaB), b.quaternion);
  quat.targetTo(scratchLookAtCurrent, current.position, current.lookAtTarget, current.referenceUp);
  quat.multiply(out, scratchLookAtCurrent, quat.slerp(out, scratchDeltaA, scratchDeltaB, t));
}

/** An angle of the arc at both ends of the blend and now. */
type ArcAngle = { start: number; end: number; now: number };

/** The bearing and polar angle of the last arc. */
const arcTheta: ArcAngle = { start: 0, end: 0, now: 0 };
const arcPhi: ArcAngle = { start: 0, end: 0, now: 0 };

/** The rotation of a camera at `theta` and `phi` around a point in the frame of the last arc, looking at it. */
function arcFrame(out: Quat, theta: number, phi: number): Quat {
  quat.multiply(out, arcUp, quat.setAxisAngle(out, yAxis, theta));
  return quat.multiply(out, out, quat.setAxisAngle(scratchPitch, xAxis, phi - Math.PI / 2));
}

/** Interpolates rotation along the last arc while preserving each state's rotation beyond looking at its center. */
function lerpArcRotation(out: Quat, a: CameraState, b: CameraState, t: number): void {
  arcFrame(scratchDeltaA, arcTheta.start, arcPhi.start);
  quat.multiply(scratchDeltaA, quat.conjugate(scratchDeltaA, scratchDeltaA), a.quaternion);
  arcFrame(scratchDeltaB, arcTheta.end, arcPhi.end);
  quat.multiply(scratchDeltaB, quat.conjugate(scratchDeltaB, scratchDeltaB), b.quaternion);
  arcFrame(scratchLookAtCurrent, arcTheta.now, arcPhi.now);
  quat.multiply(out, scratchLookAtCurrent, quat.slerp(out, scratchDeltaA, scratchDeltaB, t));
}

/** Below this radius, angular values are not meaningful. */
const RADIUS_EPSILON = 1e-4;

/** How far round the target the last frame of a blend turned, carried to the next frame; `NaN` before the first. */
export type AngleContinuity = { delta: number };

/**
 * Keeps the valid side's angle when the other radius is too small. With `continuity`, keeps turning the way the last
 * frame did, past half a turn too, instead of flipping round to the other side.
 */
function blendAngle(
  out: ArcAngle,
  angleA: number,
  radiusA: number,
  angleB: number,
  radiusB: number,
  t: number,
  continuity?: AngleContinuity,
): number {
  const validA = radiusA >= RADIUS_EPSILON;
  const validB = radiusB >= RADIUS_EPSILON;
  if (!validA || !validB) {
    if (continuity) continuity.delta = NaN;
    out.start = out.end = out.now = validA ? angleA : angleB;
    return out.now;
  }
  const shortest = deltaAngle(angleA, angleB);
  const last = continuity?.delta ?? NaN;
  const delta = Number.isNaN(last) ? shortest : last + deltaAngle(last, shortest);
  if (continuity) continuity.delta = delta;
  out.start = angleA;
  out.end = angleA + delta;
  out.now = angleA + delta * t;
  return out.now;
}

/** Whether `position` is far enough from `pivot` to arc around it. */
const isAround = (position: Vec3, pivot: Vec3): boolean =>
  vec3.squaredDistance(position, pivot) >= RADIUS_EPSILON * RADIUS_EPSILON;

/** Interpolates the camera offset around `pivotA` and `pivotB` in spherical or cylindrical coordinates. */
function lerpPositionAroundTarget(
  out: Vec3,
  a: CameraState,
  b: CameraState,
  pivotA: Vec3,
  pivotB: Vec3,
  t: number,
  cylindrical: boolean,
  continuity: AngleContinuity | undefined,
): void {
  vec3.subtract(scratchOffsetA, a.position, pivotA);
  vec3.subtract(scratchOffsetB, b.position, pivotB);
  vec3.transformQuat(scratchOffsetA, scratchOffsetA, arcUpInverse);
  vec3.transformQuat(scratchOffsetB, scratchOffsetB, arcUpInverse);
  // A camera right above or below its pivot has no bearing of its own and takes the other's.
  const flatA = Math.sqrt(scratchOffsetA[0] * scratchOffsetA[0] + scratchOffsetA[2] * scratchOffsetA[2]);
  const flatB = Math.sqrt(scratchOffsetB[0] * scratchOffsetB[0] + scratchOffsetB[2] * scratchOffsetB[2]);
  const theta = blendAngle(
    arcTheta,
    Math.atan2(scratchOffsetA[0], scratchOffsetA[2]),
    flatA,
    Math.atan2(scratchOffsetB[0], scratchOffsetB[2]),
    flatB,
    t,
    continuity,
  );

  if (cylindrical) {
    arcPhi.start = arcPhi.end = arcPhi.now = Math.PI / 2;
    const radius = lerpNumber(flatA, flatB, t);
    vec3.set(
      out,
      radius * Math.sin(theta),
      lerpNumber(scratchOffsetA[1], scratchOffsetB[1], t),
      radius * Math.cos(theta),
    );
  } else {
    const radiusA = vec3.length(scratchOffsetA);
    const radiusB = vec3.length(scratchOffsetB);
    const phi = blendAngle(
      arcPhi,
      Math.atan2(flatA, scratchOffsetA[1]),
      radiusA,
      Math.atan2(flatB, scratchOffsetB[1]),
      radiusB,
      t,
    );
    spherical.toVec3(out, spherical.set(scratchSpherical, lerpNumber(radiusA, radiusB, t), theta, phi));
  }

  vec3.add(out, vec3.transformQuat(out, out, arcUp), vec3.lerp(scratchTarget, pivotA, pivotB, t));
}

/** Interpolates the position, around a target and `up` when `hints` ask for an arc. Returns whether it arced. */
function lerpPosition(
  out: Vec3,
  a: CameraState,
  b: CameraState,
  t: number,
  hints: BlendHints,
  continuity: AngleContinuity | undefined,
  up: Vec3,
): boolean {
  if ((hints & (BlendHints.sphericalPosition | BlendHints.cylindricalPosition)) !== 0) {
    // Only a target away from its camera gives an arc; a camera without one, or standing on it, arcs around the other's.
    const aroundA = a.hasTarget && isAround(a.position, a.target);
    const aroundB = b.hasTarget && isAround(b.position, b.target);
    if (aroundA || aroundB) {
      const cylindrical = (hints & BlendHints.sphericalPosition) === 0;
      const pivotA = aroundA ? a.target : b.target;
      const pivotB = aroundB ? b.target : a.target;
      quat.conjugate(arcUpInverse, upFrame(arcUp, up));
      lerpPositionAroundTarget(out, a, b, pivotA, pivotB, t, cylindrical, continuity);
      return true;
    }
  }
  vec3.lerp(out, a.position, b.position, t);
  return false;
}

function lerpTarget(out: Vec3, a: Vec3, hasA: boolean, b: Vec3, hasB: boolean, t: number): void {
  if (hasA && hasB) vec3.lerp(out, a, b, t);
  else if (hasA) vec3.copy(out, a);
  else if (hasB) vec3.copy(out, b);
}

/** Slerps quaternions without changing the caller-selected sign of `to`. */
function slerpWithContinuity(out: Quat, from: Quat, to: Quat, t: number): void {
  const toX = to[0],
    toY = to[1],
    toZ = to[2],
    toW = to[3];

  const dot = clamp(from[0] * toX + from[1] * toY + from[2] * toZ + from[3] * toW, -1, 1);
  const fromX = from[0],
    fromY = from[1],
    fromZ = from[2],
    fromW = from[3];

  if (Math.abs(dot) < 0.9995) {
    const theta = Math.acos(dot);
    const sin = Math.sin(theta);
    const s = Math.sin((1 - t) * theta) / sin;
    const u = Math.sin(t * theta) / sin;
    vec4.set(out, fromX * s + toX * u, fromY * s + toY * u, fromZ * s + toZ * u, fromW * s + toW * u);
  } else {
    const s = 1 - t;
    vec4.set(out, fromX * s + toX * t, fromY * s + toY * t, fromZ * s + toZ * t, fromW * s + toW * t);
    // Opposite endpoints can cancel out.
    if (vec4.squaredLength(out) === 0) quat.identity(out);
    else quat.normalize(out, out);
  }
}

/**
 * Interpolates a camera state while preserving blend hints and rotation continuity, with hint arcs around `up`. Called
 * every frame of one blend, `continuity` keeps the way round the target from flipping as `b` turns.
 */
export function lerpCameraState(
  out: CameraState,
  a: CameraState,
  b: CameraState,
  t: number,
  hints: BlendHints = BlendHints.none,
  continuity?: AngleContinuity,
  up: Vec3 = yAxis,
): CameraState {
  const clamped = clamp(t, 0, 1);
  const arc = lerpPosition(out.position, a, b, clamped, hints, continuity, up);

  // A target from one side carries over, so a blend that starts from this mix still knows what it moves around.
  lerpTarget(out.target, a.target, a.hasTarget, b.target, b.hasTarget, clamped);
  out.hasTarget = a.hasTarget || b.hasTarget;
  lerpTarget(out.lookAtTarget, a.lookAtTarget, a.hasLookAtTarget, b.lookAtTarget, b.hasLookAtTarget, clamped);
  out.hasLookAtTarget = a.hasLookAtTarget || b.hasLookAtTarget;
  vec3.normalize(out.referenceUp, vec3.lerp(out.referenceUp, a.referenceUp, b.referenceUp, clamped));
  quat.identity(out.rotationDampingBypass);

  const ignoreTarget = (hints & BlendHints.ignoreTarget) !== 0;
  if (a.hasLookAtTarget && b.hasLookAtTarget && !ignoreTarget) {
    lerpLookAtRotation(out.quaternion, a, b, clamped, out);
  } else if (arc && !ignoreTarget) {
    lerpArcRotation(out.quaternion, a, b, clamped);
  } else {
    const bQuaternion =
      vec4.dot(out.quaternion, b.quaternion) < 0
        ? vec4.set(negatedB, -b.quaternion[0], -b.quaternion[1], -b.quaternion[2], -b.quaternion[3])
        : b.quaternion;
    slerpWithContinuity(out.quaternion, a.quaternion, bQuaternion, clamped);
  }

  out.fov = lerpNumber(a.fov, b.fov, clamped);
  out.orthographicSize = lerpNumber(a.orthographicSize, b.orthographicSize, clamped);
  out.near = lerpNumber(a.near, b.near, clamped);
  out.far = lerpNumber(a.far, b.far, clamped);
  vec2.lerp(out.viewOffset, a.viewOffset, b.viewOffset, clamped);
  return out;
}
