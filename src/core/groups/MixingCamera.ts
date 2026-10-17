import * as klippState from '../klippState';
import type { CameraState } from '../cameraState';
import { advance, runCameras } from '../internal';
import type { VirtualCameraBase, VirtualCameraOptions } from '../VirtualCameraBase';

import { BlendCurves } from '../blend/BlendCurves';

import * as mixing from './mixing';
import { CameraManager } from './CameraManager';
import type { MixingParams } from './mixing';

export type MixingCameraOptions = VirtualCameraOptions & Partial<MixingParams>;

/** Mixes its children by `weights` into one shot. The child with the highest weight is the live one. */
export class MixingCamera extends CameraManager implements MixingParams {
  declare weights: Record<string, number>;

  constructor(name: string, { weights, ...options }: MixingCameraOptions = {}) {
    super(name, { ...options, defaultBlend: { curve: BlendCurves.cut, time: 0 } });
    Object.assign(this, mixing.createParams({ weights }));
  }

  protected chooseCamera(): string | null {
    return mixing.dominant(this, this.children.state.cameras);
  }

  protected override contributes(camera: VirtualCameraBase): boolean {
    return this.weights[camera.name] > 0;
  }

  override update = (out: CameraState, dt: number): boolean => {
    klippState.setActive(this.children.state, this.chooseCamera());
    const stillInFlight = this.children[runCameras](dt);
    this.children[advance](dt);
    mixing.mix(out, this, this.children.state.cameras);
    return stillInFlight;
  };
}
