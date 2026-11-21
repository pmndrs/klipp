import { describe, expect, it } from 'vitest';

import type { SplineRollExtension } from '../../../src/core/extension/SplineRollExtension';

import { SplineRollHelperThree } from '../../../src/three/extension/SplineRollHelperThree';

import { Body } from '../../../src/react/body/Body';
import { Extension } from '../../../src/react/extension/Extension';
import type { SplineRollProps } from '../../../src/react/extension/SplineRoll';

import { expectPropsReachInstance, mountInCamera } from '../wiring';

const track: [number, number, number][] = [
  [0, 0, 0],
  [10, 0, 0],
];

describe('Extension.SplineRoll', () => {
  it("banks the camera's up with the path of its SplineDolly every frame", async () => {
    const mounted = await mountInCamera(
      <>
        <Body.SplineDolly spline={track} position={0.5} />
        <Extension.SplineRoll points={[{ position: 0, roll: 90 }]} />
      </>,
    );
    await mounted.frame();
    expect(mounted.state.referenceUp[2]).toBeCloseTo(1, 9);
  });

  it('passes every prop to the same extension, on mount and when props change', async () => {
    await expectPropsReachInstance<SplineRollProps, SplineRollExtension>(
      (props, ref) => <Extension.SplineRoll ref={ref} {...props} />,
      { points: [{ position: 0.2, roll: 10 }], easing: 0.5 },
      { points: [{ position: 0.7, roll: -20 }], easing: 1 },
    );
  });

  it('draws the banked up along the path with `debug`', async () => {
    const mounted = await mountInCamera(
      <>
        <Body.SplineDolly spline={track} />
        <Extension.SplineRoll points={[{ position: 0, roll: 30 }]} debug />
      </>,
    );
    await mounted.frame();
    const helper = mounted.renderer.scene.findAll((node) => node.instance instanceof SplineRollHelperThree);
    expect(helper).toHaveLength(1);
  });
});
