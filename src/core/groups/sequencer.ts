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
  /** Keep holding the current instruction instead of moving on. */
  paused: boolean;
  /** Blend into an instruction that has no `blend` of its own. */
  defaultBlend: BlendDefinition;
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<SequencerParams>): SequencerParams =>
  withDefaults(
    { instructions: [], loop: false, paused: false, defaultBlend: { curve: BlendCurves.easeInOut, time: 2 } },
    settings,
  );

/** The current instruction, `-1` until the sequence starts, and how long it has been held. */
export type SequencerState = { index: number; held: number };

export const createState = (): SequencerState => ({ index: -1, held: 0 });

/** Start over from the first instruction. */
export function restart(state: SequencerState): void {
  state.index = 0;
  state.held = 0;
}

/**
 * Holds the current instruction for `dt` and moves on once its `hold` has passed, but neither while still `blending`
 * into it or `paused`. Returns the current instruction, or `null` until the sequence starts.
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
  if (blending || params.paused) return instructions[state.index];
  state.held += dt;

  const isLast = state.index === instructions.length - 1;
  if ((!isLast || params.loop) && state.held >= instructions[state.index].hold) {
    state.index = isLast ? 0 : state.index + 1;
    state.held = 0;
  }
  return instructions[state.index];
}

/** Jumps to the instruction at `index` and holds it from the start. Does nothing until the sequence starts. */
export function goTo(state: SequencerState, params: SequencerParams, index: number): void {
  const last = params.instructions.length - 1;
  if (state.index < 0 || last < 0) return;
  state.index = Math.min(Math.max(index, 0), last);
  state.held = 0;
}

/** Jumps to the next instruction, or from the last one to the first with `loop`. */
export function next(state: SequencerState, params: SequencerParams): void {
  if (state.index < params.instructions.length - 1) goTo(state, params, state.index + 1);
  else if (params.loop) goTo(state, params, 0);
}

/** Jumps to the previous instruction, or from the first one to the last with `loop`. */
export function previous(state: SequencerState, params: SequencerParams): void {
  if (state.index > 0) goTo(state, params, state.index - 1);
  else if (params.loop) goTo(state, params, params.instructions.length - 1);
}

/** Whether the last instruction has been held for its `hold`. Without `loop`, it then stays on screen for good. */
export function isFinished(state: SequencerState, params: SequencerParams): boolean {
  const last = params.instructions.length - 1;
  return !params.loop && last >= 0 && state.index === last && state.held >= params.instructions[last].hold;
}

/** The blend into `instruction`'s camera. */
export const blendInto = (params: SequencerParams, instruction: SequencerInstruction): BlendDefinition =>
  instruction.blend ?? params.defaultBlend;
