import type { InputAxisData } from './axis';

/** A camera piece exposing named axes for input to drive. */
export type InputAxisOwner = {
  readonly inputAxes: Record<string, InputAxisData>;
};

export const isInputAxisOwner = (value: object): value is InputAxisOwner =>
  'inputAxes' in value && typeof value.inputAxes === 'object' && value.inputAxes !== null;
