import { useThree } from '@react-three/fiber';
import { create } from '@react-three/test-renderer';
import { createRef } from 'react';
import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import { BindingModes } from '../../../src/core/body/BindingModes';

import type { OrbitFollowBodyThree } from '../../../src/three/body/OrbitFollowBodyThree';
import type { KlippThree } from '../../../src/three/KlippThree';

import { Body } from '../../../src/react/body/Body';
import type { OrbitFollowProps } from '../../../src/react/body/OrbitFollow';
import { InputController } from '../../../src/react/input/InputController';
import { Klipp } from '../../../src/react/Klipp';
import { useKlipp } from '../../../src/react/KlippContext';
import { VirtualCamera } from '../../../src/react/VirtualCamera';

import { expectPropsReachInstance, expectStopsWhenUnmounted, mountInCamera } from '../wiring';

function SceneReader({ onRead }: { onRead: (core: KlippThree, element: HTMLElement) => void }) {
  const element = useThree((state) => state.gl.domElement);
  onRead(useKlipp(), element);
  return null;
}

describe('Body.OrbitFollow', () => {
  it('registers a body that orbits the target every frame', async () => {
    const target = new Object3D();
    target.position.set(3, 0, 0);
    const mounted = await mountInCamera(<Body.OrbitFollow target={target} radius={5} />);
    await mounted.frame();
    expect(mounted.state.position[0]).toBeCloseTo(3, 9);
    expect(mounted.state.position[2]).toBeCloseTo(5, 9);
  });

  it('passes every body prop to the same body, on mount and when props change', async () => {
    await expectPropsReachInstance<object, OrbitFollowBodyThree>(
      (props, ref) => <Body.OrbitFollow ref={ref} {...props} />,
      { target: new Object3D(), radius: 4, targetOffset: [0, 1, 0], damping: 0.5, maxSpeed: 4 },
      {
        target: new Object3D(),
        radius: 8,
        targetOffset: [1, 2, 3],
        bindingMode: BindingModes.lockToTarget,
        damping: { into: 0.2, from: 1 },
        maxSpeed: 8,
        recenteringTarget: 'axisCenter',
      },
    );
  });

  it('applies axis settings, and restores the defaults when they are removed, keeping the value', async () => {
    const ref = createRef<OrbitFollowBodyThree>();
    const scene = (props: OrbitFollowProps) => <Body.OrbitFollow ref={ref} {...props} />;
    const mounted = await mountInCamera(scene({ radial: { range: [-1, 1], damping: 0.3 } }));
    const body = ref.current!;
    expect(body.radial).toMatchObject({ range: [-1, 1], damping: 0.3 });
    expect(body.vertical.value).toBe(0);

    body.radial.setValue(0.5);
    await mounted.update(scene({}));
    expect(body.radial).toMatchObject({ range: [Math.log(0.5), Math.log(2)], damping: 0, value: 0.5 });
    expect(body.horizontal).toMatchObject({ range: [-180, 180], wrap: true });
  });

  it('turns with a nested InputController, found through context', async () => {
    let core: KlippThree | undefined;
    let element: HTMLElement | undefined;
    const renderer = await create(
      <Klipp>
        <SceneReader onRead={(c, e) => ((core = c), (element = e))} />
        <VirtualCamera name="a" priority={10}>
          <Body.OrbitFollow target={[0, 0, 0]}>
            <InputController mouseButtons={{ left: { axes: { x: 'horizontal', y: 'vertical' } } }} />
          </Body.OrbitFollow>
        </VirtualCamera>
      </Klipp>,
    );
    await renderer.advanceFrames(1, 0.05);
    const before = [...core!.activeState!.position];

    const pointer = { pointerId: 1, buttons: 1, bubbles: true, pointerType: 'mouse' };
    element!.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, clientY: 0 }));
    element!.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 20, clientY: 0 }));
    await renderer.advanceFrames(1, 0.05);

    expect(core!.activeState!.position).not.toEqual(before);
  });

  it("starts from VirtualCamera's initialState.position direction", async () => {
    const target = new Object3D();
    const mounted = await mountInCamera(<Body.OrbitFollow target={target} radius={10} />, { position: [-4, 0, 0] });
    await mounted.frame();
    expect(mounted.state.position[0]).toBeCloseTo(-10, 6);
    expect(mounted.state.position[1]).toBeCloseTo(0, 6);
    expect(mounted.state.position[2]).toBeCloseTo(0, 6);
  });

  it('stops moving the camera once unmounted', async () => {
    await expectStopsWhenUnmounted((target) => <Body.OrbitFollow target={target} />);
  });
});
