import { wrap } from 'math';

/** Shortest signed distance from `value` to `target` within a wrapped range. */
export function shortestWrappedDelta(value: number, target: number, range: [number, number]): number {
  const half = (range[1] - range[0]) / 2;
  return wrap(target - value, -half, half);
}
