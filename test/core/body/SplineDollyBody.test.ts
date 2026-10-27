import { describe, expect, it } from 'vitest';

import * as spline from '../../../src/core/spline';
import { SplineDollyBody } from '../../../src/core/body/SplineDollyBody';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

const line = spline.create([
  [0, 0, 0],
  [10, 0, 0],
]);

describe('SplineDollyBody', () => {
  it('takes its settings in its options, keeping the defaults it is not given', () => {
    const body = new SplineDollyBody({ spline: line, position: 2 });
    expect(body).toMatchObject({ spline: line, position: 2, positionUnits: 'normalized', splineOffset: [0, 0, 0] });
  });

  it("starts from the point of the path nearest to the camera's initialState", () => {
    const klipp = new Klipp();
    const camera = new VirtualCamera('dolly', { initialState: { position: [7, 3, 0] } });
    klipp.add(camera);
    camera.setBody(new SplineDollyBody({ spline: line, position: 0, damping: 1 }));
    klipp.update(1 / 60);
    expect(camera.state.position[0]).toBeGreaterThan(6.5);
    expect(camera.state.position[0]).toBeLessThan(7);
  });
});
