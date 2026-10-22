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
  declare paused: boolean;
  declare defaultBlend: BlendDefinition;

  readonly sequence = sequencer.createState();
  private restarted = false;

  constructor(name: string, { instructions, loop, paused, defaultBlend, ...options }: SequencerCameraOptions = {}) {
    super(name, options);
    Object.assign(this, sequencer.createParams({ instructions, loop, paused, defaultBlend }));
    this.addEventListener('activated', () => this.startOver());
  }

  /** Whether this run has held its last instruction for its `hold`. `false` while the sequencer is not the active camera. */
  get isFinished(): boolean {
    return this[parent]?.isActive(this.name) === true && sequencer.isFinished(this.sequence, this);
  }

  /** Jumps to the instruction at `index`, blending in with its `blend`. Does nothing until the sequence starts. */
  goTo(index: number): void {
    sequencer.goTo(this.sequence, this, index);
  }

  /** Jumps to the next instruction, or from the last one to the first with `loop`. */
  next(): void {
    sequencer.next(this.sequence, this);
  }

  /** Jumps to the previous instruction, or from the first one to the last with `loop`. */
  previous(): void {
    sequencer.previous(this.sequence, this);
  }

  /** Cuts back to the first instruction and holds it from the start. Does nothing until the sequence starts. */
  restart(): void {
    if (this.sequence.index >= 0) this.startOver();
  }

  private startOver(): void {
    sequencer.restart(this.sequence);
    this.restarted = true;
  }

  protected chooseCamera(dt: number): string | null {
    const instruction = sequencer.update(this.sequence, this, dt, this.children.isBlending);
    if (!instruction) return null;
    this.children.defaultBlend = this.restarted ? cutIn : sequencer.blendInto(this, instruction);
    this.restarted = false;
    return instruction.camera;
  }
}
