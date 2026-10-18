import type { CameraState } from './cameraState';
import { withDefaults } from './params';

import * as blend from './blend/blend';
import type { BlendState } from './blend/blend';
import { BlendCurves } from './blend/BlendCurves';
import type { BlendDefinition, CustomBlend } from './blend/BlendDefinition';
import { BlendHints } from './blend/BlendHints';

export type VirtualCameraConfig = {
  name: string;
  priority: number;
  /** Mutable live state read by the core. */
  state: CameraState;
  /** Blend hints for transitions involving this camera. */
  hints?: BlendHints;
};

export type KlippCamera = VirtualCameraConfig & { activatedAt: number };

/** Transition events emitted by the core and virtual camera controllers. */
export type CameraTransitionEventMap = {
  /** A camera became the active candidate. */
  activated: { incoming: string; outgoing: string | null };
  /** A camera stopped contributing to output. */
  deactivated: { outgoing: string };
  /** A blend transition started. */
  blendCreated: { incoming: string; outgoing: string | null };
  /** A blend transition finished. */
  blendFinished: { incoming: string };
  /** An instant transition occurred. */
  cut: { incoming: string; outgoing: string | null };
};

/** Transition events plus `activeCameraChanged` / `liveCameraChanged`, in the order they happened. */
export type KlippEvent =
  | { [K in keyof CameraTransitionEventMap]: { type: K } & CameraTransitionEventMap[K] }[keyof CameraTransitionEventMap]
  | { type: 'activeCameraChanged' }
  | { type: 'liveCameraChanged' };

export type KlippParams = {
  /** Used when no `customBlends` entry matches a from→to transition. */
  defaultBlend: BlendDefinition;
  customBlends: CustomBlend[];
};

/** Every setting from `settings`, or its default. */
export const createParams = (settings?: Partial<KlippParams>): KlippParams =>
  withDefaults({ defaultBlend: { curve: BlendCurves.easeInOut, time: 2 }, customBlends: [] }, settings);

/** `'priority'` picks the highest-priority camera itself, `'manual'` leaves the choice to `setActive`. */
export type CameraSelection = 'priority' | 'manual';

export type KlippState = {
  selection: CameraSelection;
  cameras: Map<string, KlippCamera>;
  /** The camera the output is heading to. */
  activeName: string | null;
  activationCounter: number;
  blend: BlendState<string>;
  customBlendFromName: string | null;
  customBlendFromHints: BlendHints;
  /** Events since the last drain. The caller empties it. */
  events: KlippEvent[];
};

export const create = (selection: CameraSelection = 'priority'): KlippState => ({
  selection,
  cameras: new Map(),
  activeName: null,
  activationCounter: 0,
  blend: blend.create<string>(),
  customBlendFromName: null,
  customBlendFromHints: BlendHints.none,
  events: [],
});

function activate(state: KlippState, name: string | null): void {
  if (name === state.activeName) return;
  const outgoing = state.activeName;
  state.activeName = name;
  state.events.push({ type: 'activeCameraChanged' });
  if (name !== null) state.events.push({ type: 'activated', incoming: name, outgoing });
}

function recompute(state: KlippState): void {
  if (state.selection === 'manual') {
    if (state.activeName !== null && !state.cameras.has(state.activeName)) activate(state, null);
    return;
  }
  let winner: KlippCamera | null = null;
  for (const camera of state.cameras.values()) {
    if (
      !winner ||
      camera.priority > winner.priority ||
      (camera.priority === winner.priority && camera.activatedAt > winner.activatedAt)
    ) {
      winner = camera;
    }
  }
  activate(state, winner?.name ?? null);
}

/** Make `name` the active camera, for `'manual'` selection. A name that is not registered is ignored. */
export function setActive(state: KlippState, name: string | null): void {
  if (name === null || state.cameras.has(name)) activate(state, name);
}

function reportLiveChange(state: KlippState, previousLiveName: string | null): void {
  if (state.blend.liveName === previousLiveName) return;
  state.events.push({ type: 'liveCameraChanged' });
  if (previousLiveName !== null) state.events.push({ type: 'deactivated', outgoing: previousLiveName });
}

/** Register a camera and return its record, needed to unregister it. */
export function register(state: KlippState, config: VirtualCameraConfig): KlippCamera {
  const camera: KlippCamera = { ...config, activatedAt: ++state.activationCounter };
  state.cameras.set(config.name, camera);
  recompute(state);
  return camera;
}

/** Unregister `camera`, unless its name has since been taken by a newer registration. */
export function unregister(state: KlippState, camera: KlippCamera): void {
  if (state.cameras.get(camera.name) !== camera) return;
  state.cameras.delete(camera.name);
  // Continue from the current output if the camera disappears.
  const previousLiveName = state.blend.liveName;
  blend.forget(state.blend, camera.name);
  reportLiveChange(state, previousLiveName);
  recompute(state);
}

/** Change a camera's priority without restarting the current blend. */
export function setPriority(state: KlippState, name: string, priority: number): void {
  const camera = state.cameras.get(name);
  if (!camera) return;
  camera.priority = priority;
  recompute(state);
}

/** Change a camera's blend hints in place. */
export function setHints(state: KlippState, name: string, hints: BlendHints): void {
  const camera = state.cameras.get(name);
  if (camera) camera.hints = hints;
  if (name === state.customBlendFromName) state.customBlendFromHints = hints;
}

/** Start a transition to `incoming`. Returns `true` when it resolved to an instant cut. */
function retarget(state: KlippState, params: KlippParams, incoming: string): boolean {
  const definition = blend.resolveDefinition(
    params.customBlends,
    state.customBlendFromName,
    incoming,
    params.defaultBlend,
  );
  const incomingCamera = state.cameras.get(incoming)!;
  const toHints = incomingCamera.hints ?? BlendHints.none;
  // Prefer current hints when the outgoing camera still exists.
  const fromCamera = state.customBlendFromName !== null ? state.cameras.get(state.customBlendFromName) : undefined;
  const fromHints = fromCamera?.hints ?? state.customBlendFromHints;
  const outgoing = blend.targetName(state.blend);
  const isFirstEver = !state.blend.hasEverActivated;
  blend.setTarget(state.blend, incoming, incomingCamera.state, definition, fromHints | toHints);
  state.customBlendFromName = incoming;
  state.customBlendFromHints = toHints;

  if (isFirstEver) {
    state.events.push({ type: 'cut', incoming, outgoing: null });
    return false;
  }
  state.events.push({ type: 'blendCreated', incoming, outgoing });
  if ('damping' in definition || definition.time > 0) return false;
  state.events.push({ type: 'cut', incoming, outgoing });
  return true;
}

/** Head for the active camera, advance the blend and return the reusable output state. */
export function tick(state: KlippState, params: KlippParams, dt: number): CameraState {
  const blendState = state.blend;
  const previousLiveName = blendState.liveName;
  const justCreatedCut =
    state.activeName !== null &&
    state.activeName !== blend.targetName(blendState) &&
    retarget(state, params, state.activeName);

  const wasBlending = blendState.transition.active;
  const targetName = blend.targetName(blendState);
  const result = blend.tick(blendState, dt, targetName !== null ? state.cameras.get(targetName)!.state : null);
  if (wasBlending && !blendState.transition.active && !justCreatedCut) {
    state.events.push({ type: 'blendFinished', incoming: blendState.liveName! });
  }
  reportLiveChange(state, previousLiveName);
  return result;
}
