import type { CameraState } from '../cameraState';

import type { DampingConstant } from '../damping/damping';
import { applyAxisSettings } from '../input/applyAxisSettings';
import type { InputAxisSettings } from '../input/axis';
import type { InputAxisOwner } from '../input/InputAxisOwner';

import * as lens from './lens';
import type { LensParams } from './lens';

export type LensOptions = Partial<LensParams> & {
  /** Settings of the `zoom` axis, the natural log of the magnification. */
  zoom?: InputAxisSettings;
};

/** Overrides lens fields with independent damping, and magnifies the view with the `zoom` input axis. */
export class LensExtension implements LensParams, InputAxisOwner {
  declare fov?: number;
  declare orthographicSize?: number;
  declare near?: number;
  declare far?: number;
  declare fovDamping: DampingConstant;
  declare orthographicSizeDamping: DampingConstant;
  declare nearDamping: DampingConstant;
  declare farDamping: DampingConstant;
  declare fovMaxSpeed: number;
  declare orthographicSizeMaxSpeed: number;
  declare nearMaxSpeed: number;
  declare farMaxSpeed: number;

  readonly state = lens.createState();
  readonly zoom = this.state.zoom;
  readonly inputAxes = { zoom: this.zoom };
  readonly applyAfter = 'start';

  constructor(options?: LensOptions) {
    Object.assign(this, lens.createParams(options));
    applyAxisSettings(this.zoom, lens.createAxisSettings().zoom, options?.zoom);
    this.zoom.setValue(this.zoom.center);
  }

  update = (out: CameraState, dt: number, justActivated: boolean): boolean =>
    lens.update(out, this.state, this, dt, justActivated);

  primeFrom = (initialState: Partial<CameraState>): void => lens.prime(this.state, initialState);
}
