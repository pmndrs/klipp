import type { CameraState } from '../CameraState';
import { BlendCurves } from '../blend/BlendCurves';
import type { BlendDefinition } from '../blend/BlendDefinition';
import type { StateDrivenCandidate, StateDrivenParams } from './stateDrivenState';
import * as stateDrivenState from './stateDrivenState';

export type StateDrivenCameraOptions = {
  defaultBlend?: BlendDefinition;
};

/**
 * Maps an externally-driven state (`setState()`, e.g. mirroring an animator's current state) to a child
 * camera. Several candidates can target the same state - then the highest `priority` wins, and on a
 * priority tie the FIRST one in the candidate list wins - deliberately simpler than `Klipp`'s
 * "most recently activated" tie-break, since there's no activation order here, just a fixed list.
 *
 * If the current state matches no candidate, holds whatever was live before (nothing to switch to).
 */
export class StateDrivenCamera {
  readonly state = stateDrivenState.create();
  private readonly params: StateDrivenParams;

  constructor(candidates: StateDrivenCandidate[], options: StateDrivenCameraOptions = {}) {
    if (candidates.length === 0) throw new Error('StateDrivenCamera needs at least one candidate.');
    this.params = { candidates, defaultBlend: options.defaultBlend ?? { curve: BlendCurves.easeInOut, time: 2 } };
  }

  setState(state: string): void {
    stateDrivenState.setDrivingState(this.state, this.params, state);
  }

  get currentState(): string | null {
    return this.state.drivingState;
  }

  get liveCameraId(): string | null {
    return this.state.blend.liveId;
  }

  get isBlending(): boolean {
    return this.state.blend.transition.active;
  }

  /** Advances any in-progress blend by `dt` and returns the composited `CameraState` - same scratch instance every call. */
  tick(dt: number): CameraState {
    return stateDrivenState.tick(this.state, this.params, dt);
  }
}
