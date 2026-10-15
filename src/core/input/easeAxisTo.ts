import * as inputAxis from './axis';
import type { InputAxisData } from './axis';
import { shortestWrappedDelta } from './shortestWrappedDelta';

/** Eases `axis` toward `value` with its damping, the short way around when it wraps. Counts as input. */
export function easeAxisTo(axis: InputAxisData, value: number): void {
  const range = axis.wrap && axis.range;
  inputAxis.applyDelta(axis, range ? shortestWrappedDelta(axis.rawValue, value, range) : value - axis.rawValue);
}
