import type { Vec3 } from 'math';

import type { CameraState } from '../CameraState';
import type { TargetPose } from '../TargetPose';

import type { DampingConstant } from '../damping/damping';
import type { InputAxisOwner } from '../input/InputAxisOwner';

import * as orbitFollow from './orbitFollow';
import type { BindingMode } from './BindingModes';
import type { OrbitFollowParams } from './orbitFollow';

export type OrbitFollowOptions = Partial<OrbitFollowParams>;

/**
 * Orbits a target on a sphere driven by three `InputAxis`: `horizontal`, `vertical` and `radial`.
 * Layers override `readTarget`.
 */
export class OrbitFollowBody<T = TargetPose | null> implements OrbitFollowParams, InputAxisOwner {
  target: T;
  declare radius: number;
  declare targetOffset: Vec3;
  declare bindingMode: BindingMode;
  declare damping: DampingConstant;
  declare maxSpeed: number;

  readonly state = orbitFollow.createState();
  readonly horizontal = this.state.horizontal;
  readonly vertical = this.state.vertical;
  readonly radial = this.state.radial;
  readonly inputAxes = { horizontal: this.horizontal, vertical: this.vertical, radial: this.radial };
  private lastTarget: T | undefined = undefined;

  constructor(target: T, options?: OrbitFollowOptions) {
    this.target = target;
    Object.assign(this, orbitFollow.createParams(options));
  }

  update = (out: CameraState, dt: number, justActivated: boolean): boolean => {
    if (justActivated || this.target !== this.lastTarget) {
      this.lastTarget = this.target;
      this.state.tracker.assigned = false;
    }
    return orbitFollow.update(out, this.state, this, this.readTarget(), dt, justActivated);
  };

  /** This frame's target pose, or `null` when there is none. */
  protected readTarget(): TargetPose | null {
    return this.target as TargetPose | null;
  }
}
