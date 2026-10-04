import { clamp } from 'math';
import type { CameraState } from '../CameraState';
import * as cameraState from '../CameraState';
import type { DamperState } from '../damping/damping';
import * as damping from '../damping/damping';
import type { BlendDefinition, CustomBlend } from './BlendDefinition';
import { BlendHints } from './BlendHints';

/** A transition in flight from a frozen `from` state toward the live `toId` camera. */
export type BlendTransition<Id> = {
  active: boolean;
  from: CameraState;
  toId: Id | null;
  definition: BlendDefinition | null;
  elapsed: number;
  progress: number;
  damper: DamperState;
  hints: BlendHints;
};

export type BlendState<Id> = {
  /** Camera currently settled in the output. */
  liveId: Id | null;
  /** Whether a real output has been produced at least once. */
  hasEverActivated: boolean;
  transition: BlendTransition<Id>;
  /** Reusable output, returned by `tick`. */
  output: CameraState;
};

export const create = <Id>(): BlendState<Id> => ({
  liveId: null,
  hasEverActivated: false,
  transition: {
    active: false,
    from: cameraState.create(),
    toId: null,
    definition: null,
    elapsed: 0,
    progress: 0,
    damper: damping.createState(),
    hints: BlendHints.none,
  },
  output: cameraState.create(),
});

/** Destination of the active transition, or `liveId` when settled. */
export const targetId = <Id>(state: BlendState<Id>): Id | null =>
  state.transition.active ? state.transition.toId : state.liveId;

/**
 * Start a transition to `toId`, from the current output. The very first target is taken over at once
 * from `toState`, since there is nothing to blend from yet.
 */
export function setTarget<Id>(
  state: BlendState<Id>,
  toId: Id,
  toState: CameraState,
  definition: BlendDefinition,
  hints: BlendHints = BlendHints.none,
): void {
  if (toId === targetId(state)) return;

  if (!state.hasEverActivated) {
    state.hasEverActivated = true;
    state.liveId = toId;
    cameraState.copy(state.output, toState);
    return;
  }

  const transition = state.transition;
  cameraState.copy(transition.from, state.output);
  transition.active = true;
  transition.toId = toId;
  transition.definition = definition;
  transition.elapsed = 0;
  transition.progress = 0;
  transition.hints = hints;
  if (definition.damping !== undefined) {
    // Prime the damper so blend progress starts at zero.
    damping.reset(transition.damper);
    damping.damp(transition.damper, 0, definition.damping, 0);
  }
}

/** Drop a camera that went away, keeping the current output. */
export function forget<Id>(state: BlendState<Id>, id: Id): void {
  const transition = state.transition;
  if (transition.active && transition.toId === id) {
    transition.active = false;
    transition.toId = null;
    state.liveId = null;
  } else if (state.liveId === id) {
    state.liveId = null;
  }
}

/**
 * Advance the transition and composite the output. `targetState` is the state of `targetId(state)`,
 * or `null` when there is none.
 */
export function tick<Id>(state: BlendState<Id>, dt: number, targetState: CameraState | null): CameraState {
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
      state.liveId = transition.toId;
      transition.active = false;
      transition.toId = null;
    }
  } else if (state.liveId !== null && targetState) {
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
