import type { Klipp } from '../../core/Klipp';

import type { KlippThree } from '../KlippThree';

import { TargetGroup } from '../extension/TargetGroup';

import { isVector3Like } from './resolveVector3';
import type { Target } from './Target';
import type { RegisteredTarget, SlottedTargets, TargetRegistry, TargetSlot } from './TargetRegistry';

/** Reads one target, from `targetSlot` when the registry gave it one. */
export type TargetReader = { target: Target; targetSlot: TargetSlot | null };

const isRegistrable = (target: Target): target is RegisteredTarget => target != null && !isVector3Like(target);
const reads = (value: object): value is TargetReader => 'targetSlot' in value;
const isSlotted = (value: object): value is SlottedTargets => 'targetSlots' in value;

/** What reads several targets in `piece`: the piece itself, or the `TargetGroup` it frames. */
function slottedIn(piece: object): SlottedTargets | null {
  if (isSlotted(piece)) return piece;
  return 'group' in piece && piece.group instanceof TargetGroup ? piece.group : null;
}

/** Points the targets of a camera's pieces at their slots in the registry of the `KlippThree` on top. */
export class TargetSlots {
  private registry: TargetRegistry | null = null;
  private readonly slots = new Map<TargetReader, Target>();
  private readonly slotted = new Map<SlottedTargets, RegisteredTarget[]>();

  /** Takes slots from `klipp`'s registry from now on. */
  attach(klipp: Klipp | null): void {
    this.registry = klipp && 'targets' in klipp ? (klipp as KlippThree).targets : null;
  }

  /** Gives every piece that reads targets the slots of its current ones. */
  sync(pieces: Iterable<object>): void {
    for (const piece of pieces) {
      if (reads(piece)) this.syncReader(piece);
      const slotted = slottedIn(piece);
      if (slotted) this.syncSlotted(slotted);
    }
  }

  /** Gives `reader` the slot of its current target. */
  syncReader(reader: TargetReader): void {
    if (!this.registry) return;
    const { target } = reader;
    if (this.slots.has(reader) && this.slots.get(reader) === target) return;
    const previous = this.slots.get(reader);
    if (previous !== undefined && isRegistrable(previous)) this.registry.release(previous);
    this.slots.set(reader, target);
    reader.targetSlot = isRegistrable(target) ? this.registry.acquire(target) : null;
  }

  /** Releases every slot `piece` holds. */
  release(piece: object): void {
    if (reads(piece)) {
      const target = this.slots.get(piece);
      if (target !== undefined) {
        if (isRegistrable(target)) this.registry?.release(target);
        this.slots.delete(piece);
      }
      piece.targetSlot = null;
    }
    const slotted = slottedIn(piece);
    if (slotted) this.releaseSlotted(slotted);
  }

  releaseAll(): void {
    for (const [reader, target] of this.slots) {
      if (isRegistrable(target)) this.registry?.release(target);
      reader.targetSlot = null;
    }
    this.slots.clear();
    for (const slotted of [...this.slotted.keys()]) this.releaseSlotted(slotted);
  }

  private syncSlotted(slotted: SlottedTargets): void {
    if (!this.registry) return;
    const previous = this.slotted.get(slotted);
    const count = slotted.targetCount();
    let registrable = 0;
    let changed = previous === undefined;
    for (let i = 0; i < count; i++) {
      const target = slotted.targetAt(i);
      if (!isRegistrable(target)) continue;
      if (!changed && previous![registrable] !== target) changed = true;
      registrable++;
    }
    if (!changed && previous!.length === registrable) return;

    this.releaseSlotted(slotted);
    const targets: RegisteredTarget[] = [];
    const slots = new Map<Target, TargetSlot>();
    for (let i = 0; i < count; i++) {
      const target = slotted.targetAt(i);
      if (!isRegistrable(target)) continue;
      targets.push(target);
      slots.set(target, this.registry.acquire(target));
    }
    this.slotted.set(slotted, targets);
    slotted.targetSlots = slots;
  }

  private releaseSlotted(slotted: SlottedTargets): void {
    const previous = this.slotted.get(slotted);
    if (!previous) return;
    for (const target of previous) this.registry?.release(target);
    this.slotted.delete(slotted);
    slotted.targetSlots = new Map();
  }
}
