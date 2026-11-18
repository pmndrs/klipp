import { MathUtils } from 'three';

import type { Vec3 } from '../../ShowcaseProps';
import { center } from '../model';

/** The hero's orbit round the town, in degrees: it sways `sway` either side of `horizontal`. */
export const overviewOrbit = { radius: 9.5, horizontal: -32, vertical: 12, sway: 12, fov: 40 };

const h = MathUtils.degToRad(overviewOrbit.horizontal);
const v = MathUtils.degToRad(overviewOrbit.vertical);

/** Where the hero's camera stands in the middle of its sway. */
export const overviewPosition: Vec3 = [
  center[0] - overviewOrbit.radius * Math.cos(v) * Math.sin(h),
  center[1] + overviewOrbit.radius * Math.sin(v),
  center[2] + overviewOrbit.radius * Math.cos(v) * Math.cos(h),
];
