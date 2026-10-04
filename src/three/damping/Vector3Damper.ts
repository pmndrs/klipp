import type { Vec3 } from 'math';
import type { Vector3 } from 'three';
import type { DampingConstant } from '../../core/damping/damping.js';
import * as damping from '../../core/damping/damping.js';

const scratchOut: Vec3 = [0, 0, 0];
const scratchTarget: Vec3 = [0, 0, 0];

/** Stateful wrapper over `dampVector3` for three.js vectors. */
export class Vector3Damper {
  readonly state = damping.createVector3State();

  update(out: Vector3, target: Vector3, dampingTime: DampingConstant, dt: number, maxSpeed = Infinity): Vector3 {
    damping.dampVector3(this.state, out.toArray(scratchOut), target.toArray(scratchTarget), dampingTime, dt, maxSpeed);
    return out.fromArray(scratchOut);
  }

  /** Reset all three component dampers. */
  reset(): void {
    damping.resetVector3(this.state);
  }
}
