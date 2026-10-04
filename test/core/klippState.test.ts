import { describe, expect, it } from 'vitest';

import * as cameraState from '../../src/core/CameraState';
import * as klippState from '../../src/core/klippState';
import { BlendCurves } from '../../src/core/blend/BlendCurves';
import { DEFAULT_BLEND } from '../../src/core/blend/BlendDefinition';
import type { KlippParams } from '../../src/core/klippState';

const params: KlippParams = { defaultBlend: { curve: BlendCurves.linear, time: 1 }, customBlends: [] };
const types = (events: { type: string }[]) => events.map((event) => event.type);

describe('klipp state', () => {
  it('records transitions as data, in order, and leaves draining to the caller', () => {
    const state = klippState.create();
    klippState.register(state, { id: 'a', priority: 1, state: cameraState.create() });
    expect(types(state.events)).toEqual(['activeIdChanged', 'activated']);
    state.events.length = 0;

    klippState.tick(state, params, 0.1);
    expect(types(state.events)).toEqual(['cut', 'liveIdChanged']);
    state.events.length = 0;

    klippState.register(state, { id: 'b', priority: 2, state: cameraState.create() });
    klippState.tick(state, params, 0.5);
    expect(state.events).toContainEqual({ type: 'blendCreated', incoming: 'b', outgoing: 'a' });
    state.events.length = 0;

    klippState.tick(state, params, 0.6);
    expect(types(state.events)).toEqual(['blendFinished', 'liveIdChanged', 'deactivated']);
    expect(state.blend.liveId).toBe('b');
  });

  it('ignores an unregister of a record whose id was taken by a newer registration', () => {
    const state = klippState.create();
    const first = klippState.register(state, { id: 'a', priority: 1, state: cameraState.create() });
    klippState.register(state, { id: 'a', priority: 1, state: cameraState.create() });
    klippState.unregister(state, first);
    expect(state.cameras.has('a')).toBe(true);
  });

  it('keeps the settled output allocation-free: no events while nothing changes', () => {
    const state = klippState.create();
    klippState.register(state, { id: 'a', priority: 1, state: cameraState.create() });
    klippState.tick(state, { defaultBlend: DEFAULT_BLEND, customBlends: [] }, 0.1);
    state.events.length = 0;
    klippState.setPriority(state, 'a', 5);
    klippState.tick(state, params, 0.1);
    expect(state.events).toEqual([]);
  });
});
