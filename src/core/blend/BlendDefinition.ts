import { BlendCurves, type Ease } from './BlendCurves.js';

/** A fixed-duration curve or a damped transition. */
export type BlendDefinition =
  | { curve: Ease; time: number; damping?: never; maxSpeed?: never }
  | { damping: number; maxSpeed?: number; curve?: never; time?: never };

/** A blend override for an optional source and destination camera. */
export type CustomBlend = {
  from?: string;
  to?: string;
  blend: BlendDefinition;
};

/** Used when no blend is given. */
export const DEFAULT_BLEND: BlendDefinition = { curve: BlendCurves.easeInOut, time: 2 };
