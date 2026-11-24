import { describe, expect, it } from 'vitest';

import * as debugZones from '../../../src/core/debug/debugZones';

describe('debugZones.composer', () => {
  it('turns half-extents into full boxes around screenPosition, hard limit first', () => {
    expect(debugZones.composer([0.2, -0.1], [0.1, 0.2], [0.4, 0.3])).toEqual([
      { screenPosition: [0.2, -0.1], size: [0.8, 0.6], kind: 'hardLimit' },
      { screenPosition: [0.2, -0.1], size: [0.2, 0.4], kind: 'deadZone' },
    ]);
  });

  it('skips zones that are zero on both axes', () => {
    expect(debugZones.composer([0, 0], [0, 0], [0, 0])).toEqual([]);
    expect(debugZones.composer([0, 0], [0.1, 0], [0, 0])).toHaveLength(1);
  });
});

describe('groupFramingPaddingBox', () => {
  type Settings = Parameters<typeof debugZones.groupFramingPaddingBox>[1];
  const settings = (overrides: Partial<Settings> = {}): Settings => ({
    padding: 2,
    framingMode: 'horizontalAndVertical',
    aspect: 1,
    freeHeight: 1,
    orthographic: false,
    ...overrides,
  });
  const lens = { fov: 60, orthographicSize: 4 };
  const box = (params: Settings, distance = 10, view = lens) =>
    debugZones.groupFramingPaddingBox([0, 0], params, view, distance);

  it('spans the full frame with no padding', () => {
    expect(box(settings({ padding: 0, aspect: 16 / 9 }))).toEqual([2, 2]);
  });

  it('shrinks by the padding over the frustum plane distance', () => {
    // vertical half-FOV 30deg: 1 - 2 / (10 * sin 30deg) = 0.6
    const [x, y] = box(settings());
    expect(y).toBeCloseTo(1.2, 10);
    expect(x).toBeCloseTo(1.2, 10); // square aspect: same on both axes
  });

  it('leaves an axis excluded by framingMode at the full frame', () => {
    expect(box(settings({ framingMode: 'horizontal' }))[1]).toBe(2);
    expect(box(settings({ framingMode: 'vertical' }))[0]).toBe(2);
  });

  it('clamps to nothing when the padding does not fit', () => {
    expect(box(settings({ padding: 5 }), 1)).toEqual([0, 0]);
  });

  it('measures the padding by orthographicSize for an orthographic camera, at any distance', () => {
    expect(box(settings({ padding: 1, aspect: 2, orthographic: true }))).toEqual([1.75, 1.5]);
  });

  it('measures the part of the view the insets leave free, like a narrower lens', () => {
    const freeFov = (2 * Math.atan(Math.tan(Math.PI / 6) * 0.5) * 180) / Math.PI;
    const free = box(settings({ freeHeight: 0.5 }));
    const narrower = box(settings(), 10, { ...lens, fov: freeFov });
    for (let i = 0; i < 2; i++) expect(free[i]).toBeCloseTo(narrower[i], 10);

    const freeOrthographic = box(settings({ freeHeight: 0.5, orthographic: true }));
    expect(freeOrthographic).toEqual(box(settings({ orthographic: true }), 10, { ...lens, orthographicSize: 2 }));
  });
});
