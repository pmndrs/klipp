import * as orbitFollow from '../../core/body/orbitFollow';
import * as targetPose from '../../core/targetPose';
import type { CameraMixer } from '../../core/CameraMixer';
import { KlippControls, type KlippControlsOptions } from '../../core/controls/KlippControls';
import { attachTo, prepare } from '../../core/internal';
import type { TargetPose } from '../../core/targetPose';
import type { CameraPiece } from '../../core/VirtualCamera';

import { readTargetPose } from '../readTargetPose';
import { resolveInitialState, type InitialCameraState } from '../VirtualCameraThree';

import { optionalVec3, type Vector3Like } from '../resolve/resolveVector3';
import type { Target } from '../resolve/Target';
import type { TargetSlot } from '../resolve/TargetRegistry';
import { TargetSlots } from '../resolve/TargetSlots';

type OrbitOptions = NonNullable<KlippControlsOptions['orbit']>;

export type KlippControlsThreeOptions = Omit<KlippControlsOptions<Target>, 'initialState' | 'orbit'> & {
  /** Starting pose, applied on creation. Defaults to the real camera's pose. */
  initialState?: InitialCameraState;
  /** Settings of the orbit around the target. Its radius follows `distance` and `zoom`. */
  orbit?: Omit<OrbitOptions, 'targetOffset'> & { targetOffset?: Vector3Like };
};

/** `KlippControls` orbiting an `Object3D`, ref or fixed point. Without a target, it orbits the world origin. */
export class KlippControlsThree extends KlippControls<Target> {
  targetSlot: TargetSlot | null = null;
  private readonly targetSlots = new TargetSlots();
  private readonly pose = targetPose.create();

  constructor(name: string, { initialState, orbit, ...options }: KlippControlsThreeOptions = {}) {
    super(name, {
      ...options,
      initialState: initialState && resolveInitialState(initialState),
      orbit: orbit && { ...orbit, targetOffset: optionalVec3(orbit.targetOffset) },
    });
  }

  override [attachTo](mixer: CameraMixer | null): void {
    this.targetSlots.releaseAll();
    super[attachTo](mixer);
    this.targetSlots.attach(this.klipp);
  }

  override [prepare](width: number, height: number, orthographic: boolean): void {
    super[prepare](width, height, orthographic);
    this.targetSlots.sync(this.pieces);
    this.targetSlots.syncReader(this);
  }

  protected override removePiece(piece: CameraPiece): void {
    super.removePiece(piece);
    this.targetSlots.release(piece);
  }

  protected override readTarget(): TargetPose | null {
    const withRotation = orbitFollow.needsTargetRotation(this.orbit.state, this.orbit);
    return readTargetPose(this.pose, this.target, withRotation, this.targetSlot) ? this.pose : null;
  }
}
