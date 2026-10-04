import { quat, vec3 } from 'math';
import type { CameraState } from '../CameraState';

export type MixingCameraSlot = {
  cameraId: string;
  /** Live reference - read fresh every `tick()`. */
  state: CameraState;
  /** Mutable - this camera's contribution is `weight / sum(weights)`. Zero/negative = no contribution. */
  weight: number;
};

/**
 * Writes the weighted mix of `slots` into `out`, weighted by `weight / sum(weights)`. If every weight is
 * zero (or negative), `out` is left unchanged.
 */
export function mix(out: CameraState, slots: readonly MixingCameraSlot[]): CameraState {
  let totalWeight = 0;
  for (const slot of slots) if (slot.weight > 0) totalWeight += slot.weight;
  if (totalWeight <= 0) return out;

  vec3.set(out.position, 0, 0, 0);
  let fov = 0;
  let near = 0;
  let far = 0;
  for (const slot of slots) {
    if (slot.weight <= 0) continue;
    const share = slot.weight / totalWeight;
    vec3.scaleAndAdd(out.position, out.position, slot.state.position, share);
    fov += slot.state.fov * share;
    near += slot.state.near * share;
    far += slot.state.far * share;
  }
  out.fov = fov;
  out.near = near;
  out.far = far;

  let accumulatedWeight = 0;
  for (const slot of slots) {
    if (slot.weight <= 0) continue;
    if (accumulatedWeight === 0) {
      quat.copy(out.quaternion, slot.state.quaternion);
    } else {
      const t = slot.weight / (accumulatedWeight + slot.weight);
      quat.slerp(out.quaternion, out.quaternion, slot.state.quaternion, t);
    }
    accumulatedWeight += slot.weight;
  }

  return out;
}
