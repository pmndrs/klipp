import { CameraOffset } from './CameraOffset';
import { Confiner } from './Confiner';
import { FollowZoom } from './FollowZoom';
import { GroupFraming } from './GroupFraming';
import { Lens } from './Lens';
import { Recomposer } from './Recomposer';
import { SplineRoll } from './SplineRoll';

/** Extensions adjust the shot around the Body and Aim, before Noise; one camera can have several. */
export const Extension = {
  CameraOffset,
  Confiner,
  FollowZoom,
  GroupFraming,
  Lens,
  Recomposer,
  SplineRoll,
};
