import { HardLookAt } from './HardLookAt';
import { PanTilt } from './PanTilt';
import { RotateWithFollowTarget } from './RotateWithFollowTarget';
import { RotationComposer } from './RotationComposer';
import { SplineDollyLookAtTargets } from './SplineDollyLookAtTargets';

/** Aim components control a `<VirtualCamera>`'s rotation. Use at most one per camera. */
export const Aim = {
  HardLookAt,
  RotateWithFollowTarget,
  RotationComposer,
  PanTilt,
  SplineDollyLookAtTargets,
};
