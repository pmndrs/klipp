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
  /** Share of `toName` in the output after the last `tick`. */
  weight: number;
  /** The cameras in `from` and their shares of it, in the first `fromCount` slots. */
  fromNames: Name[];
  fromWeights: number[];
  fromCount: number;
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
    weight: 0,
    fromNames: [],
    fromWeights: [],
    fromCount: 0,
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
  freezeWeights(state);
  transition.active = true;
  transition.toName = toName;
  transition.definition = definition;
  transition.elapsed = 0;
  transition.progress = 0;
  transition.weight = 0;
  transition.hints = hints;
  if (definition.damping !== undefined) damping.start(transition.damper);
}

const negligibleWeight = 1e-4;

function addFromWeight<Name>(transition: BlendTransition<Name>, name: Name, weight: number): void {
  for (let i = 0; i < transition.fromCount; i++) {
    if (transition.fromNames[i] === name) {
      transition.fromWeights[i] += weight;
      return;
    }
  }
  transition.fromNames[transition.fromCount] = name;
  transition.fromWeights[transition.fromCount++] = weight;
}

function removeFromWeight<Name>(transition: BlendTransition<Name>, index: number): void {
  const last = --transition.fromCount;
  transition.fromNames[index] = transition.fromNames[last];
  transition.fromWeights[index] = transition.fromWeights[last];
}

/** Records the current output's mix of cameras as the makeup of the next `from`. */
function freezeWeights<Name>(state: BlendState<Name>): void {
  const transition = state.transition;
  if (!transition.active) {
    transition.fromCount = 0;
    if (state.liveName !== null) addFromWeight(transition, state.liveName, 1);
    return;
  }
  const t = transition.weight;
  for (let i = 0; i < transition.fromCount; i++) transition.fromWeights[i] *= 1 - t;
  if (transition.toName !== null) addFromWeight(transition, transition.toName, t);
  for (let i = transition.fromCount - 1; i >= 0; i--) {
    if (transition.fromWeights[i] < negligibleWeight) removeFromWeight(transition, i);
  }
}

/** Share of `name` in the output, from `0` to `1`. */
export function weightOf<Name>(state: BlendState<Name>, name: Name): number {
  const transition = state.transition;
  if (!transition.active) return state.liveName === name ? 1 : 0;
  const t = transition.weight;
  let weight = transition.toName === name ? t : 0;
  for (let i = 0; i < transition.fromCount; i++) {
    if (transition.fromNames[i] === name) weight += transition.fromWeights[i] * (1 - t);
  }
  return weight;
}

/** Drop a camera that went away, keeping the current output. */
export function forget<Name>(state: BlendState<Name>, name: Name): void {
  const transition = state.transition;
  for (let i = transition.fromCount - 1; i >= 0; i--) {
    if (transition.fromNames[i] === name) removeFromWeight(transition, i);
  }
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

    transition.weight = t;
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
