import { CameraOffset } from './CameraOffset';
import { GroupFraming } from './GroupFraming';
import { Lens } from './Lens';
import { Recomposer } from './Recomposer';

/** Extensions run after Body/Aim and before Noise; multiple extensions can be registered. */
export const Extension = {
  CameraOffset,
  GroupFraming,
  Lens,
  Recomposer,
};
