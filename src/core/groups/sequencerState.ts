import type { CameraState } from '../CameraState.js';
import type { BlendState } from '../blend/blend.js';
import * as blend from '../blend/blend.js';
import type { BlendDefinition } from '../blend/BlendDefinition.js';

export type SequencerInstruction = {
  cameraId: string;
  /** Live reference - `Sequencer` reads it directly. */
  state: CameraState;
  /** Seconds to hold this camera before advancing. Ignored on the last instruction unless `loop`. */
  hold: number;
  /** Transition into the NEXT instruction. Falls back to `defaultBlend` if omitted. */
  blend?: BlendDefinition;
};

export type SequencerParams = {
  instructions: readonly SequencerInstruction[];
  defaultBlend: BlendDefinition;
  loop: boolean;
};

export type SequencerState = { holdElapsed: number; blend: BlendState<number> };

export const create = (): SequencerState => ({ holdElapsed: 0, blend: blend.create<number>() });

/** The settled instruction; during a blend, still the one being left. `0` before the first tick. */
export const index = (state: SequencerState): number => state.blend.liveId ?? 0;

function instructionState(params: SequencerParams, index: number | null): CameraState | null {
  return index !== null ? params.instructions[index].state : null;
}

/** Advances the sequence by `dt` and returns the composited output. */
export function tick(state: SequencerState, params: SequencerParams, dt: number): CameraState {
  const blendState = state.blend;
  if (blend.targetId(blendState) === null) {
    // First tick: snap to instruction 0 without starting the hold timer.
    blend.setTarget(blendState, 0, params.instructions[0].state, params.defaultBlend);
    return blend.tick(blendState, 0, instructionState(params, blend.targetId(blendState)));
  }

  // Checked before ticking: the tick a blend lands on still does not count toward the next hold.
  const wasBlending = blendState.transition.active;
  const result = blend.tick(blendState, dt, instructionState(params, blend.targetId(blendState)));
  if (wasBlending) return result;

  const currentIndex = index(state);
  const isLast = currentIndex === params.instructions.length - 1;
  if (isLast && !params.loop) return result;

  state.holdElapsed += dt;
  if (state.holdElapsed >= params.instructions[currentIndex].hold) {
    const nextIndex = isLast ? 0 : currentIndex + 1;
    state.holdElapsed = 0;
    const definition = params.instructions[currentIndex].blend ?? params.defaultBlend;
    blend.setTarget(blendState, nextIndex, params.instructions[nextIndex].state, definition);
  }

  return result;
}
