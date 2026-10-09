import { quat, vec3, type Quat, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import { lookRotation } from '../../../src/core/aim/lookRotation';

import { forwardDot } from '../mathHelpers';

const up: Vec3 = [0, 1, 0];
const screenUp = (rotation: Quat) => vec3.transformQuat(vec3.create(), up, rotation);

describe('lookRotation', () => {
  it('looks straight down with a unit rotation, keeping the previous screen top', () => {
    const position: Vec3 = [0, 10, 0];
    const target: Vec3 = [0, 0, 0];
    const nearPole = lookRotation(quat.create(), [0, 10, 0.01], target, up, quat.create());
    const atPole = lookRotation(quat.create(), position, target, up, nearPole);

    expect(quat.length(atPole)).toBeCloseTo(1, 9);
    expect(forwardDot(atPole, position, target)).toBeCloseTo(1, 9);
    expect(vec3.dot(screenUp(atPole), screenUp(nearPole))).toBeGreaterThan(0.999);
  });

  it('falls back to the previous forward when the previous top is parallel too', () => {
    const position: Vec3 = [0, 10, 0];
    const atPole = lookRotation(quat.create(), position, [0, 0, 0], up, quat.create());

    expect(quat.length(atPole)).toBeCloseTo(1, 9);
    expect(forwardDot(atPole, position, [0, 0, 0])).toBeCloseTo(1, 9);
    expect(vec3.dot(screenUp(atPole), [0, 0, -1])).toBeCloseTo(1, 9);
  });
});
