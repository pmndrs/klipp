import { withDefaults } from '../params';

import { BlendCurves } from '../blend/BlendCurves';
import type { BlendDefinition } from '../blend/BlendDefinition';

export type SequencerInstruction = {
  /** Name of the child camera to show. */
  camera: string;
  /** Seconds to stay on it once the blend into it has finished. The last instruction stays unless `loop`. */
  hold: number;
  /** Blend into this camera. */
  blend?: BlendDefinition;
};

export type SequencerParams = {
  instructions: SequencerInstruction[];
  /** Start over from the first instruction after the last one's `hold`. */
  loop: boolean;
  /** Blend into an instruction that has no `blend` of its own. */
  defaultBlend: BlendDefinition;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<SequencerParams>): SequencerParams =>
  withDefaults({ instructions: [], loop: false, defaultBlend: { curve: BlendCurves.easeInOut, time: 2 } }, settings);

/** The current instruction, `-1` until the sequence starts, and how long it has been held. */
export type SequencerState = { index: number; held: number };

export const createState = (): SequencerState => ({ index: -1, held: 0 });

/** Start over from the first instruction. */
export function restart(state: SequencerState): void {
  state.index = 0;
  state.held = 0;
}

/**
 * Holds the current instruction for `dt` unless still `blending` into it, and moves on once its `hold` has passed.
 * Returns the current instruction, or `null` until the sequence starts.
 */
export function update(
  state: SequencerState,
  params: SequencerParams,
  dt: number,
  blending: boolean,
): SequencerInstruction | null {
  const { instructions } = params;
  if (state.index < 0 || instructions.length === 0) return null;
  state.index = Math.min(state.index, instructions.length - 1);
  if (!blending) state.held += dt;

  const isLast = state.index === instructions.length - 1;
  if ((!isLast || params.loop) && state.held >= instructions[state.index].hold) {
    state.index = isLast ? 0 : state.index + 1;
    state.held = 0;
  }
  return instructions[state.index];
}

/** Whether the last instruction has been held for its `hold`. Without `loop`, it then stays on screen for good. */
export function isFinished(state: SequencerState, params: SequencerParams): boolean {
  const last = params.instructions.length - 1;
  return !params.loop && last >= 0 && state.index === last && state.held >= params.instructions[last].hold;
}

/** The blend into `instruction`'s camera. */
export const blendInto = (params: SequencerParams, instruction: SequencerInstruction): BlendDefinition =>
  instruction.blend ?? params.defaultBlend;
