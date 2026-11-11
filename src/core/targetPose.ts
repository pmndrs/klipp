import { quat, vec3, type Quat, type Vec3 } from 'math';

import * as targetExtent from './targetExtent';
import type { TargetExtent } from './targetExtent';

/**
 * A target's world transform and how far it reaches. `rotation` is only meaningful when `hasRotation` is true
 * (not for fixed points). `extent` is only read by the composers.
 */
export type TargetPose = { position: Vec3; rotation: Quat; hasRotation: boolean; extent: TargetExtent };

export const create = (): TargetPose => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  hasRotation: false,
  extent: targetExtent.create(),
});

export function copy(out: TargetPose, source: TargetPose): TargetPose {
  vec3.copy(out.position, source.position);
  quat.copy(out.rotation, source.rotation);
  out.hasRotation = source.hasRotation;
  targetExtent.copy(out.extent, source.extent);
  return out;
}
