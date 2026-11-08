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
    expect(config.mouseButtons?.right?.axes).toEqual({ x: 'panX', y: 'panY' });
    expect(config.touches?.two?.axes).toEqual({ x: 'panX', y: 'panY' });
    expect(config.touches?.three?.axes).toEqual({ x: 'panX', y: 'panY' });
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
});
