import type { CameraState } from '../cameraState';

import * as blend from './blend';
import type { BlendDefinition } from './BlendDefinition';
import { BlendHints } from './BlendHints';

/** Stateful wrapper over the blend functions, resolving camera states by name. */
export class BlendDriver<Name> {
  readonly state = blend.create<Name>();
  private readonly getState: (name: Name) => CameraState;

  constructor(getState: (name: Name) => CameraState) {
    this.getState = getState;
  }

  /** Candidate whose state is currently settled in the output. */
  get liveName(): Name | null {
    return this.state.liveName;
  }

  get isBlending(): boolean {
    return this.state.transition.active;
  }

  /** Whether the driver has produced a real output at least once. */
  get hasEverActivated(): boolean {
    return this.state.hasEverActivated;
  }

  /** Destination of the active blend, or `liveName` when settled. */
  get blendTargetName(): Name | null {
    return blend.targetName(this.state);
  }

  /** Set the transition destination. Retargeting starts from the current output. */
  setTarget(toName: Name, definition: BlendDefinition, hints: BlendHints = BlendHints.none): void {
    if (toName === blend.targetName(this.state)) return;
    blend.setTarget(this.state, toName, this.getState(toName), definition, hints);
  }

  /** Remove a candidate without discarding the current output. */
  forget(name: Name): void {
    blend.forget(this.state, name);
  }

  /** Advance the blend and return the reusable output state. */
  tick(dt: number): CameraState {
    const targetName = blend.targetName(this.state);
    return blend.tick(this.state, dt, targetName !== null ? this.getState(targetName) : null);
  }
}
