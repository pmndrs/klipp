import type { Vec3 } from 'math';
import { Vector3 } from 'three';

import { SplineDollyLookAtTargetsAim } from '../../core/aim/SplineDollyLookAtTargetsAim';

import { resolveTargetPosition, type Target } from '../resolve/Target';
import type { SlottedTargets, TargetSlot } from '../resolve/TargetRegistry';

const position = new Vector3();
const noSlots: ReadonlyMap<Target, TargetSlot> = new Map();

/** Looks along the camera's spline dolly path, or at `Object3D`s, refs or fixed points placed along it. */
export class SplineDollyLookAtTargetsAimThree extends SplineDollyLookAtTargetsAim<Target> implements SlottedTargets {
  targetSlots: ReadonlyMap<Target, TargetSlot> = noSlots;

  targetCount = (): number => this.targets.length;

  targetAt = (index: number): Target => this.targets[index].lookAt;

  protected override readLookAt(out: Vec3, lookAt: Target): boolean {
    if (!resolveTargetPosition(position, lookAt, this.targetSlots.get(lookAt) ?? null)) return false;
    position.toArray(out);
    return true;
  }
}
