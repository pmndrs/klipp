import { quat } from 'math';
import { describe, expect, it, vi } from 'vitest';

import { PanTiltAim } from '../../../src/core/aim/PanTiltAim';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

describe('PanTiltAim', () => {
  it('asks for a frame from setFromRotation', () => {
    const aim = new PanTiltAim();
    const camera = new VirtualCamera('look');
    camera.setAim(aim);
    const klipp = new Klipp();
    klipp.add(camera);
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);

    aim.setFromRotation(quat.setAxisAngle(quat.create(), [0, 1, 0], 1));
    expect(requested).toHaveBeenCalledTimes(1);
  });
});
