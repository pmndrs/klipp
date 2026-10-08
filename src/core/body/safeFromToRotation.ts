import { quat, vec3, type Quat, type Vec3 } from 'math';

const scratchProjectedFrom: Vec3 = [0, 0, 0];
const scratchProjectedTo: Vec3 = [0, 0, 0];
const scratchAxis: Vec3 = [0, 0, 0];
const scratchPitch: Quat = [0, 0, 0, 1];

/** Rotation from `from` to `to` as a turn around `up` followed by a pitch, so it never adds roll. */
export function safeFromToRotation(out: Quat, from: Vec3, to: Vec3, up: Vec3): Quat {
  vec3.scaleAndAdd(scratchProjectedFrom, from, up, -vec3.dot(from, up));
  vec3.scaleAndAdd(scratchProjectedTo, to, up, -vec3.dot(to, up));
  if (vec3.squaredLength(scratchProjectedFrom) < 1e-10 || vec3.squaredLength(scratchProjectedTo) < 1e-10) {
    vec3.cross(scratchAxis, from, to);
    if (vec3.squaredLength(scratchAxis) < 1e-10) vec3.copy(scratchAxis, up);
    return quat.setAxisAngle(out, vec3.normalize(scratchAxis, scratchAxis), vec3.angle(from, to));
  }
  vec3.normalize(scratchAxis, vec3.cross(scratchAxis, up, from));
  quat.setAxisAngle(scratchPitch, scratchAxis, vec3.angle(to, up) - vec3.angle(from, up));
  quat.setAxisAngle(out, up, vec3.signedAngle(scratchProjectedFrom, scratchProjectedTo, up));
  return quat.multiply(out, out, scratchPitch);
}
