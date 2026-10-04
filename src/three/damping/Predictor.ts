import type { Vec3 } from 'math';
import type { Vector3 } from 'three';
import * as predictor from '../../core/damping/predictor.js';

const scratchPosition: Vec3 = [0, 0, 0];
const scratchDelta: Vec3 = [0, 0, 0];

/** Stateful wrapper over the predictor functions for three.js vectors. */
export class Predictor {
  readonly state = predictor.create();

  /** Add a position sample and update the tracked velocity. */
  addPosition(position: Vector3, dt: number, smoothing: number): void {
    predictor.addPosition(this.state, position.toArray(scratchPosition), dt, smoothing);
  }

  /** Write the predicted offset `time` seconds ahead into `out`. */
  predictPositionDelta(out: Vector3, time: number): Vector3 {
    return out.fromArray(predictor.predictDelta(scratchDelta, this.state, time));
  }

  /** Clear the tracked velocity and position history. */
  reset(): void {
    predictor.reset(this.state);
  }
}
