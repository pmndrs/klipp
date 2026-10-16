import { useThree } from '@react-three/fiber';
import { create } from '@react-three/test-renderer';
import { createRef } from 'react';
import { Euler, Object3D, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { PanTiltAimThree } from '../../../src/three/aim/PanTiltAimThree';
import type { KlippThree } from '../../../src/three/KlippThree';

import { Aim } from '../../../src/react/aim/Aim';
import type { PanTiltProps } from '../../../src/react/aim/PanTilt';
import { InputController } from '../../../src/react/input/InputController';
import { Klipp } from '../../../src/react/Klipp';
import { useKlipp } from '../../../src/react/KlippContext';
import { VirtualCamera } from '../../../src/react/VirtualCamera';

import { mountInCamera } from '../wiring';

function SceneReader({ onRead }: { onRead: (core: KlippThree, element: HTMLElement) => void }) {
  const element = useThree((state) => state.gl.domElement);
  onRead(useKlipp(), element);
  return null;
}

describe('Aim.PanTilt', () => {
  it('turns with a nested InputController, found through context', async () => {
    let core: KlippThree | undefined;
    let element: HTMLElement | undefined;
    const renderer = await create(
      <Klipp>
        <SceneReader onRead={(c, e) => ((core = c), (element = e))} />
        <VirtualCamera name="a" priority={10}>
          <Aim.PanTilt>
            <InputController mouseButtons={{ left: null, right: { axes: { x: 'pan', y: 'tilt' } }, middle: null }} />
          </Aim.PanTilt>
        </VirtualCamera>
      </Klipp>,
    );
    await renderer.advanceFrames(1, 0.05);
    const before = [...core!.activeCameraState!.quaternion];

    const pointer = { pointerId: 1, buttons: 2, bubbles: true, pointerType: 'mouse' };
    element!.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, clientY: 0 }));
    element!.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 20, clientY: 0 }));
    await renderer.advanceFrames(1, 0.05);

    expect(core!.activeCameraState!.quaternion).not.toEqual(before);
  });

  it('passes the target to the aim and each axis its own settings, with pan wrapping and tilt clamped by default', async () => {
    const ref = createRef<PanTiltAimThree>();
    const scene = (props: PanTiltProps) => <Aim.PanTilt ref={ref} {...props} />;
    const mounted = await mountInCamera(scene({}));
    const aim = ref.current!;
    expect([aim.pan.wrap, aim.tilt.wrap]).toEqual([true, false]);
    expect(aim.pan.recentering).not.toBe(aim.tilt.recentering);

    const target = new Object3D();
    const recentering = { enabled: true, wait: 0.5, time: 0.8 };
    await mounted.update(
      scene({
        target,
        autoNormalize: true,
        pan: { damping: 0.5, wrap: false, range: [-90, 90], recentering },
        tilt: { maxSpeed: 20, wrap: true, range: [-45, 45] },
      }),
    );

    expect(ref.current).toBe(aim);
    expect(aim.target).toBe(target);
    expect(aim.pan).toMatchObject({ damping: 0.5, autoNormalize: true, wrap: false, range: [-90, 90], recentering });
    expect(aim.tilt).toMatchObject({ damping: 0, maxSpeed: 20, autoNormalize: false, wrap: true, range: [-45, 45] });
  });

  it('starts each axis at its center, and restores the defaults when settings are removed, keeping the value', async () => {
    const ref = createRef<PanTiltAimThree>();
    const scene = (props: PanTiltProps) => <Aim.PanTilt ref={ref} {...props} />;
    const mounted = await mountInCamera(scene({ pan: { center: 30, range: [-60, 60] } }));
    const aim = ref.current!;
    expect(aim.pan.value).toBe(30);

    aim.pan.setValue(50);
    await mounted.update(scene({}));
    expect(aim.pan).toMatchObject({ center: 0, range: [-180, 180], value: 50 });
  });

  it('stops turning the camera once unmounted', async () => {
    const ref = createRef<PanTiltAimThree>();
    const mounted = await mountInCamera(<Aim.PanTilt ref={ref} />);
    await mounted.frame();
    const aim = ref.current!;
    await mounted.update(null);
    const before = [...mounted.state.quaternion];

    aim.pan.applyDelta(90);
    await mounted.frame();

    expect(mounted.state.quaternion).toEqual(before);
  });

  it("starts from VirtualCamera's initialState.quaternion", async () => {
    const initial = new Quaternion().setFromEuler(new Euler(0, Math.PI / 4, 0));
    const mounted = await mountInCamera(<Aim.PanTilt />, { quaternion: initial });
    await mounted.frame(0.05);
    expect(new Quaternion().fromArray(mounted.state.quaternion).angleTo(initial)).toBeLessThan(1e-3);
    expect(new Vector3(0, 0, -1).applyQuaternion(initial).x).toBeLessThan(0);
  });
});
