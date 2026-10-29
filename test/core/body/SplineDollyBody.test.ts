import { describe, expect, it } from 'vitest';

import * as spline from '../../../src/core/spline';
import { BlendCurves } from '../../../src/core/blend/BlendCurves';
import { SplineDollyBody } from '../../../src/core/body/SplineDollyBody';
import { SequencerCamera } from '../../../src/core/groups/SequencerCamera';
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

  it('rides its duration move from the start each time a SequencerCamera cuts to it', () => {
    const klipp = new Klipp({ defaultBlend: { curve: BlendCurves.cut, time: 0 } });
    const sequence = new SequencerCamera('cutscene', {
      loop: true,
      defaultBlend: { curve: BlendCurves.cut, time: 0 },
      instructions: [
        { camera: 'dolly', hold: 1 },
        { camera: 'still', hold: 1 },
      ],
    });
    const dolly = new VirtualCamera('dolly');
    dolly.setBody(
      new SplineDollyBody({
        spline: line,
        automaticDolly: { method: 'duration', from: 0, to: 1, duration: 1 },
      }),
    );
    const still = new VirtualCamera('still');
    still.setBody({ update: (out) => void out.position.fill(-1) });
    sequence.children.add(dolly);
    sequence.children.add(still);
    klipp.add(sequence);

    klipp.update(0);
    expect(klipp.shot.position[0]).toBeCloseTo(0, 9);
    klipp.update(0.5);
    expect(klipp.shot.position[0]).toBeCloseTo(5, 9);
    klipp.update(0.5);
    klipp.update(1);
    expect(sequence.children.liveCameraName).toBe('dolly');
    expect(klipp.shot.position[0]).toBeCloseTo(0, 9);
  });
});
