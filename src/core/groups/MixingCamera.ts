import type { CameraState } from '../CameraState';
import * as cameraState from '../CameraState';
import type { MixingCameraSlot } from './mixCameraStates';

const MAX_SLOTS = 8;

/**
 * Continuous N-way cross-fade of up to 8 fixed slots, weighted by `weight / sum(weights)` - unlike
 * `Klipp`/`Sequencer`, there's no winner and no time-driven curve; the caller drives the mix by
 * mutating `weight` directly (e.g. an authored slider blend between two cameras).
 *
 * Position/lens average in a plain weighted sum. Quaternions have no closed-form weighted average, so
 * they're combined incrementally: start from the first contributing camera, then `slerp` each next one
 * in by its share of the weight accumulated so far - exact for 2 cameras, a standard approximation for
 * more.
 */
export class MixingCamera {
  private readonly slots: MixingCameraSlot[];
  private readonly output: CameraState = cameraState.create();

  constructor(slots: MixingCameraSlot[]) {
    if (slots.length === 0) throw new Error('MixingCamera needs at least one slot.');
    if (slots.length > MAX_SLOTS) throw new Error(`MixingCamera supports at most ${MAX_SLOTS} slots.`);
    this.slots = slots;
  }

  /** Recomputes the weighted mix from the slots' current weights and returns it - same scratch instance
   *  every call. If every weight is zero (or negative), returns the previous output unchanged. */
  tick(): CameraState {
    return cameraState.mix(this.output, this.slots);
  }
}
