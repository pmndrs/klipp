import { describe, expect, it } from 'vitest';

import * as cameraState from '../../src/core/cameraState';
import * as klippState from '../../src/core/klippState';
import { BlendCurves } from '../../src/core/blend/BlendCurves';
import type { KlippParams } from '../../src/core/klippState';

const params: KlippParams = { defaultBlend: { curve: BlendCurves.linear, time: 1 }, customBlends: [] };
const types = (events: { type: string }[]) => events.map((event) => event.type);

describe('klipp state', () => {
  it('createParams defaults to a 2 s ease-in-out blend and no custom blends', () => {
    expect(klippState.createParams()).toEqual({
      defaultBlend: { curve: BlendCurves.easeInOut, time: 2 },
      customBlends: [],
    });
    expect(klippState.createParams({ defaultBlend: params.defaultBlend }).defaultBlend).toBe(params.defaultBlend);
  });

  it('records transitions as data, in order, and leaves draining to the caller', () => {
    const state = klippState.create();
    klippState.register(state, { name: 'a', priority: 1, state: cameraState.create() });
    expect(types(state.events)).toEqual(['activeCameraChanged', 'activated']);
    state.events.length = 0;

    klippState.tick(state, params, 0.1);
    expect(types(state.events)).toEqual(['cut', 'liveCameraChanged']);
    state.events.length = 0;

    klippState.register(state, { name: 'b', priority: 2, state: cameraState.create() });
    klippState.tick(state, params, 0.5);
    expect(state.events).toContainEqual({ type: 'blendCreated', incoming: 'b', outgoing: 'a' });
    state.events.length = 0;

    klippState.tick(state, params, 0.6);
    expect(types(state.events)).toEqual(['blendFinished', 'liveCameraChanged', 'deactivated']);
    expect(state.blend.liveName).toBe('b');
  });

  it('ignores an unregister of a record whose id was taken by a newer registration', () => {
    const state = klippState.create();
    const first = klippState.register(state, { name: 'a', priority: 1, state: cameraState.create() });
    klippState.register(state, { name: 'a', priority: 1, state: cameraState.create() });
    klippState.unregister(state, first);
    expect(state.cameras.has('a')).toBe(true);
  });

  it('keeps the settled output allocation-free: no events while nothing changes', () => {
    const state = klippState.create();
    klippState.register(state, { name: 'a', priority: 1, state: cameraState.create() });
    klippState.tick(state, klippState.createParams(), 0.1);
    state.events.length = 0;
    klippState.setPriority(state, 'a', 5);
    klippState.tick(state, params, 0.1);
    expect(state.events).toEqual([]);
  });

  describe("'manual' selection", () => {
    it('leaves the choice to setActive, whatever the priorities', () => {
      const state = klippState.create('manual');
      klippState.register(state, { name: 'a', priority: 1, state: cameraState.create() });
      klippState.register(state, { name: 'b', priority: 9, state: cameraState.create() });
      expect(state.activeName).toBeNull();
      expect(state.events).toEqual([]);

      klippState.setActive(state, 'a');
      klippState.setPriority(state, 'b', 20);
      expect(state.activeName).toBe('a');
      expect(types(state.events)).toEqual(['activeCameraChanged', 'activated']);

      klippState.tick(state, params, 0.1);
      expect(state.blend.liveName).toBe('a');
    });

    it('ignores an id that is not registered', () => {
      const state = klippState.create('manual');
      klippState.register(state, { name: 'a', priority: 0, state: cameraState.create() });
      klippState.setActive(state, 'a');
      klippState.setActive(state, 'missing');
      expect(state.activeName).toBe('a');
    });

    it('clears the active camera when it unregisters, and keeps blending from the current output', () => {
      const state = klippState.create('manual');
      const a = cameraState.create();
      a.position[0] = 4;
      const record = klippState.register(state, { name: 'a', priority: 0, state: a });
      klippState.setActive(state, 'a');
      klippState.tick(state, params, 0.1);
      state.events.length = 0;

      klippState.unregister(state, record);
      expect(state.activeName).toBeNull();
      expect(types(state.events)).toEqual(['liveCameraChanged', 'deactivated', 'activeCameraChanged']);
      expect(klippState.tick(state, params, 0.1).position[0]).toBe(4);
    });
  });
});
