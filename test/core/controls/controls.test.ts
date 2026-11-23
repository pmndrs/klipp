import { quat, vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as controls from '../../../src/core/controls/controls';
import { InputAxis } from '../../../src/core/input/InputAxis';

describe('controls', () => {
  it('turns zoom into a distance and back: zooming in is positive', () => {
    const params = controls.createParams({ distance: 10 });
    expect(controls.distanceAt(params, 0)).toBe(10);
    expect(controls.distanceAt(params, Math.log(2))).toBeCloseTo(5, 12);
    expect(controls.zoomAt(params, 5)).toBeCloseTo(Math.log(2), 12);
    expect(controls.zoomAt(params, 20)).toBeCloseTo(-Math.log(2), 12);
  });

  it('puts the zoom range between the far and the near limit, unbounded by default', () => {
    const range: [number, number] = [0, 0];
    expect(controls.zoomRange(range, controls.createParams())).toEqual([-Infinity, Infinity]);

    controls.zoomRange(range, controls.createParams({ distance: 10, minDistance: 2, maxDistance: 40 }));
    expect(range[0]).toBeCloseTo(Math.log(10 / 40), 12);
    expect(range[1]).toBeCloseTo(Math.log(10 / 2), 12);
  });

  it('measures the view at a distance: by the fov, or by the orthographic size', () => {
    const view = { fov: 90, orthographicSize: 2 };
    expect(controls.viewHeight(view, 5, false)).toBeCloseTo(10, 12);
    expect(controls.viewHeight(view, 5, true)).toBe(4);
  });

  it('finds the distance and the orthographic size that just hold a sphere, by the narrower side', () => {
    expect(controls.fitSphereDistance(1, 90, 2)).toBeCloseTo(Math.SQRT2, 12);
    expect(controls.fitSphereDistance(1, 90, 1 / Math.sqrt(3))).toBeCloseTo(2, 12);
    expect(controls.fitSphereSize(1, 2)).toBe(1);
    expect(controls.fitSphereSize(1, 0.5)).toBe(2);
  });

  it('finds the distance that just holds every corner of a box, as the view is turned', () => {
    const facing = quat.create();
    expect(controls.fitBoxDistance([1, 1, 1], facing, 90, 1)).toBeCloseTo(2, 12);
    expect(controls.fitBoxDistance([1, 0.5, 1], facing, 90, 0.5)).toBeCloseTo(3, 12);
    const corner = quat.setAxisAngle(quat.create(), [0, 1, 0], Math.PI / 4);
    expect(controls.fitBoxDistance([1, 1, 1], corner, 90, 1)).toBeCloseTo(Math.SQRT2 + 1, 12);
  });

  it('finds the middle of the box around the first count points', () => {
    expect(controls.pointsCenter(vec3.create(), [0, 0, 0, 2, 4, -2, 1, 1, 1], 3)).toEqual([1, 2, -0.5]);
    expect(controls.pointsCenter(vec3.create(), [0, 0, 0, 2, 4, -2, 9, 9, 9], 2)).toEqual([1, 2, -1]);
  });

  it('finds the distance and the orthographic size that just hold every point, with padding around each', () => {
    const points = [0, 1, 0, 0, -1, 0, 0, 9, 0];
    expect(controls.fitPointsDistance(points, 2, [0, 0, 0], quat.create(), 90, 1)).toBeCloseTo(1, 12);
    expect(controls.fitPointsDistance(points, 2, [0, 0, 0], quat.create(), 90, 1, 0.5)).toBeCloseTo(2, 12);
    expect(controls.fitPointsSize(points, 2, [0, 0, 0], quat.create(), 1, 0.5)).toBeCloseTo(1.5, 12);
  });

  it('finds the orthographic size that just holds every corner of a box, as the view is turned', () => {
    expect(controls.fitBoxSize([1, 0.5, 1], quat.create(), 2)).toBeCloseTo(0.5, 12);
    const corner = quat.setAxisAngle(quat.create(), [0, 1, 0], Math.PI / 4);
    expect(controls.fitBoxSize([1, 0.5, 1], corner, 1)).toBeCloseTo(Math.SQRT2, 12);
  });

  it('pans against the drag along the view: right drags the center left, down drags it up', () => {
    const out = vec3.create();
    expect(controls.panDelta(out, quat.create(), 10, 0, 0.1)).toEqual([-1, 0, 0]);
    expect(controls.panDelta(out, quat.create(), 0, 10, 0.1)).toEqual([0, 1, 0]);
    const turned = quat.setAxisAngle(quat.create(), [0, 1, 0], Math.PI / 2);
    controls.panDelta(out, turned, 10, 0, 0.1);
    for (const [i, value] of [0, 0, 1].entries()) expect(out[i]).toBeCloseTo(value, 12);
  });

  describe('constrainPan', () => {
    // Looking 30° down, along -z.
    const view = quat.setAxisAngle(quat.create(), [1, 0, 0], -Math.PI / 6);
    const frame = quat.create();
    const expectClose = (actual: ArrayLike<number>, expected: number[]) => {
      for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
    };

    it('keeps a pan with every axis free, and drops it with every axis locked', () => {
      const up = controls.panDelta(vec3.create(), view, 0, 10, 0.1);
      expectClose(controls.constrainPan(vec3.create(), up, {}, frame, view), [...up]);
      expectClose(controls.constrainPan(vec3.create(), up, { x: true, y: true, z: true }, frame, view), [0, 0, 0]);
    });

    it('carries a pan onto the plane along the line of sight, so the center keeps up with the drag', () => {
      const up = controls.panDelta(vec3.create(), view, 0, 10, 0.1);
      const out = controls.constrainPan(vec3.create(), up, { y: true }, frame, view);
      expectClose(out, [0, 0, -1 / Math.sin(Math.PI / 6)]);
      const forward = vec3.transformQuat(vec3.create(), [0, 0, -1], view);
      const offSight = vec3.cross(vec3.create(), vec3.subtract(vec3.create(), out, up), forward);
      expect(vec3.length(offSight)).toBeCloseTo(0, 9);
    });

    it('stays bounded on a plane seen edge-on, moving away from the camera', () => {
      const level = quat.create();
      const up = controls.panDelta(vec3.create(), level, 0, 10, 0.1);
      expectClose(controls.constrainPan(vec3.create(), up, { y: true }, frame, level), [
        0,
        0,
        -1 / Math.sin((10 * Math.PI) / 180),
      ]);
    });

    it('drops a sideways drag on a plane seen edge-on, and keeps a drag up or down on it', () => {
      const level = quat.create();
      const right = controls.panDelta(vec3.create(), level, -10, 0, 0.1);
      expectClose(controls.constrainPan(vec3.create(), right, { x: true }, frame, level), [0, 0, 0]);
      const up = controls.panDelta(vec3.create(), level, 0, 10, 0.1);
      expectClose(controls.constrainPan(vec3.create(), up, { x: true }, frame, level), [0, 1, 0]);
    });

    it('moves along an axis seen end-on away from the camera on a drag down, and not on a sideways drag', () => {
      const level = quat.create();
      const lock = { x: true, y: true };
      const up = controls.panDelta(vec3.create(), level, 0, 10, 0.1);
      expectClose(controls.constrainPan(vec3.create(), up, lock, frame, level), [
        0,
        0,
        -1 / Math.sin((10 * Math.PI) / 180),
      ]);
      const right = controls.panDelta(vec3.create(), level, -10, 0, 0.1);
      expectClose(controls.constrainPan(vec3.create(), right, lock, frame, level), [0, 0, 0]);
    });

    it('moves along a single free axis as far as the drag goes along it on screen', () => {
      const lock = { y: true, z: true };
      const right = controls.panDelta(vec3.create(), view, -10, 0, 0.1);
      expectClose(controls.constrainPan(vec3.create(), right, lock, frame, view), [1, 0, 0]);
      const up = controls.panDelta(vec3.create(), view, 0, 10, 0.1);
      expectClose(controls.constrainPan(vec3.create(), up, lock, frame, view), [0, 0, 0]);
    });

    it('turns a frame about its up so its x lies along the right of the view, whatever the view pitches', () => {
      const yawed = quat.multiply(quat.create(), quat.setAxisAngle(quat.create(), [0, 1, 0], Math.PI / 2), view);
      const out = controls.viewFrame(quat.create(), frame, yawed);
      expectClose(vec3.transformQuat(vec3.create(), [1, 0, 0], out), [0, 0, -1]);
      expectClose(vec3.transformQuat(vec3.create(), [0, 1, 0], out), [0, 1, 0]);
    });

    it('drops the locked parts of a dolly, along the axes of the frame', () => {
      expectClose(controls.constrainDolly(vec3.create(), [1, 2, 3], { y: true }, frame), [1, 0, 3]);
      const turned = quat.setAxisAngle(quat.create(), [0, 0, 1], Math.PI / 2);
      expectClose(controls.constrainDolly(vec3.create(), [1, 2, 3], { y: true }, turned), [0, 2, 3]);
    });
  });

  it('applies pan settings to both pan axes', () => {
    const axes = {
      horizontal: new InputAxis(),
      vertical: new InputAxis(),
      zoom: new InputAxis(),
      panX: new InputAxis(),
      panY: new InputAxis(),
    };
    controls.applyAxisSettings(axes, { pan: { damping: 0.4 } });
    expect([axes.panX.damping, axes.panY.damping, axes.zoom.damping]).toEqual([0.4, 0.4, 0]);
  });

  it('maps orbiting, panning and zoom to the mouse, touch, wheel and pinch, by axis or by name', () => {
    const config = controls.inputConfig({
      horizontal: 'horizontal',
      vertical: 'vertical',
      zoom: 'zoom',
      panX: 'panX',
      panY: 'panY',
    });
    expect(config.mouseButtons?.left?.axes).toEqual({ x: 'horizontal', y: 'vertical' });
    expect(config.touches?.one?.axes).toEqual({ x: 'horizontal', y: 'vertical' });
    expect(config.wheel?.axis).toBe('zoom');
    expect(config.pinch?.axis).toBe('zoom');
    expect(config.wheel?.invert).toBeUndefined();
    expect(config.mouseButtons?.middle).toEqual({ axes: { y: 'zoom' }, gain: 0.005, invert: true });
    expect(config.mouseButtons?.right?.axes).toEqual({ x: 'panX', y: 'panY' });
    expect(config.touches?.two?.axes).toEqual({ x: 'panX', y: 'panY' });
    expect(config.touches?.three?.axes).toEqual({ x: 'panX', y: 'panY' });
    expect(config.modifiers?.shift?.left?.axes).toEqual({ x: 'panX', y: 'panY' });
    expect(config.modifiers?.meta?.left?.axes).toEqual({ x: 'panX', y: 'panY' });
    expect(config.modifiers?.ctrl?.left).toBe(config.mouseButtons?.middle);
    expect(config.modifiers?.alt).toBeUndefined();
  });

  it('replaces each source given in the overrides, keeping the other defaults, and turns off one set to null', () => {
    const names = { horizontal: 'h', vertical: 'v', zoom: 'z', panX: 'px', panY: 'py' };
    const config = controls.inputConfig(names, {
      mouseButtons: { right: null, middle: { axes: { x: 'px', y: 'py' } } },
      touches: { one: { axes: { x: 'px' } } },
      wheel: null,
    });
    expect(config.mouseButtons).toEqual({
      left: { axes: { x: 'h', y: 'v' }, gain: 0.3 },
      right: null,
      middle: { axes: { x: 'px', y: 'py' } },
    });
    expect(config.touches?.one).toEqual({ axes: { x: 'px' } });
    expect(config.touches?.two?.axes).toEqual({ x: 'px', y: 'py' });
    expect(config.wheel).toBeNull();
    expect(config.pinch).toEqual({ axis: 'z' });
  });

  it('replaces the keys given in the overrides, and turns them all off with null', () => {
    const names = { horizontal: 'h', vertical: 'v', zoom: 'z', panX: 'px', panY: 'py' };
    const keyed = controls.inputConfig(names, { modifiers: { shift: null, alt: { left: { axes: { y: 'z' } } } } });
    expect(keyed.modifiers?.shift).toBeNull();
    expect(keyed.modifiers?.meta?.left?.axes).toEqual({ x: 'px', y: 'py' });
    expect(keyed.modifiers?.alt?.left?.axes).toEqual({ y: 'z' });
    expect(controls.inputConfig(names, { modifiers: null }).modifiers).toBeNull();
  });
});
