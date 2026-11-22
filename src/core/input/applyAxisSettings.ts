import { withDefaults } from '../params';

import * as inputAxis from './axis';
import type { InputAxisData, InputAxisParams, InputAxisSettings } from './axis';

/** Applies `settings` over `defaults` to `axis`, keeping its value. */
export function applyAxisSettings(
  axis: InputAxisData,
  defaults: InputAxisSettings,
  settings: InputAxisSettings | undefined,
): void {
  const { recentering, autoMove, ...rest } = settings ?? {};
  const params = withDefaults<InputAxisParams>(inputAxis.createParams(defaults), rest);
  withDefaults(params.recentering, recentering);
  withDefaults(params.autoMove, autoMove);
  params.value = axis.value;
  Object.assign(axis, params);
}
