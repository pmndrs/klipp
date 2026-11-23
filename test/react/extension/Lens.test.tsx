import { useThree } from '@react-three/fiber';
import { create } from '@react-three/test-renderer';
import { degreesToRadians } from 'math';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { LensExtension } from '../../../src/core/extension/LensExtension';

import type { KlippThree } from '../../../src/three/KlippThree';

import { Extension } from '../../../src/react/extension/Extension';
import type { LensProps } from '../../../src/react/extension/Lens';
import { InputController } from '../../../src/react/input/InputController';
import { Klipp } from '../../../src/react/Klipp';
import { useKlipp } from '../../../src/react/KlippContext';
import { VirtualCamera } from '../../../src/react/VirtualCamera';

import { expectPropsReachInstance, mountInCamera } from '../wiring';

function SceneReader({ onRead }: { onRead: (core: KlippThree, element: HTMLElement) => void }) {
  const element = useThree((state) => state.gl.domElement);
  onRead(useKlipp(), element);
  return null;
}

describe('Extension.Lens', () => {
  it('registers an extension that sets the lens every frame, leaving unset fields alone', async () => {
    const mounted = await mountInCamera(<Extension.Lens fov={75} />, { near: 0.5, far: 200 });
    await mounted.frame();
    expect([mounted.state.fov, mounted.state.near, mounted.state.far]).toEqual([75, 0.5, 200]);
  });

  it('passes every prop to the same extension, on mount and when props change', async () => {
    await expectPropsReachInstance<LensProps, LensExtension>(
      (props, ref) => <Extension.Lens ref={ref} {...props} />,
      {
        fov: 40,
        orthographicSize: 3,
        near: 0.2,
        far: 300,
        fovDamping: 0.5,
        orthographicSizeDamping: 0.6,
        nearDamping: 0.1,
        farDamping: 0.2,
        fovMaxSpeed: 5,
        orthographicSizeMaxSpeed: 7,
        nearMaxSpeed: 1,
        farMaxSpeed: 2,
      },
      {
        fov: 70,
        orthographicSize: 6,
        near: 0.4,
        far: 900,
        fovDamping: { into: 0.2, from: 1 },
        orthographicSizeDamping: 0.8,
        nearDamping: 0.3,
        farDamping: 0.4,
        fovMaxSpeed: 9,
        orthographicSizeMaxSpeed: 11,
        nearMaxSpeed: 3,
        farMaxSpeed: 4,
      },
    );
  });

  it('gives the camera back its own lens once unmounted, and stops changing it', async () => {
    const ref = createRef<LensExtension>();
    const mounted = await mountInCamera(<Extension.Lens ref={ref} fov={60} />, { fov: 40 });
    await mounted.frame();
    const lens = ref.current!;
    await mounted.update(null);
    await mounted.frame();
    expect(mounted.state.fov).toBe(40);

    lens.fov = 20;
    await mounted.frame();

    expect(mounted.state.fov).toBe(40);
  });

  it('zooms with the wheel of a nested InputController, found through context', async () => {
    let core: KlippThree | undefined;
    let element: HTMLElement | undefined;
    const renderer = await create(
      <Klipp>
        <SceneReader onRead={(c, e) => ((core = c), (element = e))} />
        <VirtualCamera name="a" priority={10} initialState={{ fov: 50 }}>
          <Extension.Lens>
            <InputController wheel={{ axis: 'zoom', gain: 0.001 }} />
          </Extension.Lens>
        </VirtualCamera>
      </Klipp>,
    );
    await renderer.advanceFrames(1, 0.05);
    element!.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
    await renderer.advanceFrames(1, 0.05);

    const magnification = Math.tan(degreesToRadians(25)) / Math.tan(degreesToRadians(core!.activeCameraState!.fov / 2));
    expect(magnification).toBeCloseTo(Math.exp(0.1), 9);
  });

  it('passes zoom settings to the axis, and restores the defaults when they are removed, keeping the value', async () => {
    const ref = createRef<LensExtension>();
    const scene = (props: LensProps) => <Extension.Lens ref={ref} {...props} />;
    const mounted = await mountInCamera(scene({ zoom: { center: 1, range: [0, 2], damping: 0.5 } }));
    const lens = ref.current!;
    expect(lens.zoom).toMatchObject({ value: 1, range: [0, 2], damping: 0.5 });

    lens.zoom.setValue(1.5);
    await mounted.update(scene({}));
    expect(ref.current).toBe(lens);
    expect(lens.zoom).toMatchObject({ value: 1.5, center: 0, range: [0, Math.log(10)], damping: 0 });
  });
});
