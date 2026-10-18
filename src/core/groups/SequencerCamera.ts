import { parent } from '../internal';
import type { VirtualCameraOptions } from '../VirtualCameraBase';

import { BlendCurves } from '../blend/BlendCurves';
import type { BlendDefinition } from '../blend/BlendDefinition';

import * as sequencer from './sequencer';
import { CameraManager } from './CameraManager';
import type { SequencerInstruction, SequencerParams } from './sequencer';

export type SequencerCameraOptions = VirtualCameraOptions & Partial<SequencerParams>;

// The parent already blends into the sequence, so its first shot cuts in.
const cutIn: BlendDefinition = { curve: BlendCurves.cut, time: 0 };

/** Shows its children one after another, each for its own `hold`. Starts over whenever it becomes the active camera. */
export class SequencerCamera extends CameraManager implements SequencerParams {
  declare instructions: SequencerInstruction[];
  declare loop: boolean;
  declare defaultBlend: BlendDefinition;

  readonly sequence = sequencer.createState();
  private restarted = false;

  constructor(name: string, { instructions, loop, defaultBlend, ...options }: SequencerCameraOptions = {}) {
    super(name, options);
    Object.assign(this, sequencer.createParams({ instructions, loop, defaultBlend }));
    this.addEventListener('activated', () => {
      sequencer.restart(this.sequence);
      this.restarted = true;
    });
  }

  /** Whether this run has held its last instruction for its `hold`. `false` while the sequencer is not the active camera. */
  get isFinished(): boolean {
    return this[parent]?.isActive(this.name) === true && sequencer.isFinished(this.sequence, this);
  }

  protected chooseCamera(dt: number): string | null {
    const instruction = sequencer.update(this.sequence, this, dt, this.children.isBlending);
    if (!instruction) return null;
    this.children.defaultBlend = this.restarted ? cutIn : sequencer.blendInto(this, instruction);
    this.restarted = false;
    return instruction.camera;
  }
}
