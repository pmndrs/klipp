import type { Quat } from 'math';
import type { Quaternion } from 'three';
import type { DampingConstant } from '../../core/damping/damping.js';
import * as damping from '../../core/damping/damping.js';

const scratchOut: Quat = [0, 0, 0, 1];
const scratchTarget: Quat = [0, 0, 0, 1];

/** Stateful wrapper over `dampQuaternion` for three.js quaternions. */
export class QuaternionDamper {
  readonly state = damping.createState();

  update(
    out: Quaternion,
    target: Quaternion,
    dampingTime: DampingConstant,
    dt: number,
    maxSpeed = Infinity,
  ): Quaternion {
    damping.dampQuaternion(
      this.state,
      out.toArray(scratchOut),
      target.toArray(scratchTarget),
      dampingTime,
      dt,
      maxSpeed,
    );
    return out.fromArray(scratchOut);
  }

  /** Reset the underlying angle spring. */
  reset(): void {
    damping.reset(this.state);
  }
}
