import type { CameraState } from '../cameraState';

import * as confiner from './confiner';
import type { ConfinerBounds, ConfinerParams } from './confiner';

export type ConfinerOptions = Partial<ConfinerParams>;

/** Keeps the camera inside a box or a sphere, before the Aim. Layers override `readBounds` to read their own. */
export class ConfinerExtension<B = ConfinerBounds | null> implements ConfinerParams {
  declare slowingDistance: number;

  bounds: B;
  readonly applyAfter = 'body';

  constructor(bounds: B, options?: ConfinerOptions) {
    this.bounds = bounds;
    Object.assign(this, confiner.createParams(options));
  }

  update = (out: CameraState): void => confiner.update(out, this, this.readBounds());

  /** This frame's bounds, or `null` when there are none. */
  protected readBounds(): ConfinerBounds | null {
    return this.bounds as ConfinerBounds | null;
  }
}
