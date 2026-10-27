import { Follow } from './Follow';
import { HardLockToTarget } from './HardLockToTarget';
import { OrbitFollow } from './OrbitFollow';
import { PositionComposer } from './PositionComposer';
import { SplineDolly } from './SplineDolly';

/** Body components control a `<VirtualCamera>`'s position. Use at most one per camera. */
export const Body = {
  HardLockToTarget,
  Follow,
  PositionComposer,
  OrbitFollow,
  SplineDolly,
};
