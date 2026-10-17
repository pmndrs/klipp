import { describe, expect, it } from 'vitest';

import { BlendCurves } from '../../../src/core/blend/BlendCurves';
import { SequencerCamera } from '../../../src/core/groups/SequencerCamera';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

function fixedAt(name: string, x: number): VirtualCamera {
  const camera = new VirtualCamera(name);
  camera.setBody({ update: (out) => void (out.position[0] = x) });
  return camera;
}

function setup() {
  const klipp = new Klipp({ defaultBlend: { curve: BlendCurves.cut, time: 0 } });
  const sequence = new SequencerCamera('cutscene', {
    instructions: [
      { camera: 'a', hold: 1 },
      { camera: 'b', hold: 1, blend: { curve: BlendCurves.linear, time: 1 } },
    ],
  });
  sequence.children.add(fixedAt('a', 1));
  sequence.children.add(fixedAt('b', 2));
  return { klipp, sequence };
}

describe('SequencerCamera', () => {
  it('cuts to the first child, holds it, then blends into the next with its blend', () => {
    const { klipp, sequence } = setup();
    klipp.add(sequence);

    klipp.update(0);
    expect(klipp.shot.position[0]).toBe(1);

    klipp.update(0.5);
    klipp.update(0.5);
    expect(klipp.shot.position[0]).toBeCloseTo(1.5, 10);

    klipp.update(0.5);
    expect(klipp.shot.position[0]).toBe(2);
    expect(sequence.children.liveCameraName).toBe('b');
  });

  it('waits while another camera is active, and cuts back to the start each time it becomes active', () => {
    const { klipp, sequence } = setup();
    const other = fixedAt('other', 9);
    other.priority = 10;
    sequence.standbyUpdate = 'always';
    klipp.add(other);
    klipp.add(sequence);

    klipp.update(5);
    expect(sequence.sequence.index).toBe(-1);

    other.priority = -10;
    klipp.update(0);
    klipp.update(1);
    klipp.update(1);
    expect(sequence.children.activeCameraName).toBe('b');

    other.priority = 10;
    other.priority = -10;
    klipp.update(0);
    expect(sequence.children.activeCameraName).toBe('a');
    expect(sequence.children.isBlending).toBe(false);
  });
});
