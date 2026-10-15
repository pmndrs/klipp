import { withDefaults } from '../params';

import * as inputAxis from './axis';
import type { InputAxisData, InputAxisParams, InputAxisSettings } from './axis';

/** Sets every setting of `axis` from `settings`, or from `defaults` where it has none, keeping its value. */
export function applyAxisSettings(
  axis: InputAxisData,
  defaults: InputAxisSettings,
  settings: InputAxisSettings | undefined,
): void {
  const params = withDefaults<InputAxisParams>(inputAxis.createParams(defaults), settings);
  params.value = axis.value;
  Object.assign(axis, params);
}
