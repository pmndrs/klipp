import { CameraOffset } from './CameraOffset';
import { GroupFraming } from './GroupFraming';
import { Lens } from './Lens';

/** Extensions run after Body/Aim and before Noise; multiple extensions can be registered. */
export const Extension = {
  CameraOffset,
  GroupFraming,
  Lens,
};
