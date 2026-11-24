import { OrthographicCamera, PerspectiveCamera, Vector3, type Camera } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { BlendCurves } from '../../src/core/blend/BlendCurves';
import { LensExtension } from '../../src/core/extension/LensExtension';
import type { VirtualCamera } from '../../src/core/VirtualCamera';

import { HardLookAtAimThree } from '../../src/three/aim/HardLookAtAimThree';
import { RotationComposerAimThree } from '../../src/three/aim/RotationComposerAimThree';
import { HardLockToTargetBodyThree } from '../../src/three/body/HardLockToTargetBodyThree';
import { PositionComposerBodyThree } from '../../src/three/body/PositionComposerBodyThree';
import { KlippControlsThree } from '../../src/three/controls/KlippControlsThree';
import { FollowZoomExtensionThree } from '../../src/three/extension/FollowZoomExtensionThree';
import { GroupFramingExtensionThree } from '../../src/three/extension/GroupFramingExtensionThree';
import { TargetGroup } from '../../src/three/extension/TargetGroup';
import { KlippThree } from '../../src/three/KlippThree';
import { VirtualCameraThree, type VirtualCameraThreeOptions } from '../../src/three/VirtualCameraThree';

function addCamera(klipp: KlippThree, name: string, options?: VirtualCameraThreeOptions): VirtualCameraThree {
  const camera = new VirtualCameraThree(name, options);
  klipp.add(camera);
  return camera;
}

function scene(options?: ConstructorParameters<typeof KlippThree>[1]) {
  const camera = new PerspectiveCamera(50);
  const klipp = new KlippThree(camera, { defaultBlend: { curve: BlendCurves.linear, time: 1 }, ...options });
  const left = addCamera(klipp, 'left', { priority: 10 });
  left.body = new HardLockToTargetBodyThree([-10, 0, 0]);
  const right = addCamera(klipp, 'right', { priority: 0 });
  right.body = new HardLockToTargetBodyThree([10, 0, 0]);
  return { camera, klipp, left, right };
}

describe('KlippThree', () => {
  it('drives a PerspectiveCamera from the winning shot, lens included, and blends to a new winner', () => {
    const { camera, klipp, right } = scene();
    right.aim = new HardLookAtAimThree([10, 0, -10]);
    right.addExtension(new LensExtension({ fov: 30 }));
    klipp.update(0.1);
    expect(camera.position.x).toBe(-10);

    right.priority = 20;
    klipp.update(0.5);
    expect(camera.position.x).toBeCloseTo(0, 5);
    klipp.update(0.5);
    expect(camera.position.x).toBe(10);
    expect(camera.fov).toBe(30);
  });

  it('writes the view offset in pixels of the size it was given', () => {
    const camera = new PerspectiveCamera();
    const klipp = new KlippThree(camera);
    klipp.setSize(1280, 800);
    addCamera(klipp, 'a').addExtension({
      update: (out) => {
        out.viewOffset[0] = 0.5;
        out.viewOffset[1] = -0.3;
      },
    });
    klipp.update(0.1);

    expect(camera.view).toMatchObject({ enabled: true, offsetX: -320, offsetY: -120 });
  });

  it('drives an OrthographicCamera, its size included, and starts new virtual cameras from its own size', () => {
    const camera = new OrthographicCamera(-400, 400, 300, -300);
    camera.zoom = 100;
    const klipp = new KlippThree(camera);
    expect(klipp.orthographic).toBe(true);

    expect(addCamera(klipp, 'default').state.orthographicSize).toBe(3);
    addCamera(klipp, 'a', { priority: 10, initialState: { position: [1, 2, 3], orthographicSize: 5 } });
    klipp.update(0.1);

    expect(camera.position.toArray()).toEqual([1, 2, 3]);
    expect(camera.zoom).toBe(60);
  });

  it('gives a new camera the current shot on the next frame, and follows its projection', () => {
    const { klipp } = scene();
    klipp.update(0.1);
    klipp.update(0.1);

    const orthographic = new OrthographicCamera();
    klipp.camera = orthographic;
    expect(klipp.orthographic).toBe(true);
    klipp.update(0.1);
    expect(orthographic.position.x).toBe(-10);

    const perspective = new PerspectiveCamera();
    klipp.camera = perspective;
    expect(klipp.orthographic).toBe(false);
    klipp.update(0.1);
    expect(perspective.position.x).toBe(-10);
  });

  it("a camera swapped in keeps its original pose for a later Klipp, not the shot written to it (real bug: the next example started from the last one's shot)", () => {
    const { klipp } = scene();
    const swapped = new OrthographicCamera();
    swapped.position.set(1, 2, 3);
    klipp.camera = swapped;
    klipp.update(0.1);
    expect(swapped.position.x).toBe(-10);

    expect(addCamera(new KlippThree(swapped), 'b').state.position).toEqual([1, 2, 3]);
  });

  it("a new Klipp on the same camera starts from the camera's original pose, not the last shot (real bug: switching scenes carried it over)", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(1, 2, 3);
    const first = new KlippThree(camera);
    addCamera(first, 'a').body = new HardLockToTargetBodyThree([10, 20, 30]);
    first.update(0.1);
    expect(camera.position.toArray()).toEqual([10, 20, 30]);

    expect(addCamera(new KlippThree(camera), 'b').state.position).toEqual([1, 2, 3]);
  });

  it("takes the scene up from the camera's up, unless given one, and starts new virtual cameras from it", () => {
    const camera = new PerspectiveCamera(50);
    camera.up.set(0, 0, 1);
    const klipp = new KlippThree(camera);
    expect(klipp.up).toEqual([0, 0, 1]);
    expect(new KlippThree(camera, { up: [1, 0, 0] }).up).toEqual([1, 0, 0]);

    const virtual = addCamera(klipp, 'a');
    expect(virtual.state.referenceUp).toEqual([0, 0, 1]);
  });

  it('asks for a frame when the camera is swapped', () => {
    const { klipp } = scene();
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);

    klipp.camera = new OrthographicCamera();
    expect(requested).toHaveBeenCalled();
  });
});

describe('KlippThree - insets', () => {
  // An 800x600 viewport with a panel on the left and a drawer at the bottom leaves 600x300 free around NDC [0.25, 0.5].
  const insets = { left: 200, bottom: 300 };
  const views = () => [
    new PerspectiveCamera(50, 800 / 600, 0.1, 1000),
    new OrthographicCamera(-4, 4, 3, -3, 0.1, 1000),
  ];

  function drive(camera: PerspectiveCamera | OrthographicCamera, shot: VirtualCamera): void {
    const klipp = new KlippThree(camera, { insets });
    klipp.setSize(800, 600);
    klipp.add(shot);
    for (let i = 0; i < 5; i++) klipp.update(0.1);
    camera.updateMatrixWorld(true);
  }

  /** Where `point` shows in the free part through `camera`, `±1` at its edges. */
  function inFreePart(camera: Camera, point: Vector3): [number, number] {
    const ndc = point.clone().project(camera);
    return [(ndc.x - 0.25) / 0.75, (ndc.y - 0.5) / 0.5];
  }

  function expectAt(actual: [number, number], expected: [number, number]): void {
    for (let i = 0; i < 2; i++) expect(actual[i]).toBeCloseTo(expected[i], 6);
  }

  it("put a composer's target at its screenPosition in the free part", () => {
    for (const camera of views()) {
      const target = new Vector3(2, 1, -10);
      const turning = new VirtualCameraThree('turning');
      turning.aim = new RotationComposerAimThree(target, { screenPosition: [0.3, 0.2] });
      drive(camera, turning);
      expectAt(inFreePart(camera, target), [0.3, 0.2]);

      const moving = new VirtualCameraThree('moving');
      moving.body = new PositionComposerBodyThree(target, { cameraDistance: 10, screenPosition: [-0.4, 0.3] });
      drive(camera, moving);
      expectAt(inFreePart(camera, target), [-0.4, 0.3]);
    }
  });

  it('fit a group, a FollowZoom width and KlippControls points to the free part', () => {
    for (const camera of views()) {
      const left = new Vector3(-3, 0, -10);
      const right = new Vector3(3, 0, -10);
      const group = new VirtualCameraThree('group');
      const members = new TargetGroup([
        { target: left, radius: 0 },
        { target: right, radius: 0 },
      ]);
      group.addExtension(new GroupFramingExtensionThree(members, { fitMode: 'rigid', framingMode: 'horizontal' }));
      drive(camera, group);
      expectAt(inFreePart(camera, right), [1, 0]);

      const zoom = new VirtualCameraThree('zoom');
      zoom.addExtension(new FollowZoomExtensionThree(new Vector3(0, 0, -10), { width: 4, damping: 0 }));
      drive(camera, zoom);
      expectAt(inFreePart(camera, new Vector3(2, 0, -10)), [1, 0]);

      const controls = new KlippControlsThree('controls');
      controls.fitPoints([-3, 0, 0, 3, 0, 0], 2);
      drive(camera, controls);
      expect(inFreePart(camera, new Vector3(3, 0, 0))[0]).toBeCloseTo(1, 6);
    }
  });
});
