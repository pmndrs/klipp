import * as damping from '../damping/damping';
import type { DampingConstant } from '../damping/damping';

import * as inputAxis from './axis';
import type { InputAxisData, InputAxisParams, InputAxisRecentering } from './axis';

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

  constructor(options?: Partial<InputAxisParams>) {
    Object.assign(this, inputAxis.createParams(options));
    this.rawValue = this.value;
    // Consume the damper's first-call snap so the first update eases instead of jumping.
    this.damper.value = this.value;
    damping.damp(this.damper, this.value, 0, 0);
  }

  applyDelta = (delta: number): void => inputAxis.applyDelta(this, delta);

  /** Advance the axis and apply damping or recentering. Returns `true` while it still has to move. */
  update = (dt: number): boolean => inputAxis.update(this, dt);

  /** Reset damping so the next update snaps to the raw value. */
  reset = (): void => inputAxis.reset(this);

  /** Wrap `value` and `rawValue` back into `range`. */
  normalize = (): void => inputAxis.normalize(this);
}
