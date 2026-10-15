import { withDefaults } from '../params';

import * as inputAxis from './axis';
import type { InputAxisData, InputAxisParams, InputAxisSettings } from './axis';

/** Applies `settings` over `defaults` to `axis`, keeping its value. */
export function applyAxisSettings(
  axis: InputAxisData,
  defaults: InputAxisSettings,
  settings: InputAxisSettings | undefined,
): void {
  const params = withDefaults<InputAxisParams>(inputAxis.createParams(defaults), settings);
  params.value = axis.value;
  Object.assign(axis, params);
}
