import { degreesToRadians, vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraSpace from '../../../src/core/aim/cameraSpace';
import * as cameraState from '../../../src/core/cameraState';
import * as targetPose from '../../../src/core/targetPose';
import { RotationComposerAim } from '../../../src/core/aim/RotationComposerAim';
import { PositionComposerBody } from '../../../src/core/body/PositionComposerBody';
import { LensExtension } from '../../../src/core/extension/LensExtension';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

describe('LensExtension', () => {
  it('sets the lens before the Aim, so a composer frames with its field of view', () => {
    const klipp = new Klipp();
    const camera = new VirtualCamera('a', { initialState: { fov: 50 } });
    const target = targetPose.create();
    vec3.set(target.position, 0, 0, -10);
    camera.aim = new RotationComposerAim(target, { screenPosition: [0.5, 0] });
    camera.addExtension(new LensExtension({ fov: 30 }));
    klipp.add(camera);
    klipp.update(1 / 60);

    const { position, quaternion, fov } = camera.state;
    const local = cameraSpace.fromWorld(vec3.create(), position, quaternion, target.position);
    expect(local[0] / -local[2] / Math.tan(degreesToRadians(fov) / 2)).toBeCloseTo(0.5, 10);
  });

  it('sets the lens before the Body too, so PositionComposer frames with its fov or orthographic size', () => {
    for (const orthographic of [false, true]) {
      const klipp = new Klipp();
      klipp.orthographic = orthographic;
      const camera = new VirtualCamera('a', { initialState: { fov: 50, orthographicSize: 1 } });
      const target = targetPose.create();
      vec3.set(target.position, 0, 0, -10);
      camera.body = new PositionComposerBody(target, { cameraDistance: 8, screenPosition: [0.5, 0] });
      camera.addExtension(new LensExtension({ fov: 30, orthographicSize: 4 }));
      klipp.add(camera);
      for (let i = 0; i < 3; i++) klipp.update(1 / 60);

      const { position, quaternion } = camera.state;
      const local = cameraSpace.fromWorld(vec3.create(), position, quaternion, target.position);
      const halfHeight = orthographic ? 4 : -local[2] * Math.tan(degreesToRadians(30) / 2);
      expect(local[0] / halfHeight).toBeCloseTo(0.5, 10);
    }
  });

  it('overrides only the fields that are set', () => {
    const out = cameraState.create();
    new LensExtension().update(out, 0.1, false);
    expect([out.fov, out.near, out.far]).toEqual([50, 0.1, 1000]);

    new LensExtension({ fov: 75 }).update(out, 0.1, false);
    expect([out.fov, out.near, out.far]).toEqual([75, 0.1, 1000]);

    new LensExtension({ fov: 60, near: 1, far: 500 }).update(out, 0.1, false);
    expect([out.fov, out.near, out.far]).toEqual([60, 1, 500]);
    expect(out.orthographicSize).toBe(1);

    new LensExtension({ orthographicSize: 4 }).update(out, 0.1, false);
    expect([out.fov, out.orthographicSize]).toEqual([60, 4]);
  });

  describe('zoom', () => {
    const halfHeight = (fov: number) => Math.tan(degreesToRadians(fov) / 2);

    it('magnifies the view e^zoom times, on the fov it gets or the one it sets', () => {
      const extension = new LensExtension();
      extension.zoom.setValue(Math.log(2));
      const out = cameraState.create();
      out.orthographicSize = 3;
      extension.update(out, 0.1, false);
      expect(halfHeight(out.fov)).toBeCloseTo(halfHeight(50) / 2, 12);
      expect(out.orthographicSize).toBeCloseTo(1.5, 12);

      extension.fov = 70;
      extension.orthographicSize = 4;
      extension.update(out, 0.1, false);
      expect(halfHeight(out.fov)).toBeCloseTo(halfHeight(70) / 2, 12);
      expect(out.orthographicSize).toBeCloseTo(2, 12);
    });

    it('goes from 1× to 10× by default, starting at its center', () => {
      const extension = new LensExtension();
      expect(extension.inputAxes.zoom).toBe(extension.zoom);
      expect(extension.zoom).toMatchObject({ value: 0, range: [0, Math.log(10)], wrap: false });

      extension.zoom.setValue(5);
      expect(extension.zoom.value).toBeCloseTo(Math.log(10), 12);
      expect(new LensExtension({ zoom: { center: 1, range: [-1, 2] } }).zoom.value).toBe(1);
    });

    it('magnifies the camera lens once per frame, without building up', () => {
      const klipp = new Klipp();
      const camera = new VirtualCamera('a', { initialState: { fov: 50 } });
      const extension = new LensExtension();
      extension.zoom.setValue(Math.log(2));
      camera.addExtension(extension);
      klipp.add(camera);
      for (let i = 0; i < 3; i++) klipp.update(1 / 60);
      expect(halfHeight(camera.state.fov)).toBeCloseTo(halfHeight(50) / 2, 12);
    });

    it('reports whether it is still moving while the axis eases', () => {
      const extension = new LensExtension({ zoom: { damping: 0.3 } });
      const out = cameraState.create();
      expect(extension.update(out, 0.1, false)).toBe(false);

      extension.zoom.applyDelta(1);
      expect(extension.update(out, 0.1, false)).toBe(true);
      for (let i = 0; i < 300; i++) extension.update(out, 0.1, false);
      expect(extension.update(out, 0.1, false)).toBe(false);
    });

    it('primeFrom starts from the primed lens as seen through the zoom', () => {
      const extension = new LensExtension({ fov: 50, orthographicSize: 4, fovDamping: 1, orthographicSizeDamping: 1 });
      extension.zoom.setValue(Math.log(2));
      extension.primeFrom({ fov: 60, orthographicSize: 2 });
      const out = cameraState.create();
      extension.update(out, 1e-9, true);
      expect(out.fov).toBeCloseTo(60, 6);
      expect(out.orthographicSize).toBeCloseTo(2, 6);
    });
  });

  describe('damping', () => {
    it('is instant by default, and with damping snaps on the first update then eases', () => {
      const instant = new LensExtension({ fov: 50 });
      const instantOut = cameraState.create();
      instant.update(instantOut, 0.1, false);
      instant.fov = 90;
      instant.update(instantOut, 0.1, false);
      expect(instantOut.fov).toBe(90);

      const damped = new LensExtension({ fov: 50, fovDamping: 1 });
      const out = cameraState.create();
      damped.update(out, 0.1, false);
      expect(out.fov).toBe(50);

      damped.fov = 90;
      damped.update(out, 0.1, false);
      expect(out.fov).toBeGreaterThan(50);
      expect(out.fov).toBeLessThan(90);
    });

    it('damps each field on its own', () => {
      const extension = new LensExtension({ fov: 50, orthographicSize: 2, near: 1, orthographicSizeDamping: 1 });
      const out = cameraState.create();
      extension.update(out, 0.1, false);

      extension.fov = 90;
      extension.orthographicSize = 8;
      extension.near = 5;
      extension.update(out, 0.1, false);

      expect([out.fov, out.near]).toEqual([90, 5]);
      expect(out.orthographicSize).toBeGreaterThan(2);
      expect(out.orthographicSize).toBeLessThan(8);
    });

    it('keeps its own progress when something else resets out.fov every frame', () => {
      const extension = new LensExtension({ fov: 50, fovDamping: 1 });
      const out = cameraState.create();
      extension.update(out, 0.1, false);

      extension.fov = 90;
      for (let i = 0; i < 5; i++) {
        out.fov = 35;
        extension.update(out, 0.1, false);
      }

      expect(out.fov).toBeGreaterThan(50);
    });

    it('each max speed caps its own field', () => {
      const step = (field: 'fov' | 'orthographicSize' | 'near' | 'far', maxSpeed: number) => {
        const extension = new LensExtension({
          fov: 50,
          orthographicSize: 2,
          near: 1,
          far: 10,
          fovDamping: 1,
          orthographicSizeDamping: 1,
          nearDamping: 1,
          farDamping: 1,
          [`${field}MaxSpeed`]: maxSpeed,
        });
        const out = cameraState.create();
        extension.update(out, 0.1, false);
        extension[field] = 1000;
        extension.update(out, 0.1, false);
        return out[field];
      };

      for (const field of ['fov', 'orthographicSize', 'near', 'far'] as const) {
        expect(step(field, 5)).toBeLessThan(step(field, Infinity));
      }
    });

    it('reports whether it is still moving', () => {
      const extension = new LensExtension({ fov: 50, fovDamping: 0.3 });
      const out = cameraState.create();
      extension.update(out, 0.1, false);
      expect(extension.update(out, 0.1, false)).toBe(false);

      extension.fov = 90;
      expect(extension.update(out, 0.1, false)).toBe(true);
      for (let i = 0; i < 300; i++) extension.update(out, 0.1, false);
      expect(extension.update(out, 0.1, false)).toBe(false);

      expect(new LensExtension().update(out, 0.1, false)).toBe(false);
    });

    it('primeFrom makes the next activation ease from the primed fields, once', () => {
      const extension = new LensExtension({
        fov: 90,
        orthographicSize: 8,
        near: 5,
        fovDamping: 1,
        orthographicSizeDamping: 1,
        nearDamping: 1,
      });
      const out = cameraState.create();
      extension.primeFrom({ fov: 30, orthographicSize: 2 });

      extension.update(out, 0.1, true);
      expect(out.fov).toBeGreaterThan(30);
      expect(out.fov).toBeLessThan(90);
      expect(out.orthographicSize).toBeGreaterThan(2);
      expect(out.orthographicSize).toBeLessThan(8);
      expect(out.near).toBe(5);

      extension.fov = 20;
      extension.update(out, 0.1, true);
      expect(out.fov).toBe(20);
    });

    it('justActivated snaps to a changed value, where a plain update would ease', () => {
      const run = (justActivated: boolean) => {
        const extension = new LensExtension({ fov: 50, fovDamping: 0.5 });
        const out = cameraState.create();
        extension.update(out, 0.1, true);
        extension.update(out, 0.1, false);
        extension.fov = 100;
        extension.update(out, 0.1, justActivated);
        return out.fov;
      };

      expect(run(true)).toBe(100);
      expect(run(false)).toBeLessThan(100);
    });
  });
});
