import { describe, expect, it } from 'vitest';

import * as spline from '../../../src/core/spline';
import { SplineRollExtension } from '../../../src/core/extension/SplineRollExtension';
import type { BodyPiece } from '../../../src/core/VirtualCamera';

import { SplineRollHelperThree } from '../../../src/three/extension/SplineRollHelperThree';

describe('SplineRollHelperThree', () => {
  it('draws the up of the scene along a path that does not roll', () => {
    const roll = new SplineRollExtension();
    const dolly = {
      update: () => {},
      spline: spline.create([
        [0, 0, 0],
        [10, 0, 0],
      ]),
      positionUnits: 'normalized',
    };
    roll.cameraBody = dolly as BodyPiece;
    const helper = new SplineRollHelperThree();
    helper.sync(roll, [0, 0, 1]);

    const lines = helper.geometry.getAttribute('position');
    for (let i = 0; i < lines.count; i += 2) {
      expect(lines.getX(i + 1) - lines.getX(i)).toBeCloseTo(0, 9);
      expect(lines.getY(i + 1) - lines.getY(i)).toBeCloseTo(0, 9);
      expect(lines.getZ(i + 1) - lines.getZ(i)).toBeGreaterThan(0);
    }
  });
});
