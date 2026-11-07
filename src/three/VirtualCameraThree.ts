import { quat, type Quat } from 'math';
import { Vector3, type Quaternion } from 'three';

import type { CameraMixer } from '../core/CameraMixer';
import type { CameraState } from '../core/cameraState';
import { attachTo, prepare } from '../core/internal';
import { VirtualCamera, type CameraPiece } from '../core/VirtualCamera';
import type { VirtualCameraOptions } from '../core/VirtualCameraBase';

import { resolveQuat } from './resolve/resolveQuat';
import { resolveVector3, type Vector3Like } from './resolve/resolveVector3';
import { TargetSlots } from './resolve/TargetSlots';

/** A starting pose and lens, with three.js vector shorthand. */
export type InitialCameraState = Partial<
  Omit<CameraState, 'position' | 'quaternion' | 'target' | 'lookAtTarget' | 'referenceUp'>
> & {
  position?: Vector3Like;
  quaternion?: Quaternion | Quat;
  target?: Vector3Like;
  lookAtTarget?: Vector3Like;
  referenceUp?: Vector3Like;
};

export type VirtualCameraThreeOptions = Omit<VirtualCameraOptions, 'initialState'> & {
  /** Starting pose, applied on creation. Defaults to the real camera's pose. */
  initialState?: InitialCameraState;
};

const scratch = new Vector3();

/** `VirtualCamera` for three.js: points every piece's target at its slot in the registry of the `KlippThree` on top. */
export class VirtualCameraThree extends VirtualCamera {
  private readonly targetSlots = new TargetSlots();

  constructor(name: string, options: VirtualCameraThreeOptions = {}) {
    super(name, { ...options, initialState: options.initialState && resolveInitialState(options.initialState) });
  }

  override [attachTo](mixer: CameraMixer | null): void {
    this.targetSlots.releaseAll();
    super[attachTo](mixer);
    this.targetSlots.attach(this.klipp);
  }

  override [prepare](width: number, height: number, orthographic: boolean): void {
    super[prepare](width, height, orthographic);
    this.targetSlots.sync(this.pieces);
  }

  protected override removePiece(piece: CameraPiece): void {
    super.removePiece(piece);
    this.targetSlots.release(piece);
  }
}

/** `initialState` with every vector shorthand resolved to tuples. */
export function resolveInitialState(initialState: InitialCameraState): Partial<CameraState> {
  const { position, quaternion, target, lookAtTarget, referenceUp, ...rest } = initialState;
  const resolved: Partial<CameraState> = { ...rest };
  if (position) resolved.position = resolveVector3(scratch, position).toArray();
  if (quaternion) resolved.quaternion = resolveQuat(quat.create(), quaternion);
  if (target) resolved.target = resolveVector3(scratch, target).toArray();
  if (lookAtTarget) resolved.lookAtTarget = resolveVector3(scratch, lookAtTarget).toArray();
  if (referenceUp) resolved.referenceUp = resolveVector3(scratch, referenceUp).toArray();
  return resolved;
}
