import type { CameraState } from '../CameraState.js';
import type { BlendState } from '../blend/blend.js';
import * as blend from '../blend/blend.js';
import type { BlendDefinition } from '../blend/BlendDefinition.js';

export type StateDrivenCandidate = {
  cameraId: string;
  /** Live reference - read fresh every `tick()`. */
  state: CameraState;
  priority: number;
  /** Which driving state (`setState()`) this candidate applies to. */
  forState: string;
};

export type StateDrivenParams = { candidates: readonly StateDrivenCandidate[]; defaultBlend: BlendDefinition };

export type StateDrivenState = { drivingState: string | null; winnerId: string | null; blend: BlendState<string> };

export const create = (): StateDrivenState => ({
  drivingState: null,
  winnerId: null,
  blend: blend.create<string>(),
});

function candidateState(params: StateDrivenParams, cameraId: string | null): CameraState | null {
  return cameraId !== null ? params.candidates.find((c) => c.cameraId === cameraId)!.state : null;
}

/** Select the camera for `drivingState`: highest priority, first in the list on a tie. */
export function setDrivingState(state: StateDrivenState, params: StateDrivenParams, drivingState: string): void {
  state.drivingState = drivingState;
  let winner: StateDrivenCandidate | null = null;
  for (const candidate of params.candidates) {
    if (candidate.forState !== drivingState) continue;
    if (!winner || candidate.priority > winner.priority) winner = candidate;
  }
  state.winnerId = winner?.cameraId ?? null;
}

/**
 * Advances any blend toward the selected camera and returns the output. Before any matching state has
 * been set, this is the untouched default `CameraState`.
 */
export function tick(state: StateDrivenState, params: StateDrivenParams, dt: number): CameraState {
  const { blend: blendState, winnerId } = state;
  if (winnerId !== null && winnerId !== blend.targetId(blendState)) {
    blend.setTarget(blendState, winnerId, candidateState(params, winnerId)!, params.defaultBlend);
  }
  return blend.tick(blendState, dt, candidateState(params, blend.targetId(blendState)));
}
