import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import { forwardDot } from '../../core/mathHelpers';

import type { SplineDollyLookAtTargetsAimThree } from '../../../src/three/aim/SplineDollyLookAtTargetsAimThree';

import { Aim } from '../../../src/react/aim/Aim';
import { Body } from '../../../src/react/body/Body';

import { expectPropsReachInstance, expectStopsWhenUnmounted, mountInCamera } from '../wiring';

const points: [number, number, number][] = [
  [0, 0, 0],
  [10, 0, 0],
];

describe('Aim.SplineDollyLookAtTargets', () => {
  it('looks along the path of the Body.SplineDolly on the same camera', async () => {
    const mounted = await mountInCamera(
      <>
        <Aim.SplineDollyLookAtTargets />
        <Body.SplineDolly spline={points} position={0.5} />
      </>,
    );
    await mounted.frame();
    expect(forwardDot(mounted.state.quaternion, mounted.state.position, [10, 0, 0])).toBeCloseTo(1, 6);
  });

  it('looks at a target placed along the path', async () => {
    const target = new Object3D();
    target.position.set(5, 0, 5);
    const mounted = await mountInCamera(
      <>
        <Body.SplineDolly spline={points} position={0.5} />
        <Aim.SplineDollyLookAtTargets targets={[{ position: 0.5, lookAt: target }]} />
      </>,
    );
    await mounted.frame();
    expect(forwardDot(mounted.state.quaternion, mounted.state.position, [5, 0, 5])).toBeCloseTo(1, 6);
  });

  it('passes its props to the same aim, on mount and when they change', async () => {
    await expectPropsReachInstance<object, SplineDollyLookAtTargetsAimThree>(
      (props, ref) => <Aim.SplineDollyLookAtTargets ref={ref} {...props} />,
      { targets: [{ position: 0, lookAt: new Object3D() }], easing: 0.5 },
      { targets: [{ position: 1, lookAt: [1, 2, 3] }], easing: 1 },
    );
  });

  it('stops turning the camera once unmounted', async () => {
    await expectStopsWhenUnmounted((target) => (
      <>
        <Body.SplineDolly spline={points} position={0.5} />
        <Aim.SplineDollyLookAtTargets targets={[{ position: 0, lookAt: target }]} />
      </>
    ));
  });
});
