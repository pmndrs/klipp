import type { VirtualCameraOptions } from '../VirtualCameraBase';

import type { BlendDefinition } from '../blend/BlendDefinition';

import * as sequencer from './sequencer';
import { CameraManager } from './CameraManager';
import type { SequencerInstruction, SequencerParams } from './sequencer';

export type SequencerCameraOptions = VirtualCameraOptions & Partial<SequencerParams>;

/** Shows its children one after another, each for its own `hold`. Starts over whenever it becomes the active camera. */
export class SequencerCamera extends CameraManager implements SequencerParams {
  declare instructions: SequencerInstruction[];
  declare loop: boolean;
  declare defaultBlend: BlendDefinition;

  readonly sequence = sequencer.createState();

  constructor(name: string, { instructions, loop, defaultBlend, ...options }: SequencerCameraOptions = {}) {
    super(name, options);
    Object.assign(this, sequencer.createParams({ instructions, loop, defaultBlend }));
    this.addEventListener('activated', () => sequencer.restart(this.sequence));
  }

  protected chooseCamera(dt: number): string | null {
    const instruction = sequencer.update(this.sequence, this, dt, this.children.isBlending);
    if (!instruction) return null;
    this.children.defaultBlend = sequencer.blendInto(this, instruction);
    return instruction.camera;
  }
}
