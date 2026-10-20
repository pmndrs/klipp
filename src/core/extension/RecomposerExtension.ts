import type { CameraState } from '../cameraState';

import * as recomposer from './recomposer';
import type { RecomposerParams } from './recomposer';

export type RecomposerOptions = Partial<RecomposerParams>;

/** Turns, rolls and zooms the finished shot, for a final touch on a composition. */
export class RecomposerExtension implements RecomposerParams {
  declare tilt: number;
  declare pan: number;
  declare dutch: number;
  declare zoomScale: number;

  constructor(options?: RecomposerOptions) {
    Object.assign(this, recomposer.createParams(options));
  }

  update = (out: CameraState): void => recomposer.update(out, this);
}
