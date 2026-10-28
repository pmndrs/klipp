import { vec3, type Vec3 } from 'math';

import type { CameraState } from '../cameraState';
import type { BodyPiece } from '../VirtualCamera';

import { SplineDollyBody } from '../body/SplineDollyBody';

import * as splineDollyLookAtTargets from './splineDollyLookAtTargets';
import type { SplineDollyLookAtTarget, SplineDollyLookAtTargetsParams } from './splineDollyLookAtTargets';

export type SplineDollyLookAtTargetsOptions<T = Vec3> = Partial<SplineDollyLookAtTargetsParams<T>>;

/**
 * Looks along the path of the camera's `SplineDollyBody`, or at the targets placed along it. Layers override
 * `readLookAt` to read their own targets.
 */
export class SplineDollyLookAtTargetsAim<T = Vec3> implements SplineDollyLookAtTargetsParams<T> {
  declare targets: SplineDollyLookAtTarget<T>[];
  declare easing: number;
  /** The camera's Body, kept up to date by the camera. */
  cameraBody: BodyPiece | null = null;

  readonly state = splineDollyLookAtTargets.createState();
  private readonly read: SplineDollyLookAtTargetsParams = { targets: [], easing: 0 };
  private readonly pool: SplineDollyLookAtTarget[] = [];

  constructor(options?: SplineDollyLookAtTargetsOptions<T>) {
    Object.assign(this, splineDollyLookAtTargets.createParams<T>(options));
  }

  update = (out: CameraState): void => {
    const dolly = this.cameraBody;
    if (!(dolly instanceof SplineDollyBody) || !dolly.spline) return;
    this.readTargets();
    splineDollyLookAtTargets.update(
      out,
      this.state,
      this.read,
      dolly.spline,
      dolly.positionUnits,
      dolly.state.distance,
    );
  };

  /** Writes the point `lookAt` stands for into `out`. Returns `false` when it can't be read this frame. */
  protected readLookAt(out: Vec3, lookAt: T): boolean {
    vec3.copy(out, lookAt as Vec3);
    return true;
  }

  private readTargets(): void {
    const { targets, read, pool } = this;
    read.easing = this.easing;
    read.targets.length = 0;
    for (let i = 0; i < targets.length; i++) {
      if (pool.length <= i) pool.push({ position: 0, lookAt: [0, 0, 0] });
      const target = pool[i];
      if (!this.readLookAt(target.lookAt, targets[i].lookAt)) continue;
      target.position = targets[i].position;
      read.targets.push(target);
    }
  }
}
