import type { CameraState } from '../CameraState.js';
import type { DampingConstant } from '../damping/damping.js';
import type { LensParams } from './lens.js';
import * as lens from './lens.js';

export type LensOptions = Partial<LensParams>;

/** Overrides lens fields with independent damping. */
export class LensExtension implements LensParams {
  declare fov?: number;
  declare near?: number;
  declare far?: number;
  declare fovDamping: DampingConstant;
  declare nearDamping: DampingConstant;
  declare farDamping: DampingConstant;
  declare fovMaxSpeed: number;
  declare nearMaxSpeed: number;
  declare farMaxSpeed: number;

  readonly state = lens.createState();

  constructor(options?: LensOptions) {
    Object.assign(this, lens.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): boolean =>
    lens.update(out, this.state, this, dt, justActivated);
}
