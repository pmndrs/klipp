import { create } from '@react-three/test-renderer';
import { describe, expect, it } from 'vitest';

import type { KlippThree } from '../../../src/three/KlippThree';

import { Body } from '../../../src/react/body/Body';
import { MixingCamera } from '../../../src/react/groups/MixingCamera';
import { Klipp } from '../../../src/react/Klipp';
import { useKlipp } from '../../../src/react/KlippContext';
import { VirtualCamera } from '../../../src/react/VirtualCamera';

function CoreReader({ onRead }: { onRead: (core: KlippThree) => void }) {
  onRead(useKlipp());
  return null;
}

describe('MixingCamera (React wrapper)', () => {
  it('mixes the <VirtualCamera>s inside by the weights it is given on every render', async () => {
    let klipp: KlippThree | undefined;
    const scene = (weights: Record<string, number>) => (
      <Klipp>
        <CoreReader onRead={(value) => (klipp = value)} />
        <MixingCamera name="mix" weights={weights}>
          <VirtualCamera name="a">
            <Body.HardLockToTarget target={[0, 0, 0]} />
          </VirtualCamera>
          <VirtualCamera name="b">
            <Body.HardLockToTarget target={[10, 0, 0]} />
          </VirtualCamera>
        </MixingCamera>
      </Klipp>
    );
    const renderer = await create(scene({ a: 1, b: 1 }));
    await renderer.advanceFrames(1, 0.1);
    expect([...klipp!.state.cameras.keys()]).toEqual(['mix']);
    expect(klipp!.shot.position[0]).toBeCloseTo(5, 10);

    await renderer.update(scene({ a: 0, b: 1 }));
    await renderer.advanceFrames(1, 0.1);
    expect(klipp!.shot.position[0]).toBe(10);
  });
});
