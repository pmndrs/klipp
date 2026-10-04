import * as damping from './damping';
import type { DampingConstant } from './damping';

/** Stateful wrapper over `damp`. */
export class Damper {
  readonly state = damping.createState();

  get velocity(): number {
    return this.state.velocity;
  }

  set velocity(value: number) {
    this.state.velocity = value;
  }

  update(
    current: number,
    target: number,
    dampingTime: DampingConstant,
    dt: number,
    maxSpeed = Infinity,
    epsilon = 1e-4,
  ): number {
    this.state.value = current;
    return damping.damp(this.state, target, dampingTime, dt, maxSpeed, epsilon).value;
  }

  /** Reset the spring state so the next call snaps to the target again. */
  reset(): void {
    damping.reset(this.state);
  }
}
