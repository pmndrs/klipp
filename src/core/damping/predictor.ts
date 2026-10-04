import { vec3, type Vec3 } from 'math';

import * as damping from './damping';
import type { Vector3DamperState } from './damping';

/** Velocity tracking state for position extrapolation. */
export type PredictorState = {
  velocity: Vec3;
  previousPosition: Vec3;
  velocityDamper: Vector3DamperState;
  hasPosition: boolean;
};

export const create = (): PredictorState => ({
  velocity: [0, 0, 0],
  previousPosition: [0, 0, 0],
  velocityDamper: damping.createVector3State(),
  hasPosition: false,
});

/** Clear the tracked velocity and position history. */
export function reset(state: PredictorState): void {
  vec3.set(state.velocity, 0, 0, 0);
  damping.resetVector3(state.velocityDamper);
  state.hasPosition = false;
}

const scratchRawVelocity: Vec3 = [0, 0, 0];

/** Add a position sample and update the tracked velocity. */
export function addPosition(state: PredictorState, position: Vec3, dt: number, smoothing: number): void {
  if (!state.hasPosition) {
    state.hasPosition = true;
    vec3.copy(state.previousPosition, position);
    return;
  }

  dt = Math.max(0, dt);
  if (dt > 0) {
    vec3.scale(scratchRawVelocity, vec3.subtract(scratchRawVelocity, position, state.previousPosition), 1 / dt);
    const slowing = vec3.squaredLength(scratchRawVelocity) < vec3.squaredLength(state.velocity);
    damping.dampVector3(state.velocityDamper, state.velocity, scratchRawVelocity, smoothing / (slowing ? 30 : 10), dt);
  }
  vec3.copy(state.previousPosition, position);
}

/** Write the predicted offset `time` seconds ahead into `out`. */
export function predictDelta(out: Vec3, state: PredictorState, time: number): Vec3 {
  return vec3.scale(out, state.velocity, time);
}
