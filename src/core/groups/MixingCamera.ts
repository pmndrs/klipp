import type { CameraState } from '../cameraState';
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

  protected override writeShot(out: CameraState): void {
    mixing.mix(out, this, this.children.state.cameras);
  }
}
