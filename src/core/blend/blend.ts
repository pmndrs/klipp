import { clamp } from 'math';

import * as cameraState from '../cameraState';
import type { CameraState } from '../cameraState';

import * as damping from '../damping/damping';
import type { DamperState } from '../damping/damping';

import type { BlendDefinition, CustomBlend } from './BlendDefinition';
import { BlendHints } from './BlendHints';

/** A transition in flight from a frozen `from` state toward the live `toName` camera. */
export type BlendTransition<Name> = {
  active: boolean;
  from: CameraState;
  toName: Name | null;
  definition: BlendDefinition | null;
  elapsed: number;
  progress: number;
  damper: DamperState;
  hints: BlendHints;
};

export type BlendState<Name> = {
  /** Camera currently settled in the output. */
  liveName: Name | null;
  /** Whether a real output has been produced at least once. */
  hasEverActivated: boolean;
  transition: BlendTransition<Name>;
  /** Reusable output, returned by `tick`. */
  output: CameraState;
};

export const create = <Name>(): BlendState<Name> => ({
  liveName: null,
  hasEverActivated: false,
  transition: {
    active: false,
    from: cameraState.create(),
    toName: null,
    definition: null,
    elapsed: 0,
    progress: 0,
    damper: damping.createState(),
    hints: BlendHints.none,
  },
  output: cameraState.create(),
});

/** Destination of the active transition, or `liveName` when settled. */
export const targetName = <Name>(state: BlendState<Name>): Name | null =>
  state.transition.active ? state.transition.toName : state.liveName;

/**
 * Start a transition to `toName`, from the current output. The very first target is taken over at once
 * from `toState`, since there is nothing to blend from yet.
 */
export function setTarget<Name>(
  state: BlendState<Name>,
  toName: Name,
  toState: CameraState,
  definition: BlendDefinition,
  hints: BlendHints = BlendHints.none,
): void {
  if (toName === targetName(state)) return;

  if (!state.hasEverActivated) {
    state.hasEverActivated = true;
    state.liveName = toName;
    cameraState.copy(state.output, toState);
    return;
  }

  const transition = state.transition;
  cameraState.copy(transition.from, state.output);
  transition.active = true;
  transition.toName = toName;
  transition.definition = definition;
  transition.elapsed = 0;
  transition.progress = 0;
  transition.hints = hints;
  if (definition.damping !== undefined) damping.start(transition.damper);
}

/** Drop a camera that went away, keeping the current output. */
export function forget<Name>(state: BlendState<Name>, name: Name): void {
  const transition = state.transition;
  if (transition.active && transition.toName === name) {
    transition.active = false;
    transition.toName = null;
    state.liveName = null;
  } else if (state.liveName === name) {
    state.liveName = null;
  }
}

/**
 * Advance the transition and composite the output. `targetState` is the state of `targetName(state)`,
 * or `null` when there is none.
 */
export function tick<Name>(state: BlendState<Name>, dt: number, targetState: CameraState | null): CameraState {
  const transition = state.transition;
  if (transition.active && targetState) {
    const definition = transition.definition!;
    let t: number;
    if (definition.damping !== undefined) {
      transition.damper.value = transition.progress;
      transition.progress = damping.damp(transition.damper, 1, definition.damping, dt, definition.maxSpeed).value;
      t = transition.progress;
    } else {
      transition.elapsed += dt;
      const rawT = definition.time <= 0 ? 1 : clamp(transition.elapsed / definition.time, 0, 1);
      t = definition.curve(rawT);
    }

    cameraState.lerp(state.output, transition.from, targetState, t, transition.hints);

    if (t >= 1) {
      state.liveName = transition.toName;
      transition.active = false;
      transition.toName = null;
    }
  } else if (state.liveName !== null && targetState) {
    cameraState.copy(state.output, targetState);
  }

  return state.output;
}

/** Resolves the most specific custom blend for a transition. */
export function resolveDefinition(
  customBlends: CustomBlend[],
  from: string | null,
  to: string,
  defaultBlend: BlendDefinition,
): BlendDefinition {
  let best: CustomBlend | null = null;
  let bestSpecificity = -1;

  for (const entry of customBlends) {
    if (entry.to !== undefined && entry.to !== to) continue;
    if (entry.from !== undefined && entry.from !== from) continue;

    const specificity = (entry.to !== undefined ? 2 : 0) + (entry.from !== undefined ? 1 : 0);
    if (specificity > bestSpecificity) {
      best = entry;
      bestSpecificity = specificity;
    }
  }

  return best ? best.blend : defaultBlend;
}
