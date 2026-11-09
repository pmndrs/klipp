import type { VirtualCameraBase } from '../VirtualCameraBase';

import * as damping from '../damping/damping';
import type { DampingConstant } from '../damping/damping';

import * as inputAxis from './axis';
import type { InputAxisData, InputAxisParams, InputAxisRecentering } from './axis';

export type InputAxisOptions = Partial<InputAxisParams>;

/** Shapes an input value with range, wrapping, damping, and recentering. */
export class InputAxis implements InputAxisData {
  declare value: number;
  declare center: number;
  declare range: [number, number] | null;
  declare wrap: boolean;
  declare recentering: InputAxisRecentering;
  declare damping: DampingConstant;
  declare maxSpeed: number;
  declare autoNormalize: boolean;
  held = false;
  rawValue: number;
  idleTime = 0;
  hadDelta = false;
  readonly damper = damping.createState();
  /** The camera with the piece that has this axis, set by the camera. Changing the axis asks its Klipp for a frame. */
  camera: VirtualCameraBase | null = null;

  constructor(options?: InputAxisOptions) {
    Object.assign(this, inputAxis.createParams(options));
    this.rawValue = this.value;
    damping.start(this.damper);
  }

  applyDelta = (delta: number): void => {
    inputAxis.applyDelta(this, delta);
    this.camera?.klipp?.requestFrame();
  };

  /** Jump straight to `value`, without easing and without counting as input. */
  setValue = (value: number): void => {
    inputAxis.setValue(this, value);
    this.camera?.klipp?.requestFrame();
  };

  /** Advance the axis and apply damping or recentering. Returns `true` while it still has to move. */
  update = (dt: number): boolean => inputAxis.update(this, dt);

  /** Reset damping so the next update snaps to the raw value. */
  reset = (): void => {
    inputAxis.reset(this);
    this.camera?.klipp?.requestFrame();
  };

  /** Wrap `value` and `rawValue` back into `range`. */
  normalize = (): void => inputAxis.normalize(this);
}
