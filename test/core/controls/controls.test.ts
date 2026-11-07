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

  it('measures the view at the orbit center: by distance and fov, or by the zoomed orthographic size', () => {
    const params = controls.createParams({ distance: 10 });
    expect(controls.viewHeight(params, Math.log(2), 90, 4, false)).toBeCloseTo(10, 12);
    expect(controls.viewHeight(params, Math.log(2), 90, 4, true)).toBeCloseTo(4, 12);
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
});
