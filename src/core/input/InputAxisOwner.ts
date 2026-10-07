import type { InputAxisData } from './axis';

/** A camera piece exposing named axes for input to drive. */
export type InputAxisOwner = {
  readonly inputAxes: Record<string, InputAxisData>;
};
