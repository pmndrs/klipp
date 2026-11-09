import type { Vec3 } from 'math';

import * as impulses from './impulses';
import type { GenerateImpulseOptions } from './impulses';

/** Stores one-shot impulses and samples their combined effect at a world position. */
export class ImpulseField {
  readonly state = impulses.createFieldState();
  private readonly impulseListeners = new Set<() => void>();

  /** Register a new impulse event. */
  generate(options: GenerateImpulseOptions, now: number = impulses.now()): void {
    impulses.generate(this.state, options, now);
    for (const listener of this.impulseListeners) listener();
  }

  /** Calls `listener` after every `generate`, for a loop that runs only on demand. Returns a function that stops it. */
  subscribeImpulses = (listener: () => void): (() => void) => {
    this.impulseListeners.add(listener);
    return () => this.impulseListeners.delete(listener);
  };

  /** Write the summed offset into `outPositionOffset` and return its current strength. */
  sample(
    outPositionOffset: Vec3,
    samplePosition: Vec3,
    channelMask = 1,
    gain = 1,
    now: number = impulses.now(),
  ): number {
    return impulses.sample(outPositionOffset, this.state, samplePosition, channelMask, gain, now);
  }

  /** Whether any event remains within its lifetime. */
  get hasEvents(): boolean {
    return this.state.events.length > 0;
  }
}

/** Shared impulse field. Create another instance for an isolated event stream. */
export const impulseField = new ImpulseField();
