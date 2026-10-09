import { mat4, quat, vec3, type Mat4, type Quat, type Vec3 } from 'math';

const yAxis: Vec3 = [0, 1, 0];
const forwardAxis: Vec3 = [0, 0, -1];
const scratchDirection: Vec3 = [0, 0, 0];
const scratchCross: Vec3 = [0, 0, 0];
const scratchUp: Vec3 = [0, 0, 0];
const scratchLookMatrix: Mat4 = mat4.create();

const isParallel = (direction: Vec3, up: Vec3): boolean =>
  vec3.squaredLength(vec3.cross(scratchCross, direction, up)) < 1e-12 * vec3.squaredLength(direction);

/**
 * The rotation looking from `position` at `target` with `up` on top. Looking along `up`, the screen's top comes
 * from `previous`, so passing over the pole keeps the view steady.
 */
export function lookRotation(out: Quat, position: Vec3, target: Vec3, up: Vec3, previous: Quat): Quat {
  vec3.subtract(scratchDirection, target, position);
  let screenUp = up;
  if (isParallel(scratchDirection, up)) {
    vec3.transformQuat(scratchUp, yAxis, previous);
    if (isParallel(scratchDirection, scratchUp)) vec3.transformQuat(scratchUp, forwardAxis, previous);
    screenUp = scratchUp;
  }
  mat4.targetTo(scratchLookMatrix, position, target, screenUp);
  return quat.fromMat4(out, scratchLookMatrix);
}
