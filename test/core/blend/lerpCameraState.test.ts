import { quat, vec3, vec4, type Vec3 } from 'math';
import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import { BlendHints } from '../../../src/core/blend/BlendHints';
import type { CameraState } from '../../../src/core/cameraState';

import { angleBetween, forwardDot, lookAtQuaternion, yaw } from '../mathHelpers';

function makeState(overrides: Partial<CameraState> = {}): CameraState {
  return {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    fov: 50,
    orthographicSize: 1,
    near: 0.1,
    far: 1000,
    viewOffset: [0, 0],
    target: [0, 0, 0],
    hasTarget: false,
    lookAtTarget: [0, 0, 0],
    hasLookAtTarget: false,
    referenceUp: [0, 1, 0],
    rotationDampingBypass: [0, 0, 0, 1],
    ...overrides,
  };
}

describe('cameraState.lerp', () => {
  const a = makeState({ position: [0, 0, 0], fov: 40, orthographicSize: 2, near: 0.1, far: 100, viewOffset: [0, 0] });
  const b = makeState({
    position: [10, 0, 0],
    quaternion: yaw(90),
    fov: 60,
    orthographicSize: 6,
    near: 0.5,
    far: 500,
    viewOffset: [100, -40],
  });

  it('matches "a" and "b" exactly at the ends, clamping t outside [0, 1]', () => {
    for (const [t, end] of [
      [0, a],
      [-5, a],
      [1, b],
      [5, b],
    ] as const) {
      const out = cameraState.create();
      cameraState.lerp(out, a, b, t);
      expect(out.position).toEqual(end.position);
      expect(out.quaternion).toEqual(end.quaternion);
      expect([out.fov, out.orthographicSize, out.near, out.far]).toEqual([
        end.fov,
        end.orthographicSize,
        end.near,
        end.far,
      ]);
    }
  });

  it('interpolates position, lens and viewOffset', () => {
    const out = cameraState.create();
    cameraState.lerp(out, a, b, 0.5);
    expect(out.position[0]).toBeCloseTo(5, 10);
    expect(out.fov).toBeCloseTo(50, 10);
    expect(out.orthographicSize).toBeCloseTo(4, 10);
    expect(out.near).toBeCloseTo(0.3, 10);
    expect(out.far).toBeCloseTo(300, 10);
    expect(out.viewOffset[0]).toBeCloseTo(50, 10);
    expect(out.viewOffset[1]).toBeCloseTo(-20, 10);
  });

  it('interpolates referenceUp and re-normalizes it', () => {
    const tiltedA = makeState({ referenceUp: [0, 1, 0] });
    const tiltedB = makeState({ referenceUp: [1, 0, 0] });
    const out = cameraState.create();

    cameraState.lerp(out, tiltedA, tiltedB, 0.5);

    expect(vec3.length(out.referenceUp)).toBeCloseTo(1, 10);
    expect(out.referenceUp[0]).toBeGreaterThan(0);
    expect(out.referenceUp[1]).toBeGreaterThan(0);
  });

  it('does not mutate "a" or "b"', () => {
    const aBefore = { position: vec3.clone(a.position), quaternion: quat.clone(a.quaternion) };
    const bBefore = { position: vec3.clone(b.position), quaternion: quat.clone(b.quaternion) };

    cameraState.lerp(cameraState.create(), a, b, 0.3);

    expect(vec3.exactEquals(a.position, aBefore.position)).toBe(true);
    expect(vec4.exactEquals(a.quaternion, aBefore.quaternion)).toBe(true);
    expect(vec3.exactEquals(b.position, bBefore.position)).toBe(true);
    expect(vec4.exactEquals(b.quaternion, bBefore.quaternion)).toBe(true);
  });

  it('is safe when "out" aliases "a" or "b"', () => {
    const outIsA = makeState({ position: vec3.clone(a.position), fov: a.fov, near: a.near, far: a.far });
    cameraState.lerp(outIsA, outIsA, b, 0.5);
    expect(outIsA.position[0]).toBeCloseTo(5, 10);

    const outIsB = makeState({
      position: vec3.clone(b.position),
      quaternion: vec4.clone(b.quaternion),
      fov: b.fov,
      near: b.near,
      far: b.far,
    });
    cameraState.lerp(outIsB, a, outIsB, 0.5);
    expect(outIsB.position[0]).toBeCloseTo(5, 10);
  });

  describe('hemisphere continuity (a live, moving "b" must not reverse the interpolated path)', () => {
    it('"b" expressed with a flipped quaternion sign produces the SAME result as the correctly-signed one', () => {
      const previousOutput = yaw(90);

      // q and -q represent the IDENTICAL rotation - this is exactly what a live target's computed
      // quaternion can look like from one frame to the next after crossing the antipodal boundary.
      const flipped = vec4.negate(quat.create(), previousOutput);

      const outWithFlippedB = cameraState.create();
      vec4.copy(outWithFlippedB.quaternion, previousOutput);
      cameraState.lerp(outWithFlippedB, a, makeState({ quaternion: flipped }), 0.5);

      const outWithNormalB = cameraState.create();
      vec4.copy(outWithNormalB.quaternion, previousOutput);
      cameraState.lerp(outWithNormalB, a, makeState({ quaternion: quat.clone(previousOutput) }), 0.5);

      // without the fix, a plain slerp's dot(a, b) check would re-derive its OWN sign for
      // whichever "b" it was handed, based on the frozen `a` - not on continuity with `out` - so the two
      // calls above could disagree even though `flipped` and `previousOutput` are the same rotation.
      expect(quat.dot(outWithFlippedB.quaternion, outWithNormalB.quaternion)).toBeGreaterThan(0.9999);
    });

    it('a continuously-rotating "b" (e.g. Aim tracking an orbiting target) never takes a sudden jump, even sweeping past where "shortest from the frozen a" would flip sides', () => {
      const out = cameraState.create();
      const from = makeState(); // frozen "a", identity - stays fixed the whole time, like a real blend
      vec4.copy(out.quaternion, from.quaternion); // seed "previous output" the same way Klipp does at blend start

      const axis: Vec3 = [0, 1, 0];
      const live = makeState();

      // sweep well past 180° from the frozen `from` - the exact region where comparing against a fixed
      // reference (instead of continuity) would flip which side is "shortest"
      for (let angle = 0; angle <= Math.PI * 1.5; angle += 0.05) {
        quat.setAxisAngle(live.quaternion, axis, angle);
        const before = quat.clone(out.quaternion);

        cameraState.lerp(out, from, live, 0.5); // fixed t: isolates "b moves" as the only variable

        expect(angleBetween(before, out.quaternion)).toBeLessThan(0.2);
      }
    });
  });

  describe('BlendHints.sphericalPosition/cylindricalPosition', () => {
    const target: Vec3 = [0, 0, 0];
    const orbitingA = makeState({
      position: [5, 5, 5],
      quaternion: lookAtQuaternion([5, 5, 5], target),
      target: vec3.clone(target),
      hasTarget: true,
      lookAtTarget: vec3.clone(target),
      hasLookAtTarget: true,
    });
    const orbitingB = makeState({
      position: [0, 0, 5],
      quaternion: lookAtQuaternion([0, 0, 5], target),
      target: vec3.clone(target),
      hasTarget: true,
      lookAtTarget: vec3.clone(target),
      hasLookAtTarget: true,
    });

    it('keeps the camera at the interpolated RADIUS from the shared target, unlike a straight cartesian lerp', () => {
      const radiusA = vec3.distance(orbitingA.position, target);
      const radiusB = vec3.distance(orbitingB.position, target);

      const spherical = cameraState.create();
      cameraState.lerp(spherical, orbitingA, orbitingB, 0.5, BlendHints.sphericalPosition);
      expect(vec3.distance(spherical.position, target)).toBeCloseTo((radiusA + radiusB) / 2, 10);

      const linear = cameraState.create();
      cameraState.lerp(linear, orbitingA, orbitingB, 0.5);
      // real bug this fixes: without the hint, a linear lerp between two points on a sphere cuts inside
      // it, landing at a distance from the target that doesn't match either endpoint's radius
      expect(vec3.distance(linear.position, target)).not.toBeCloseTo((radiusA + radiusB) / 2, 1);
    });

    it("without a shared lookAtTarget, the rotation turns with the arc, keeping each side's rotation beyond looking at the target", () => {
      const facing = (position: Vec3) =>
        makeState({
          position,
          quaternion: lookAtQuaternion(position, target),
          target: vec3.clone(target),
          hasTarget: true,
        });
      const front = facing([0, 0, 5]);
      const back = facing([0, 1, -5]);
      for (const [from, to] of [
        [front, back],
        [back, front],
      ]) {
        const out = cameraState.create();
        cameraState.lerp(out, from, to, 0.5, BlendHints.sphericalPosition);
        expect(forwardDot(out.quaternion, out.position, target)).toBeCloseTo(1, 9);
        cameraState.lerp(out, from, to, 1, BlendHints.sphericalPosition);
        expect(angleBetween(out.quaternion, to.quaternion)).toBeCloseTo(0, 6);
      }

      const turned = makeState({ ...orbitingA, quaternion: yaw(90), hasLookAtTarget: false });
      const out = cameraState.create();
      cameraState.lerp(out, turned, front, 0, BlendHints.sphericalPosition);
      expect(angleBetween(out.quaternion, turned.quaternion)).toBeCloseTo(0, 6);
    });

    it('arcs around the target of the side that has one, ending on the side without', () => {
      const free = makeState({ position: [0, 0, 5] });
      const radiusA = vec3.distance(orbitingA.position, target);
      const out = cameraState.create();
      cameraState.lerp(out, orbitingA, free, 0.5, BlendHints.sphericalPosition);
      expect(vec3.distance(out.position, target)).toBeCloseTo((radiusA + 5) / 2, 9);
      cameraState.lerp(out, orbitingA, free, 1, BlendHints.sphericalPosition);
      for (let i = 0; i < 3; i++) expect(out.position[i]).toBeCloseTo(free.position[i], 9);
    });

    it('moves in a straight line when neither side has a target', () => {
      const hinted = cameraState.create();
      cameraState.lerp(hinted, a, b, 0.5, 0b111111);
      const linear = cameraState.create();
      cameraState.lerp(linear, a, b, 0.5);
      expect(hinted.position).toEqual(linear.position);
    });

    it('cylindricalPosition interpolates the vertical (Y) axis linearly while still arcing horizontally', () => {
      const higher = makeState({ position: [5, 10, 0], target: vec3.clone(target), hasTarget: true });
      const lower = makeState({ position: [0, 0, 5], target: vec3.clone(target), hasTarget: true });
      const out = cameraState.create();
      cameraState.lerp(out, higher, lower, 0.5, BlendHints.cylindricalPosition);
      expect(out.position[1]).toBeCloseTo(5, 10);
    });

    it('sphericalPosition wins when both flags are set', () => {
      const both = cameraState.create();
      cameraState.lerp(both, orbitingA, orbitingB, 0.5, BlendHints.sphericalPosition | BlendHints.cylindricalPosition);
      const sphericalOnly = cameraState.create();
      cameraState.lerp(sphericalOnly, orbitingA, orbitingB, 0.5, BlendHints.sphericalPosition);
      expect(vec3.exactEquals(both.position, sphericalOnly.position)).toBe(true);
    });

    describe("a side whose target is where its camera stands, like a HardLockToTarget mount, arcs around the other side's target", () => {
      const farAngleA = makeState({
        position: [-5, 3, -5],
        target: vec3.clone(target),
        hasTarget: true,
      });
      const mountB = makeState({
        position: [8, 2, -1],
        target: [8, 2, -1],
        hasTarget: true,
      });
      const steps = [0, 0.25, 0.5, 0.75, 1];

      it('sphericalPosition keeps the radius around that target between the two ends, either way, ending on the mount', () => {
        const radiusA = vec3.distance(farAngleA.position, target);
        const radiusB = vec3.distance(mountB.position, target);
        for (const t of steps) {
          const forward = cameraState.create();
          cameraState.lerp(forward, farAngleA, mountB, t, BlendHints.sphericalPosition);
          expect(vec3.distance(forward.position, target)).toBeCloseTo(radiusA + (radiusB - radiusA) * t, 9);
          const back = cameraState.create();
          cameraState.lerp(back, mountB, farAngleA, t, BlendHints.sphericalPosition);
          expect(vec3.distance(back.position, target)).toBeCloseTo(radiusB + (radiusA - radiusB) * t, 9);
        }
        const end = cameraState.create();
        cameraState.lerp(end, farAngleA, mountB, 1, BlendHints.sphericalPosition);
        for (let i = 0; i < 3; i++) expect(end.position[i]).toBeCloseTo(mountB.position[i], 9);
      });

      it('cylindricalPosition keeps the horizontal radius around it, moving the height straight', () => {
        const flat = (position: Vec3) => Math.hypot(position[0] - target[0], position[2] - target[2]);
        const radiusA = flat(farAngleA.position);
        const radiusB = flat(mountB.position);
        for (const t of steps) {
          const out = cameraState.create();
          cameraState.lerp(out, farAngleA, mountB, t, BlendHints.cylindricalPosition);
          expect(flat(out.position)).toBeCloseTo(radiusA + (radiusB - radiusA) * t, 9);
          expect(out.position[1]).toBeCloseTo(3 + (2 - 3) * t, 9);
        }
      });

      it('sphericalPosition keeps the bearing of the other side for a mount right above the target, either way', () => {
        const above = makeState({ position: [0, 4, 0], target: [0, 4, 0], hasTarget: true });
        const bearingA = Math.atan2(farAngleA.position[0], farAngleA.position[2]);
        for (const t of [0.25, 0.5, 0.75]) {
          for (const [from, to, progress] of [
            [farAngleA, above, t],
            [above, farAngleA, 1 - t],
          ] as const) {
            const out = cameraState.create();
            cameraState.lerp(out, from, to, progress, BlendHints.sphericalPosition);
            expect(Math.atan2(out.position[0], out.position[2])).toBeCloseTo(bearingA, 9);
          }
        }
      });

      describe('without a look-at target on both sides, the rotation turns with the arc', () => {
        const front = makeState({
          position: [0, 0, 10],
          quaternion: lookAtQuaternion([0, 0, 10], target),
          target: vec3.clone(target),
          hasTarget: true,
        });
        const mountAt = (position: Vec3) =>
          makeState({
            position,
            quaternion: lookAtQuaternion(position, [position[0], position[1], 10]),
            target: [...position] as Vec3,
            hasTarget: true,
          });

        it('keeps looking near the target halfway round, whichever way the blend goes', () => {
          const behind = mountAt([0, 0.5, -1.2]);
          for (const [from, to] of [
            [front, behind],
            [behind, front],
          ]) {
            const out = cameraState.create();
            cameraState.lerp(out, from, to, 0.5, BlendHints.sphericalPosition);
            expect(forwardDot(out.quaternion, out.position, target)).toBeGreaterThan(0.9);
          }
        });

        it('ends on each rotation and turns smoothly, also with the mount right above the target', () => {
          const above = mountAt([0, 0.5, 0]);
          const out = cameraState.create();
          const previous = quat.create();
          for (let i = 0; i <= 100; i++) {
            quat.copy(previous, out.quaternion);
            cameraState.lerp(out, front, above, i / 100, BlendHints.sphericalPosition);
            if (i > 0) expect(angleBetween(out.quaternion, previous)).toBeLessThan(0.1);
          }
          expect(angleBetween(out.quaternion, above.quaternion)).toBeCloseTo(0, 6);
          cameraState.lerp(out, front, above, 0, BlendHints.sphericalPosition);
          expect(angleBetween(out.quaternion, front.quaternion)).toBeCloseTo(0, 6);
        });

        it('rotates directly between the two with ignoreTarget', () => {
          const behind = mountAt([0, 0.5, -1.2]);
          const ignoring = cameraState.create();
          cameraState.lerp(ignoring, front, behind, 0.5, BlendHints.sphericalPosition | BlendHints.ignoreTarget);
          const direct = cameraState.create();
          cameraState.lerp(direct, front, behind, 0.5);
          expect(angleBetween(ignoring.quaternion, direct.quaternion)).toBeCloseTo(0, 6);
        });
      });

      it('blends straight when both targets are where their cameras stand', () => {
        const mountA = makeState({ position: [-5, 3, -5], target: [-5, 3, -5], hasTarget: true });
        for (const t of steps) {
          const hinted = cameraState.create();
          cameraState.lerp(hinted, mountA, mountB, t, BlendHints.sphericalPosition);
          const linear = cameraState.create();
          cameraState.lerp(linear, mountA, mountB, t);
          for (let i = 0; i < 3; i++) expect(hinted.position[i]).toBeCloseTo(linear.position[i], 12);
        }
      });
    });

    it('interpolates the target between two sides that have one, and takes it from the only side that has one', () => {
      const out = cameraState.create();
      cameraState.lerp(out, orbitingA, makeState({ position: [0, 0, 5], target: [10, 0, 0], hasTarget: true }), 0.5);
      expect(out.hasTarget).toBe(true);
      expect(out.target).toEqual([5, 0, 0]);

      const elsewhere = makeState({ position: [0, 0, 5], target: [10, 0, 0], hasTarget: true });
      cameraState.lerp(out, elsewhere, makeState(), 0.5);
      expect(out.hasTarget).toBe(true);
      expect(out.target).toEqual([10, 0, 0]);
      cameraState.lerp(out, makeState(), elsewhere, 0.5);
      expect(out.target).toEqual([10, 0, 0]);

      cameraState.lerp(out, makeState(), makeState(), 0.5);
      expect(out.hasTarget).toBe(false);
    });

    it('takes the look-at target from the only side that has one', () => {
      const out = cameraState.create();
      const looking = makeState({ lookAtTarget: [0, 3, 0], hasLookAtTarget: true });
      cameraState.lerp(out, makeState(), looking, 0.5);
      expect(out.hasLookAtTarget).toBe(true);
      expect(out.lookAtTarget).toEqual([0, 3, 0]);

      cameraState.lerp(out, makeState(), makeState(), 0.5);
      expect(out.hasLookAtTarget).toBe(false);
    });

    describe('with continuity, while "b" turns round the target past half a turn', () => {
      const around = (degrees: number) => {
        const radians = (degrees * Math.PI) / 180;
        return makeState({
          position: [Math.sin(radians) * 5, 2, Math.cos(radians) * 5],
          target: [0, 0, 0],
          hasTarget: true,
        });
      };
      const bearing = (state: CameraState) => Math.atan2(state.position[0], state.position[2]);

      for (const [name, hints] of [
        ['sphericalPosition', BlendHints.sphericalPosition],
        ['cylindricalPosition', BlendHints.cylindricalPosition],
      ] as const) {
        it(`${name} keeps going the same way round instead of jumping to the other side`, () => {
          const from = around(0);
          const continuity = { delta: NaN };
          const out = cameraState.create();
          let previous = 0;
          for (let degrees = 10; degrees <= 270; degrees += 10) {
            cameraState.lerp(out, from, around(degrees), 0.5, hints, continuity);
            const step = Math.abs(Math.atan2(Math.sin(bearing(out) - previous), Math.cos(bearing(out) - previous)));
            // `b` moves 10° a step, so halfway between it and `a` moves 5°.
            expect(step).toBeCloseTo(Math.PI / 36, 6);
            previous = bearing(out);
          }
        });
      }

      it('starts the way round over when a radius is too small to give an angle', () => {
        const continuity = { delta: 3 };
        cameraState.lerp(
          cameraState.create(),
          around(0),
          makeState({ hasTarget: true }),
          0.5,
          BlendHints.sphericalPosition,
          continuity,
        );
        expect(continuity.delta).toBeNaN();
      });
    });
  });

  describe('with another up', () => {
    const toZUp = quat.rotationTo(quat.create(), [0, 1, 0], [0, 0, 1]);
    const turn = (state: CameraState): CameraState => {
      const turned = cameraState.copy(cameraState.create(), state);
      for (const key of ['position', 'target', 'lookAtTarget', 'referenceUp'] as const) {
        vec3.transformQuat(turned[key], state[key], toZUp);
      }
      quat.multiply(turned.quaternion, toZUp, state.quaternion);
      return turned;
    };
    const target: Vec3 = [1, 2, 0];
    const orbit = makeState({
      position: [5, 5, 5],
      quaternion: lookAtQuaternion([5, 5, 5], target),
      target: vec3.clone(target),
      hasTarget: true,
      lookAtTarget: vec3.clone(target),
      hasLookAtTarget: true,
    });
    const mount = makeState({
      position: [-3, 1, -4],
      quaternion: yaw(120),
      target: [-3, 1, -4],
      hasTarget: true,
    });
    const free = makeState({ position: [0, 6, 2], quaternion: yaw(-40) });

    it('arcs around up, giving the y-up blend turned onto it', () => {
      for (const hints of [BlendHints.sphericalPosition, BlendHints.cylindricalPosition]) {
        for (const [a, b] of [
          [orbit, mount],
          [mount, orbit],
          [free, orbit],
        ]) {
          for (const t of [0.25, 0.5, 0.75]) {
            const yUp = cameraState.lerp(cameraState.create(), a, b, t, hints);
            const zUp = cameraState.lerp(cameraState.create(), turn(a), turn(b), t, hints, undefined, [0, 0, 1]);
            const expected = turn(yUp);
            for (let i = 0; i < 3; i++) expect(zUp.position[i]).toBeCloseTo(expected.position[i], 9);
            expect(angleBetween(zUp.quaternion, expected.quaternion)).toBeLessThan(1e-6);
          }
        }
      }
    });
  });

  describe('lookAtTarget-driven rotation (independent of position hints - a continuous look-at)', () => {
    /** A state with a REAL, consistent lookAt quaternion for `position`/`lookAtTarget` - matching what an
     *  actual Aim (e.g. `HardLookAt`) would produce, unlike a quaternion left at some unrelated default. */
    function stateWithLookAt(position: Vec3, lookAtTarget: Vec3): CameraState {
      return makeState({
        position: position,
        quaternion: lookAtQuaternion(position, lookAtTarget),
        lookAtTarget: lookAtTarget,
        hasLookAtTarget: true,
      });
    }

    it('drives rotation via lookAt with NO hints at all (BlendHints.none) - a shared lookAtTarget alone is enough', () => {
      const a = stateWithLookAt([5, 5, 5], [0, 0, 0]);
      const b = stateWithLookAt([0, 0, 5], [0, 0, 0]);
      const out = cameraState.create();

      cameraState.lerp(out, a, b, 0.5); // no hints argument at all

      expect(forwardDot(out.quaternion, out.position, out.lookAtTarget)).toBeCloseTo(1, 10);
    });

    it("keeps looking exactly at the smoothly-interpolating target even when a's and b's lookAtTargets are far apart and unrelated (real use case: two cameras looking at entirely different subjects, position blending as a plain straight line)", () => {
      const a = stateWithLookAt([5, 5, 5], [0, 0, 0]);
      const b = stateWithLookAt([-8, 2, 10], [50, 20, -30]);

      for (let t = 0; t <= 1; t += 0.1) {
        const out = cameraState.create();
        cameraState.lerp(out, a, b, t); // no position hint - plain cartesian position lerp

        const expectedTarget = vec3.lerp(vec3.create(), a.lookAtTarget, b.lookAtTarget, t);
        expect(vec3.distance(out.lookAtTarget, expectedTarget)).toBeLessThan(1e-9);

        expect(forwardDot(out.quaternion, out.position, out.lookAtTarget)).toBeGreaterThan(1 - 1e-9);
      }
    });

    it("matches a's/b's quaternion EXACTLY at t=0/t=1 even when they have extra rotation beyond a pure lookAt (real bug: a raw lookAt ignored that extra rotation entirely, popping visibly the instant a blend committed and handed off to the Aim's own state)", () => {
      const a = stateWithLookAt([-5, 0, 0], [0, 0, 0]);
      const b = stateWithLookAt([5, 0, 0], [0, 0, 0]);
      // simulate an Aim like RotationComposer layering an extra offset (screen position, damping lag, ...)
      quat.multiply(b.quaternion, b.quaternion, yaw(20));

      const outAt0 = cameraState.create();
      cameraState.lerp(outAt0, a, b, 0);
      expect(angleBetween(outAt0.quaternion, a.quaternion)).toBeLessThan(1e-9);

      const outAt1 = cameraState.create();
      cameraState.lerp(outAt1, a, b, 1);
      expect(angleBetween(outAt1.quaternion, b.quaternion)).toBeLessThan(1e-9);
    });

    it('sphericalPosition still shapes position on top of the always-on lookAt rotation - the two are independent', () => {
      const a = stateWithLookAt([5, 5, 5], [0, 0, 0]);
      const b = stateWithLookAt([0, 0, 5], [0, 0, 0]);
      vec3.set(a.target, 0, 0, 0);
      a.hasTarget = true;
      vec3.set(b.target, 0, 0, 0);
      b.hasTarget = true;

      const linear = cameraState.create();
      cameraState.lerp(linear, a, b, 0.5);
      const spherical = cameraState.create();
      cameraState.lerp(spherical, a, b, 0.5, BlendHints.sphericalPosition);

      expect(vec3.exactEquals(linear.position, spherical.position)).toBe(false); // position differs...
      // ...but rotation is identically correct in both, since it never depended on the position hint
      expect(forwardDot(linear.quaternion, linear.position, linear.lookAtTarget)).toBeCloseTo(1, 10);
      expect(forwardDot(spherical.quaternion, spherical.position, spherical.lookAtTarget)).toBeCloseTo(1, 10);
    });

    describe('BlendHints.ignoreTarget', () => {
      it('opts out of lookAt-driven rotation even with a shared lookAtTarget, falling back to a plain slerp', () => {
        const a = stateWithLookAt([5, 5, 5], [0, 0, 0]);
        const b = stateWithLookAt([0, 0, 5], [0, 0, 0]);

        const tracked = cameraState.create();
        cameraState.lerp(tracked, a, b, 0.5);
        const ignored = cameraState.create();
        cameraState.lerp(ignored, a, b, 0.5, BlendHints.ignoreTarget);

        expect(angleBetween(ignored.quaternion, tracked.quaternion)).toBeGreaterThan(0.01);
        // matches the plain-slerp fallback exactly - the same path taken when there's no lookAtTarget at all
        const plainSlerpEquivalent = cameraState.create();
        cameraState.lerp(
          plainSlerpEquivalent,
          makeState({ quaternion: a.quaternion }),
          makeState({ quaternion: b.quaternion }),
          0.5,
        );
        expect(angleBetween(ignored.quaternion, plainSlerpEquivalent.quaternion)).toBeLessThan(1e-6);
      });

      it('still publishes lookAtTarget/hasLookAtTarget for downstream consumers - only the ROTATION path is affected', () => {
        const a = stateWithLookAt([5, 5, 5], [0, 0, 0]);
        const b = stateWithLookAt([0, 0, 5], [2, 0, 0]);
        const out = cameraState.create();

        cameraState.lerp(out, a, b, 0.5, BlendHints.ignoreTarget);

        expect(out.hasLookAtTarget).toBe(true);
        expect(vec3.distance(out.lookAtTarget, [1, 0, 0])).toBeLessThan(1e-9);
      });

      it('is independent of sphericalPosition - position still arcs while rotation still ignores the target', () => {
        const a = stateWithLookAt([5, 5, 5], [0, 0, 0]);
        const b = stateWithLookAt([0, 0, 5], [0, 0, 0]);
        vec3.set(a.target, 0, 0, 0);
        a.hasTarget = true;
        vec3.set(b.target, 0, 0, 0);
        b.hasTarget = true;

        const linearWithoutHints = cameraState.create();
        cameraState.lerp(linearWithoutHints, a, b, 0.5);
        const combined = cameraState.create();
        cameraState.lerp(combined, a, b, 0.5, BlendHints.sphericalPosition | BlendHints.ignoreTarget);

        // position still arcs (sphericalPosition applied)...
        expect(vec3.exactEquals(combined.position, linearWithoutHints.position)).toBe(false);
        // ...but rotation ignores the target (a plain slerp, not pointed at combined.lookAtTarget)
        expect(forwardDot(combined.quaternion, combined.position, combined.lookAtTarget)).toBeLessThan(1 - 1e-6);
      });
    });
  });
});
