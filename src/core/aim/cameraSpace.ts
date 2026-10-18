import { quat, vec3, type Quat, type Vec3 } from 'math';

const forwardAxis: Vec3 = [0, 0, -1];
const scratchInverse: Quat = [0, 0, 0, 1];
const scratchDirection: Vec3 = [0, 0, 0];
const scratchAxis: Vec3 = [0, 0, 0];
const scratchDelta: Quat = [0, 0, 0, 1];

/** `point` in the space of a camera at `position` turned by `rotation`: x right, y up, looking down -z. */
export function fromWorld(out: Vec3, position: Vec3, rotation: Quat, point: Vec3): Vec3 {
  vec3.subtract(out, point, position);
  return vec3.transformQuat(out, out, quat.conjugate(scratchInverse, rotation));
}

/** Turns `lookAt`, which looks straight at a point, so the point lies along camera-space `direction` instead. */
export function rotateToDirection(out: Quat, lookAt: Quat, direction: Vec3): Quat {
  vec3.normalize(scratchDirection, direction);
  // Not quat.rotationTo: it snaps angles under ~0.08° to identity. `direction` must not point backward.
  vec3.cross(scratchAxis, scratchDirection, forwardAxis);
  const w = vec3.dot(scratchDirection, forwardAxis) + 1;
  quat.normalize(scratchDelta, quat.set(scratchDelta, scratchAxis[0], scratchAxis[1], scratchAxis[2], w));
  return quat.multiply(out, lookAt, scratchDelta);
}
