import { useThree } from '@react-three/fiber';
import { create } from '@react-three/test-renderer';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ImpulseField } from '../../../src/core/impulse/ImpulseField';
import type { ImpulseListenerNoise } from '../../../src/core/impulse/ImpulseListenerNoise';

import { ImpulseListener, type ImpulseListenerProps } from '../../../src/react/impulse/ImpulseListener';
import { Klipp } from '../../../src/react/Klipp';
import { Noise } from '../../../src/react/noise/Noise';
import { VirtualCamera } from '../../../src/react/VirtualCamera';

import { expectPropsReachInstance, mountInCamera } from '../wiring';

const always = () => 1;

function kickX(amount: number) {
  const field = new ImpulseField();
  field.generate({ position: [0, 0, 0], direction: [amount, 0, 0], shape: always, duration: 60 });
  return field;
}

describe('ImpulseListener', () => {
  it('registers a listener that runs every frame, also as Noise.ImpulseListener', async () => {
    const mounted = await mountInCamera(<Noise.ImpulseListener field={kickX(5)} />);
    await mounted.frame();
    expect(mounted.state.position[0]).toBeCloseTo(5, 3);
  });

  it('passes every prop to the same listener, on mount and when props change', async () => {
    await expectPropsReachInstance<ImpulseListenerProps, ImpulseListenerNoise>(
      (props, ref) => <ImpulseListener ref={ref} {...props} />,
      { field: new ImpulseField(), channelMask: 0b01, gain: 2, cameraSpace: true },
      { field: new ImpulseField(), channelMask: 0b10, gain: 0.5, cameraSpace: false },
    );
  });

  it('stops kicking the camera once unmounted', async () => {
    const field = new ImpulseField();
    const mounted = await mountInCamera(<ImpulseListener field={field} />);
    await mounted.frame();
    await mounted.update(null);

    field.generate({ position: [0, 0, 0], direction: [5, 0, 0], shape: always, duration: 60 });
    await mounted.frame();

    expect(mounted.state.position[0]).toBe(0);
  });

  it('attaches a shake while the shake prop is set, driven by the field', async () => {
    const ref = createRef<ImpulseListenerNoise>();
    const field = new ImpulseField();
    field.generate({ position: [0, 0, 0], shape: always, duration: 60 });
    // A fixed seed: about one random seed in five samples exactly zero after these frames.
    const scene = (shake: boolean) => (
      <ImpulseListener ref={ref} field={field} shake={shake ? { positionAmplitude: [5, 0, 0], seed: 5 } : undefined} />
    );

    const mounted = await mountInCamera(scene(false));
    expect(ref.current!.shake).toBeUndefined();

    await mounted.update(scene(true));
    await mounted.renderer.advanceFrames(5, 0.1);
    expect(ref.current!.shake).toBeDefined();
    expect(mounted.state.position[0]).not.toBe(0);

    await mounted.update(scene(false));
    expect(ref.current!.shake).toBeUndefined();
  });

  it('invalidates on every impulse of its field, and follows a new field', async () => {
    let invalidate: ReturnType<typeof vi.spyOn> | undefined;
    function Scene({ field }: { field: ImpulseField }) {
      const state = useThree();
      invalidate ??= vi.spyOn(state, 'invalidate');
      return (
        <Klipp>
          <VirtualCamera name="a">
            <ImpulseListener field={field} />
          </VirtualCamera>
        </Klipp>
      );
    }
    const first = new ImpulseField();
    const second = new ImpulseField();
    const renderer = await create(<Scene field={first} />);
    await renderer.update(<Scene field={second} />);

    invalidate!.mockClear();
    first.generate({ position: [0, 0, 0] });
    expect(invalidate).not.toHaveBeenCalled();
    second.generate({ position: [0, 0, 0] });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
