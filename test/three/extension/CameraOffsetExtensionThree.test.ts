import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CameraOffsetExtensionThree } from '../../../src/three/extension/CameraOffsetExtensionThree';

describe('CameraOffsetExtensionThree', () => {
  it('takes its offset as a Vector3, a tuple or one number, and keeps the default without one', () => {
    expect(new CameraOffsetExtensionThree({ offset: new Vector3(1, 2, 3) }).offset).toEqual([1, 2, 3]);
    expect(new CameraOffsetExtensionThree({ offset: [4, 5, 6] }).offset).toEqual([4, 5, 6]);
    expect(new CameraOffsetExtensionThree({ offset: 2 }).offset).toEqual([2, 2, 2]);
    expect(new CameraOffsetExtensionThree({ preserveComposition: true }).offset).toEqual([0, 0, 0]);
  });
});
