import { describe, expect, it } from 'vitest';

import * as spline from '../../../src/core/spline';
import * as targetPose from '../../../src/core/targetPose';
import { SplineDollyLookAtTargetsAim } from '../../../src/core/aim/SplineDollyLookAtTargetsAim';
import { HardLockToTargetBody } from '../../../src/core/body/HardLockToTargetBody';
import { SplineDollyBody } from '../../../src/core/body/SplineDollyBody';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

import { forwardDot } from '../mathHelpers';

const line = spline.create([
  [0, 0, 0],
  [10, 0, 0],
]);

function setup() {
  const klipp = new Klipp();
  const camera = new VirtualCamera('dolly');
  klipp.add(camera);
  return { klipp, camera };
}

describe('SplineDollyLookAtTargetsAim', () => {
  it("follows the camera's SplineDollyBody without being told about it", () => {
    const { klipp, camera } = setup();
    camera.setAim(
      new SplineDollyLookAtTargetsAim({
        targets: [
          { position: 0, lookAt: [0, 0, 5] },
          { position: 1, lookAt: [10, 0, 5] },
        ],
      }),
    );
    camera.setBody(new SplineDollyBody({ spline: line, position: 0.5 }));
    klipp.update(1 / 60);
    expect(forwardDot(camera.state.quaternion, camera.state.position, [5, 0, 5])).toBeCloseTo(1, 6);

    camera.setBody(new SplineDollyBody({ spline: line, position: 0.2 }));
    klipp.update(1 / 60);
    expect(camera.state.position[0]).toBeCloseTo(2, 6);
    expect(forwardDot(camera.state.quaternion, camera.state.position, [0, 0, 5])).toBeGreaterThan(
      forwardDot(camera.state.quaternion, camera.state.position, [10, 0, 5]),
    );
  });

  it('leaves the rotation alone under any other Body', () => {
    const { klipp, camera } = setup();
    camera.setBody(new HardLockToTargetBody(targetPose.create()));
    camera.setAim(new SplineDollyLookAtTargetsAim());
    klipp.update(1 / 60);
    expect(camera.state.quaternion).toEqual([0, 0, 0, 1]);
  });
});
