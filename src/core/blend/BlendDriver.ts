import type { CameraState } from '../CameraState';

import * as blend from './blend';
import type { BlendDefinition } from './BlendDefinition';
import { BlendHints } from './BlendHints';

/** Stateful wrapper over the blend functions, resolving camera states by id. */
export class BlendDriver<Id> {
  readonly state = blend.create<Id>();
  private readonly getState: (id: Id) => CameraState;

  constructor(getState: (id: Id) => CameraState) {
    this.getState = getState;
  }

  /** Candidate whose state is currently settled in the output. */
  get liveId(): Id | null {
    return this.state.liveId;
  }

  get isBlending(): boolean {
    return this.state.transition.active;
  }

  /** Whether the driver has produced a real output at least once. */
  get hasEverActivated(): boolean {
    return this.state.hasEverActivated;
  }

  /** Destination of the active blend, or `liveId` when settled. */
  get blendTargetId(): Id | null {
    return blend.targetId(this.state);
  }

  /** Set the transition destination. Retargeting starts from the current output. */
  setTarget(toId: Id, definition: BlendDefinition, hints: BlendHints = BlendHints.none): void {
    if (toId === blend.targetId(this.state)) return;
    blend.setTarget(this.state, toId, this.getState(toId), definition, hints);
  }

  /** Remove a candidate without discarding the current output. */
  forget(id: Id): void {
    blend.forget(this.state, id);
  }

  /** Advance the blend and return the reusable output state. */
  tick(dt: number): CameraState {
    const targetId = blend.targetId(this.state);
    return blend.tick(this.state, dt, targetId !== null ? this.getState(targetId) : null);
  }
}
