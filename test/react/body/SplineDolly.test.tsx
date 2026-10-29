import { createRef } from 'react';
import { CatmullRomCurve3, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import * as spline from '../../../src/core/spline';

import type { SplineDollyBodyThree } from '../../../src/three/body/SplineDollyBodyThree';
import { SplineHelperThree } from '../../../src/three/body/SplineHelperThree';

import { Body } from '../../../src/react/body/Body';
import type { SplineDollyProps } from '../../../src/react/body/SplineDolly';

import { expectPropsReachInstance, expectStopsWhenUnmounted, mountInCamera } from '../wiring';

const points: [number, number, number][] = [
  [0, 0, 0],
  [10, 0, 0],
];

describe('Body.SplineDolly', () => {
  it('registers a body that puts the camera at its position on the path', async () => {
    const mounted = await mountInCamera(<Body.SplineDolly spline={points} position={0.5} />);
    await mounted.frame();
    expect(mounted.state.position[0]).toBeCloseTo(5, 6);
  });

  it('passes every body prop to the same body, on mount and when props change', async () => {
    await expectPropsReachInstance<object, SplineDollyBodyThree>(
      (props, ref) => <Body.SplineDolly ref={ref} spline={points} {...props} />,
      { target: new Object3D(), position: 0.2, positionUnits: 'normalized', damping: 0.5 },
      {
        target: new Object3D(),
        position: 3,
        positionUnits: 'distance',
        damping: { into: 0.2, from: 1 },
        automaticDolly: { method: 'fixedSpeed', speed: 1 },
      },
    );
  });

  it('takes the path as points or a CatmullRomCurve3, and builds it again only when it changes', async () => {
    const ref = createRef<SplineDollyBodyThree>();
    const scene = (props: SplineDollyProps) => <Body.SplineDolly ref={ref} {...props} />;
    const mounted = await mountInCamera(scene({ spline: points, splineOffset: new Vector3(0, 1, 0) }));
    const path = ref.current!.spline;
    expect(path?.length).toBeCloseTo(10, 6);
    expect(ref.current!.splineOffset).toEqual([0, 1, 0]);

    await mounted.update(scene({ spline: points, splineOffset: [0, 2, 0] }));
    expect(ref.current!.spline).toBe(path);
    expect(ref.current!.splineOffset).toEqual([0, 2, 0]);

    await mounted.update(scene({ spline: points, closed: true }));
    expect(ref.current!.spline?.closed).toBe(true);

    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0, 6, 0)]);
    await mounted.update(scene({ spline: curve }));
    expect(ref.current!.spline?.length).toBeCloseTo(6, 6);
  });

  it('takes a ready-made Spline as it is', async () => {
    const ref = createRef<SplineDollyBodyThree>();
    const path = spline.create(points);
    await mountInCamera(<Body.SplineDolly ref={ref} spline={path} />);
    expect(ref.current!.spline).toBe(path);
  });

  it('keeps up with its target with nearestPointToTarget', async () => {
    const target = new Object3D();
    target.position.set(7, 3, 2);
    const mounted = await mountInCamera(
      <Body.SplineDolly target={target} spline={points} automaticDolly={{ method: 'nearestPointToTarget' }} />,
    );
    await mounted.frame();
    expect(mounted.state.position[0]).toBeCloseTo(7, 2);
  });

  it('draws the path in the scene while debug is on', async () => {
    const scene = (debug: boolean) => <Body.SplineDolly spline={points} debug={debug} />;
    const helpers = () => {
      const found: SplineHelperThree[] = [];
      mounted.renderer.scene.instance.traverse((object) => {
        if (object instanceof SplineHelperThree) found.push(object);
      });
      return found;
    };
    const mounted = await mountInCamera(scene(true));
    await mounted.frame();
    expect(helpers()).toHaveLength(1);
    expect(helpers()[0].curve.geometry.getAttribute('position').count).toBeGreaterThan(1);

    await mounted.update(scene(false));
    expect(helpers()).toHaveLength(0);
  });

  it('stops moving the camera once unmounted', async () => {
    await expectStopsWhenUnmounted((target) => (
      <Body.SplineDolly
        target={target}
        spline={[
          [-50, 0, 0],
          [50, 0, 0],
        ]}
        automaticDolly={{ method: 'nearestPointToTarget' }}
      />
    ));
  });
});
