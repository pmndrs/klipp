import { OrthographicCamera, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';

import { BlendCurves } from '../../src/core/blend/BlendCurves';
import { LensExtension } from '../../src/core/extension/LensExtension';

import { HardLookAtAimThree } from '../../src/three/aim/HardLookAtAimThree';
import { HardLockToTargetBodyThree } from '../../src/three/body/HardLockToTargetBodyThree';
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

  it("a new Klipp on the same camera starts from the camera's original pose, not the last shot (real bug: switching scenes carried it over)", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(1, 2, 3);
    const first = new KlippThree(camera);
    addCamera(first, 'a').body = new HardLockToTargetBodyThree([10, 20, 30]);
    first.update(0.1);
    expect(camera.position.toArray()).toEqual([10, 20, 30]);

    expect(addCamera(new KlippThree(camera), 'b').state.position).toEqual([1, 2, 3]);
  });
});
