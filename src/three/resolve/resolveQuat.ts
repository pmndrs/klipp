import { vec4, type Quat } from 'math';
import { Quaternion } from 'three';

/** Resolve a `Quaternion` or an `[x, y, z, w]` tuple into the tuple `out`. */
export function resolveQuat(out: Quat, value: Quaternion | Quat): Quat {
  if (value instanceof Quaternion) return vec4.set(out, value.x, value.y, value.z, value.w);
  return vec4.copy(out, value);
}
