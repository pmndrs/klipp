import { describe, expect, it } from 'vitest';

import {
  follow,
  groupFraming,
  hardLockToTarget,
  impulseListener,
  inputAxis,
  lens,
  perlinNoise,
  positionComposer,
  rotateWithFollowTarget,
  rotationComposer,
} from '../../src/core/index';

const factories = {
  'follow.createParams': follow.createParams,
  'groupFraming.createParams': groupFraming.createParams,
  'hardLockToTarget.createParams': hardLockToTarget.createParams,
  'impulseListener.createParams': impulseListener.createParams,
  'inputAxis.createParams': inputAxis.createParams,
  'lens.createParams': lens.createParams,
  'perlinNoise.createParams': perlinNoise.createParams,
  'positionComposer.createParams': positionComposer.createParams,
  'rotateWithFollowTarget.createParams': rotateWithFollowTarget.createParams,
  'rotationComposer.createParams': rotationComposer.createParams,
};

describe('params factories', () => {
  it.each(Object.entries(factories))(
    '%s treats undefined as the default and never shares default objects (real bug: React shared them)',
    (_, create) => {
      const make = create as (settings?: object) => Record<string, unknown>;
      const defaults = make();
      const undefinedSettings = Object.fromEntries(Object.keys(defaults).map((key) => [key, undefined]));

      expect(make(undefinedSettings)).toEqual(defaults);
      for (const [key, value] of Object.entries(make())) {
        // the shared impulseField is meant to be shared
        if (typeof value === 'object' && value !== null && key !== 'field') expect(value).not.toBe(defaults[key]);
      }
    },
  );
});
