import { clamp, quat, vec3, vec4, type Quat, type Vec3 } from 'math';
import { spring, type Spring } from 'math/time';

/** Damping time, optionally asymmetric for widening and narrowing gaps. */
export type DampingConstant = number | { into: number; from: number };

/** Damper memory: a math `Spring<number>` plus asymmetric damping and snap state. */
export type DamperState = Spring<number> & { previousDistance: number; hasUpdated: boolean };

export const createState = (value = 0): DamperState => ({
  value,
  velocity: 0,
  previousDistance: 0,
  hasUpdated: false,
});

/** Reset the state so the next call snaps to the target. */
export function reset(state: DamperState): void {
  state.velocity = 0;
  state.previousDistance = 0;
  state.hasUpdated = false;
}

/** Critically damped spring step with target snapping. Mutates and returns `state`. */
export function damp(
  state: DamperState,
  target: number,
  damping: DampingConstant,
  dt: number,
  maxSpeed = Infinity,
  epsilon = 1e-4,
): DamperState {
  if (!state.hasUpdated) {
    state.hasUpdated = true;
    state.value = target;
    return state;
  }

  // Prevent a negative time step from amplifying the response.
  dt = Math.max(0, dt);

  const current = state.value;
  const distance = Math.abs(target - current);

  if (distance < epsilon) {
    state.velocity = 0;
    state.previousDistance = 0;
    state.value = target;
    return state;
  }

  // Select the damping time for the direction of travel.
  const smoothTime =
    typeof damping === 'number' ? damping : distance > state.previousDistance ? damping.into : damping.from;
  state.previousDistance = distance;

  const time = Math.max(0.0001, smoothTime);

  const maxChange = maxSpeed * Math.max(time, dt);
  const change = clamp(current - target, -maxChange, maxChange);
  spring.damp(state, current - change, time, dt);

  // Snap instead of oscillating after an overshoot.
  if (target - current > 0 === state.value > target) {
    state.value = target;
    state.velocity = 0;
  }

  return state;
}

/** One damper per Cartesian component. */
export type Vector3DamperState = { x: DamperState; y: DamperState; z: DamperState };

export const createVector3State = (): Vector3DamperState => ({
  x: createState(),
  y: createState(),
  z: createState(),
});

/** Reset all three component dampers. */
export function resetVector3(state: Vector3DamperState): void {
  reset(state.x);
  reset(state.y);
  reset(state.z);
}

/** Damps the components of `out` toward `target` independently. Mutates and returns `out`. */
export function dampVector3(
  state: Vector3DamperState,
  out: Vec3,
  target: Vec3,
  damping: DampingConstant,
  dt: number,
  maxSpeed = Infinity,
): Vec3 {
  if (typeof damping === 'number' && damping <= 0) return vec3.copy(out, target);

  state.x.value = out[0];
  state.y.value = out[1];
  state.z.value = out[2];
  out[0] = damp(state.x, target[0], damping, dt, maxSpeed).value;
  out[1] = damp(state.y, target[1], damping, dt, maxSpeed).value;
  out[2] = damp(state.z, target[2], damping, dt, maxSpeed).value;
  return out;
}

const scratchOutInverse: Quat = [0, 0, 0, 1];
const scratchDelta: Quat = [0, 0, 0, 1];
const scratchAxis: Vec3 = [0, 0, 0];
const scratchStep: Quat = [0, 0, 0, 1];

/** Damps `out` toward `target` along the shortest angular delta. Mutates and returns `out`. */
export function dampQuaternion(
  state: DamperState,
  out: Quat,
  target: Quat,
  damping: DampingConstant,
  dt: number,
  maxSpeed = Infinity,
): Quat {
  if (typeof damping === 'number' && damping <= 0) return vec4.copy(out, target);

  // Compute the shortest rotation from out to target.
  quat.conjugate(scratchOutInverse, out);
  quat.multiply(scratchDelta, target, scratchOutInverse);
  if (scratchDelta[3] < 0) vec4.negate(scratchDelta, scratchDelta);

  const angle = 2 * Math.acos(clamp(scratchDelta[3], -1, 1));
  if (angle < 1e-5) {
    // Keep the spring state ready for a later reset.
    state.value = 0;
    damp(state, 0, damping, dt);
    state.velocity = 0;
    return vec4.copy(out, target);
  }

  state.value = 0;
  const dampedAngle = damp(state, angle, damping, dt, maxSpeed).value;
  const halfSin = Math.sin(angle / 2);
  vec3.set(scratchAxis, scratchDelta[0] / halfSin, scratchDelta[1] / halfSin, scratchDelta[2] / halfSin);
  return quat.multiply(out, quat.setAxisAngle(scratchStep, scratchAxis, dampedAngle), out);
}
