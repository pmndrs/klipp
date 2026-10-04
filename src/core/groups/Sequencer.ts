import type { CameraState } from '../CameraState.js';
import { BlendCurves } from '../blend/BlendCurves.js';
import type { BlendDefinition } from '../blend/BlendDefinition.js';
import type { SequencerInstruction, SequencerParams } from './sequencerState.js';
import * as sequencerState from './sequencerState.js';

export type SequencerOptions = {
  defaultBlend?: BlendDefinition;
  /** Wrap to the first instruction after the last one's hold elapses, instead of holding forever. */
  loop?: boolean;
};

/**
 * Steps through a fixed list of camera instructions in order, holding each for its own duration before
 * blending to the next. Holds the last instruction forever once reached, unless `loop`.
 */
export class Sequencer {
  readonly state = sequencerState.create();
  private readonly params: SequencerParams;

  constructor(instructions: SequencerInstruction[], options: SequencerOptions = {}) {
    if (instructions.length === 0) throw new Error('Sequencer needs at least one instruction.');
    this.params = {
      instructions,
      defaultBlend: options.defaultBlend ?? { curve: BlendCurves.easeInOut, time: 2 },
      loop: options.loop ?? false,
    };
  }

  /** The settled instruction; during a blend, still the one being left. `0` before the first tick. */
  get currentIndex(): number {
    return sequencerState.index(this.state);
  }

  get currentCameraId(): string {
    return this.params.instructions[this.currentIndex].cameraId;
  }

  get isBlending(): boolean {
    return this.state.blend.transition.active;
  }

  /** Advances by `dt` and returns the composited `CameraState` - same scratch instance every call. */
  tick(dt: number): CameraState {
    return sequencerState.tick(this.state, this.params, dt);
  }
}
