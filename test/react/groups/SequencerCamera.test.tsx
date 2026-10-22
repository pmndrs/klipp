import { create } from '@react-three/test-renderer';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { BlendCurves } from '../../../src/core/blend/BlendCurves';
import type { SequencerCamera as SequencerCameraCore } from '../../../src/core/groups/SequencerCamera';

import type { KlippThree } from '../../../src/three/KlippThree';

import { Body } from '../../../src/react/body/Body';
import { SequencerCamera } from '../../../src/react/groups/SequencerCamera';
import { Klipp } from '../../../src/react/Klipp';
import { useKlipp } from '../../../src/react/KlippContext';
import { VirtualCamera } from '../../../src/react/VirtualCamera';
import { useIsLiveVirtualCamera } from '../../../src/react/VirtualCameraContext';

function CoreReader({ onRead }: { onRead: (core: KlippThree) => void }) {
  onRead(useKlipp());
  return null;
}

function LiveReader({ onRead }: { onRead: (isLive: boolean) => void }) {
  onRead(useIsLiveVirtualCamera());
  return null;
}

const cut = { curve: BlendCurves.cut, time: 0 };

describe('SequencerCamera (React wrapper)', () => {
  it('puts its <VirtualCamera>s in the group, and is one camera to <Klipp>', async () => {
    let klipp: KlippThree | undefined;
    const ref = createRef<SequencerCameraCore>();
    const renderer = await create(
      <Klipp defaultBlend={cut}>
        <CoreReader onRead={(value) => (klipp = value)} />
        <SequencerCamera ref={ref} name="cutscene" instructions={[{ camera: 'a', hold: 1 }]} defaultBlend={cut}>
          <VirtualCamera name="a">
            <Body.HardLockToTarget target={[3, 0, 0]} />
          </VirtualCamera>
        </SequencerCamera>
      </Klipp>,
    );
    await renderer.advanceFrames(1, 0.1);

    expect([...klipp!.state.cameras.keys()]).toEqual(['cutscene']);
    expect(ref.current!.children.liveCameraName).toBe('a');
    expect(klipp!.shot.position[0]).toBe(3);
  });

  it('passes its props to the instance on every render', async () => {
    const ref = createRef<SequencerCameraCore>();
    const scene = (on: boolean) => (
      <Klipp>
        <SequencerCamera ref={ref} name="cutscene" loop={on} paused={on} instructions={[{ camera: 'a', hold: 2 }]} />
      </Klipp>
    );
    const renderer = await create(scene(false));
    await renderer.update(scene(true));

    expect(ref.current!.loop).toBe(true);
    expect(ref.current!.paused).toBe(true);
    expect(ref.current!.instructions).toEqual([{ camera: 'a', hold: 2 }]);
  });

  it('makes a child live only while the group is live too', async () => {
    let childLive: boolean | undefined;
    const scene = (otherPriority: number) => (
      <Klipp defaultBlend={cut}>
        <VirtualCamera name="other" priority={otherPriority} />
        <SequencerCamera name="cutscene" priority={5} instructions={[{ camera: 'a', hold: 1 }]} defaultBlend={cut}>
          <VirtualCamera name="a">
            <LiveReader onRead={(value) => (childLive = value)} />
          </VirtualCamera>
        </SequencerCamera>
      </Klipp>
    );
    const renderer = await create(scene(0));
    await renderer.advanceFrames(2, 0.1);
    expect(childLive).toBe(true);

    await renderer.update(scene(10));
    await renderer.advanceFrames(2, 0.1);
    expect(childLive).toBe(false);
  });
});
