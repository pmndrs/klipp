import type { CameraState } from '../CameraState';

import { BlendCurves } from '../blend/BlendCurves';
import type { BlendDefinition } from '../blend/BlendDefinition';

import * as clearShotState from './clearShotState';
import type { ClearShotCandidate, ClearShotParams, ShotQualityEvaluator } from './clearShotState';

export type ClearShotOptions = {
  evaluator: ShotQualityEvaluator;
  defaultBlend?: BlendDefinition;
  /** Seconds a new best candidate must stay the best, uninterrupted, before it's actually committed to. */
  activateAfter?: number;
  /** Seconds the live camera must stay live before yielding to another candidate on quality alone.
   *  Gates internal switches only - an external, higher-priority camera preempting the whole `ClearShot`
   *  from outside isn't modeled here, this class can't see that. */
  minDuration?: number;
  /** Pick randomly among exactly-tied (quality AND priority) candidates instead of list order. */
  randomizeChoice?: boolean;
  random?: () => number;
};

/**
 * Picks the child with the best shot quality - `priority` only breaks quality ties.
 * `activateAfter` debounces the pick (a new best must hold that title continuously before it's committed,
 * anti-flicker); `minDuration` then protects the committed camera from being swapped out again too soon.
 */
export class ClearShot {
  readonly state = clearShotState.create();
  private readonly params: ClearShotParams;

  constructor(candidates: ClearShotCandidate[], options: ClearShotOptions) {
    if (candidates.length === 0) throw new Error('ClearShot needs at least one candidate.');
    this.params = {
      candidates,
      evaluator: options.evaluator,
      defaultBlend: options.defaultBlend ?? { curve: BlendCurves.easeInOut, time: 2 },
      activateAfter: options.activateAfter ?? 0,
      minDuration: options.minDuration ?? 0,
      randomizeChoice: options.randomizeChoice ?? false,
      random: options.random ?? Math.random,
    };
  }

  get liveCameraId(): string | null {
    return this.state.blend.liveId;
  }

  get isBlending(): boolean {
    return this.state.blend.transition.active;
  }

  /** The candidate currently being debounced toward (`activateAfter`), before it's committed to. */
  get pendingCameraId(): string | null {
    return this.state.pendingId;
  }

  tick(dt: number): CameraState {
    return clearShotState.tick(this.state, this.params, dt);
  }
}
