import { describe, expect, it } from 'vitest';

import * as spline from '../../../src/core/spline';
import { SplineDollyBody } from '../../../src/core/body/SplineDollyBody';
import { SplineRollExtension } from '../../../src/core/extension/SplineRollExtension';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

const line = spline.create([
  [0, 0, 0],
  [10, 0, 0],
]);

describe('SplineRollExtension', () => {
  it('takes its settings in its options, keeping the defaults it is not given', () => {
    expect(new SplineRollExtension({ easing: 0.5 })).toMatchObject({ points: [], easing: 0.5, applyAfter: 'body' });
  });

  it("banks the camera's up with the path of its SplineDolly before the Aim frames with it, until it is removed", () => {
    const klipp = new Klipp();
    const camera = new VirtualCamera('dolly');
    klipp.add(camera);
    camera.setBody(new SplineDollyBody({ spline: line, position: 0.5, splineOffset: [0, 1, 0] }));
    const seen: number[][] = [];
    camera.setAim({ update: (out) => void seen.push([...out.referenceUp]) });
    const remove = camera.addExtension(new SplineRollExtension({ points: [{ position: 0, roll: 90 }] }));
    klipp.update(1 / 60);
    expect(seen[0][2]).toBeCloseTo(1, 9);
    expect(camera.state.position[2]).toBeCloseTo(1, 9);

    remove();
    klipp.update(1 / 60);
    expect(seen[1]).toEqual([0, 1, 0]);
    expect(camera.state.position[1]).toBeCloseTo(1, 9);
  });

  it('does nothing on a camera without a SplineDolly', () => {
    const klipp = new Klipp();
    const camera = new VirtualCamera('still');
    klipp.add(camera);
    camera.addExtension(new SplineRollExtension({ points: [{ position: 0, roll: 90 }] }));
    klipp.update(1 / 60);
    expect(camera.state.referenceUp).toEqual([0, 1, 0]);
  });
});
