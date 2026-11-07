import { useThree } from '@react-three/fiber';
import { create } from '@react-three/test-renderer';
import { createRef, type ReactNode } from 'react';
import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import type { VirtualCamera } from '../../../src/core/VirtualCamera';

import { OrbitFollowHelperThree } from '../../../src/three/body/OrbitFollowHelperThree';
import type { KlippControlsThree } from '../../../src/three/controls/KlippControlsThree';
import type { KlippThree } from '../../../src/three/KlippThree';

import { KlippControls, type KlippControlsProps } from '../../../src/react/controls/KlippControls';
import { Klipp } from '../../../src/react/Klipp';
import { useKlipp } from '../../../src/react/KlippContext';
import { useVirtualCamera } from '../../../src/react/VirtualCameraContext';

function SceneReader({ onRead }: { onRead: (core: KlippThree, element: HTMLElement) => void }) {
  onRead(
    useKlipp(),
    useThree((state) => state.gl.domElement),
  );
  return null;
}

function CameraReader({ onRead }: { onRead: (camera: VirtualCamera) => void }) {
  onRead(useVirtualCamera());
  return null;
}

async function mount(props: Partial<KlippControlsProps>, children?: ReactNode) {
  const ref = createRef<KlippControlsThree>();
  let core: KlippThree | undefined;
  let element: HTMLElement | undefined;
  const scene = (next: Partial<KlippControlsProps>) => (
    <Klipp>
      <SceneReader onRead={(c, e) => ((core = c), (element = e))} />
      <KlippControls name="orbit" priority={10} ref={ref} {...next}>
        {children}
      </KlippControls>
    </Klipp>
  );
  const renderer = await create(scene(props));
  await renderer.advanceFrames(1, 0.05);
  return {
    renderer,
    controls: ref.current!,
    get core() {
      return core!;
    },
    get element() {
      return element!;
    },
    update: (next: Partial<KlippControlsProps>) => renderer.update(scene(next)),
  };
}

describe('KlippControls', () => {
  it('registers a camera that orbits its target at `distance`', async () => {
    const target = new Object3D();
    target.position.set(3, 0, 0);
    target.updateMatrixWorld();
    const mounted = await mount({ target, distance: 5 });
    const { position } = mounted.core.activeCameraState!;
    expect(position[0]).toBeCloseTo(3, 9);
    expect(position[2]).toBeCloseTo(5, 9);
  });

  it('passes every prop to the same camera, on mount and when props change', async () => {
    const mounted = await mount({
      distance: 4,
      minDistance: 1,
      orbit: { damping: 0.5 },
      zoom: { damping: 0.3 },
      pan: { damping: 0.2 },
    });
    const { controls } = mounted;
    expect(controls).toMatchObject({ distance: 4, minDistance: 1, maxDistance: Infinity });
    expect(controls.orbit.damping).toBe(0.5);
    expect(controls.zoom.damping).toBe(0.3);
    expect([controls.panX.damping, controls.panY.damping]).toEqual([0.2, 0.2]);

    const target = new Object3D();
    await mounted.update({
      target,
      distance: 8,
      maxDistance: 20,
      orbit: { bindingMode: 'lockToTarget', targetOffset: [0, 1, 0] },
      horizontal: { center: 45 },
    });
    expect(mounted.controls).toBe(controls);
    expect(controls).toMatchObject({ target, distance: 8, minDistance: 0, maxDistance: 20 });
    expect(controls.orbit).toMatchObject({ damping: 0, bindingMode: 'lockToTarget', targetOffset: [0, 1, 0] });
    expect(controls.horizontal.center).toBe(45);
    expect(controls.zoom.damping).toBe(0);
  });

  it('is the camera its children add pieces to', async () => {
    let camera: VirtualCamera | undefined;
    const mounted = await mount({}, <CameraReader onRead={(c) => (camera = c)} />);
    expect(camera).toBe(mounted.controls);
  });

  it('zooms with the wheel by default, and not once `wheel` is null', async () => {
    const mounted = await mount({});
    const { controls, element, renderer } = mounted;
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
    await renderer.advanceFrames(1, 0.05);
    expect(controls.zoom.value).toBeCloseTo(0.1, 9);

    await mounted.update({ wheel: null });
    await renderer.advanceFrames(1, 0.05);
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
    await renderer.advanceFrames(1, 0.05);
    expect(controls.zoom.value).toBeCloseTo(0.1, 9);
  });

  it('keeps the right-click menu off for panning, unless suppressContextMenu is false', async () => {
    const mounted = await mount({});
    const menu = () => new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const first = menu();
    mounted.element.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);

    await mounted.update({ suppressContextMenu: false });
    const second = menu();
    mounted.element.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(false);
  });

  it('draws the orbit with `debug`', async () => {
    const mounted = await mount({ debug: true });
    const helper = mounted.renderer.scene.findAll((node) => node.instance instanceof OrbitFollowHelperThree);
    expect(helper).toHaveLength(1);
  });
});
