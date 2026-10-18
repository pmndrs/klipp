import { describe, expect, it } from 'vitest';

import { MixingCamera } from '../../../src/core/groups/MixingCamera';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

function fixedAt(name: string, x: number, runs?: Record<string, number>): VirtualCamera {
  const camera = new VirtualCamera(name, { standbyUpdate: 'never' });
  camera.setBody({
    update: (out) => {
      out.position[0] = x;
      if (runs) runs[name] = (runs[name] ?? 0) + 1;
    },
  });
  return camera;
}

describe('MixingCamera', () => {
  it('mixes its children by weight into one shot, following weight changes every frame', () => {
    const klipp = new Klipp();
    const mix = new MixingCamera('mix', { weights: { a: 1, b: 3 } });
    mix.children.add(fixedAt('a', 0));
    mix.children.add(fixedAt('b', 10));
    klipp.add(mix);

    klipp.update(0.1);
    expect(klipp.shot.position[0]).toBeCloseTo(7.5, 10);

    mix.weights.b = 0;
    klipp.update(0.1);
    expect(klipp.shot.position[0]).toBe(0);
  });

  it('runs every weighted child every frame, and the others as their standbyUpdate says', () => {
    const klipp = new Klipp();
    const runs: Record<string, number> = {};
    const mix = new MixingCamera('mix', { weights: { a: 1, b: 1, c: 0 } });
    mix.children.add(fixedAt('a', 0, runs));
    mix.children.add(fixedAt('b', 1, runs));
    mix.children.add(fixedAt('c', 2, runs));
    klipp.add(mix);

    klipp.update(0.1);
    klipp.update(0.1);
    expect(runs).toEqual({ a: 2, b: 2 });
  });

  it('makes the child with the highest weight the live one', () => {
    const klipp = new Klipp();
    const mix = new MixingCamera('mix', { weights: { a: 2, b: 1 } });
    mix.children.add(fixedAt('a', 0));
    mix.children.add(fixedAt('b', 10));
    klipp.add(mix);
    const live: string[] = [];
    mix.children.addEventListener('activated', (event) => live.push(event.incoming));

    klipp.update(0.1);
    mix.weights.b = 5;
    klipp.update(0.1);

    expect(mix.children.liveCameraName).toBe('b');
    expect(live).toEqual(['a', 'b']);
  });
});
