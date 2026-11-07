import { quat, vec3, type Vec3 } from 'math';
import { describe, expect, it, vi } from 'vitest';

import * as targetPose from '../../../src/core/targetPose';
import { KlippControls, type KlippControlsOptions } from '../../../src/core/controls/KlippControls';
import { Klipp } from '../../../src/core/Klipp';
import type { TargetPose } from '../../../src/core/targetPose';

import { forwardDot, yaw } from '../mathHelpers';

const expectVec3 = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
};

function setup(options: KlippControlsOptions = {}) {
  const klipp = new Klipp();
  klipp.setSize(800, 400);
  const controls = new KlippControls('orbit', options);
  klipp.add(controls);
  return { klipp, controls };
}

/** World height of the 50° view at `distance`. */
const viewHeight = (distance: number) => 2 * distance * Math.tan((25 * Math.PI) / 180);

function pointAt(x: number, y: number, z: number): TargetPose {
  const pose = targetPose.create();
  vec3.set(pose.position, x, y, z);
  return pose;
}

describe('KlippControls', () => {
  it('orbits the world origin at `distance` without a target, looking at it', () => {
    const { klipp, controls } = setup({ distance: 6 });
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 6]);
    expect(forwardDot(controls.state.quaternion, controls.state.position, [0, 0, 0])).toBeCloseTo(1, 9);
  });

  it('orbits its target and turns with the axes, always looking at the target', () => {
    const target = pointAt(1, 2, 3);
    const { klipp, controls } = setup({ target, distance: 4 });
    controls.horizontal.setValue(90);
    controls.vertical.setValue(30);
    klipp.update(1 / 60);

    const { position, quaternion } = controls.state;
    expect(vec3.distance(position, target.position)).toBeCloseTo(4, 9);
    expect(position[1] - target.position[1]).toBeCloseTo(2, 9);
    expect(forwardDot(quaternion, position, target.position)).toBeCloseTo(1, 9);
  });

  it('follows the target when it moves and when it is replaced', () => {
    const { klipp, controls } = setup({ target: pointAt(0, 0, 0) });
    klipp.update(1 / 60);
    controls.target = pointAt(5, 0, 0);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [5, 0, 10]);
  });

  it('dollies with zoom in perspective, within the distance limits', () => {
    const { klipp, controls } = setup({ distance: 10, minDistance: 4, maxDistance: 20 });
    controls.zoom.applyDelta(Math.log(2));
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 5]);

    controls.zoom.applyDelta(10);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 4]);

    controls.zoom.applyDelta(-20);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 20]);
  });

  it('keeps the zoom range in step with distance limits changed later, and with zoom settings applied again', () => {
    const { klipp, controls } = setup({ distance: 10 });
    controls.minDistance = 5;
    controls.zoom.range = null;
    klipp.update(1 / 60);
    controls.zoom.applyDelta(10);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 5]);
  });

  it('scales the orthographic size with zoom and keeps the distance, without carrying it to the next frame', () => {
    const { klipp, controls } = setup({ distance: 10, initialState: { orthographicSize: 4 } });
    klipp.orthographic = true;
    controls.zoom.applyDelta(Math.log(2));
    klipp.update(1 / 60);
    expect(controls.state.orthographicSize).toBeCloseTo(2, 12);
    expectVec3(controls.state.position, [0, 0, 10]);

    klipp.update(1 / 60);
    expect(controls.state.orthographicSize).toBeCloseTo(2, 12);

    klipp.orthographic = false;
    klipp.update(1 / 60);
    expect(controls.state.orthographicSize).toBe(4);
    expectVec3(controls.state.position, [0, 0, 5]);
  });

  it('starts from initialState.position: its direction and its distance', () => {
    const { klipp, controls } = setup({
      target: pointAt(0, 1, 0),
      distance: 10,
      initialState: { position: [3, 1, 0] },
    });
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [3, 1, 0]);
    expect(controls.horizontal.value).toBeCloseTo(-90, 9);
    expect(controls.zoom.value).toBeCloseTo(Math.log(10 / 3), 12);
  });

  it('eases zoom with its damping and reports that it is still moving', () => {
    const { klipp, controls } = setup({ zoom: { damping: 0.2 } });
    controls.zoom.applyDelta(1);
    klipp.update(1 / 60);
    const first = controls.state.position[2];
    expect(first).toBeLessThan(10);
    expect(first).toBeGreaterThan(10 * Math.exp(-1));
    expect(controls.update(controls.state, 1 / 60, false)).toBe(true);
  });

  it('gives an input controller horizontal, vertical and zoom', () => {
    const { controls } = setup();
    expect(Object.keys(controls.inputAxes)).toEqual(['horizontal', 'vertical', 'zoom', 'panX', 'panY']);
    expect(controls.inputAxes.zoom).toBe(controls.zoom);
    expect(controls.inputAxes.panX).toBe(controls.panX);

    const config = controls.inputConfig();
    expect(config.mouseButtons?.left?.axes).toEqual({ x: controls.horizontal, y: controls.vertical });
    expect(config.wheel?.axis).toBe(controls.zoom);
    expect(config.mouseButtons?.right?.axes).toEqual({ x: controls.panX, y: controls.panY });
  });

  it('takes axis and orbit settings, keeping the defaults it is not given', () => {
    const controls = new KlippControls('orbit', {
      horizontal: { center: 30 },
      vertical: { range: [-10, 80] },
      orbit: { damping: 0.5, bindingMode: 'lockToTarget' },
    });
    expect(controls.horizontal).toMatchObject({ center: 30, value: 30, damping: 0, wrap: true });
    expect(controls.vertical).toMatchObject({ range: [-10, 80], damping: 0 });
    expect(controls.orbit).toMatchObject({ damping: 0.5, bindingMode: 'lockToTarget' });
  });

  it('keeps its own Body and Aim, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { klipp, controls } = setup();
    const body = controls.body;
    const aim = controls.aim;
    controls.setBody({ update: () => {} });
    controls.setAim({ update: () => {} });
    controls.body = null;
    controls.aim = null;
    expect(warn).toHaveBeenCalledTimes(4);
    expect(controls.body).toBe(body);
    expect(controls.aim).toBe(aim);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 10]);
    warn.mockRestore();
  });

  it('runs added Extensions after its own pieces', () => {
    const { klipp, controls } = setup();
    controls.addExtension({ update: (out) => void (out.position[1] += 1) });
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 1, 10]);
  });

  it('pans the orbit center so the scene follows the drag: one view height for a drag the viewport tall', () => {
    const { klipp, controls } = setup({ distance: 10 });
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    const shift = viewHeight(10);
    expectVec3(controls.state.position, [-shift, 0, 10]);
    expect(forwardDot(controls.state.quaternion, controls.state.position, [-shift, 0, 0])).toBeCloseTo(1, 9);

    controls.panY.applyDelta(200);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [-shift, shift / 2, 10]);
    expectVec3(controls.pan, [-shift, shift / 2, 0]);
  });

  it('pans along the view as it is now, scaled by the zoomed distance', () => {
    const { klipp, controls } = setup({ distance: 10 });
    controls.horizontal.setValue(90);
    controls.zoom.setValue(Math.log(2));
    klipp.update(1 / 60);
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    expectVec3(controls.pan, [0, 0, -viewHeight(5)]);
  });

  it('pans by the orthographic view size', () => {
    const { klipp, controls } = setup({ initialState: { orthographicSize: 4 } });
    klipp.orthographic = true;
    controls.zoom.setValue(Math.log(2));
    klipp.update(1 / 60);
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    expectVec3(controls.pan, [-4, 0, 0]);
  });

  it('keeps the pan as an offset from a moving target, turning with it in lockToTarget', () => {
    const target = pointAt(0, 0, 0);
    target.hasRotation = true;
    const { klipp, controls } = setup({ target, orbit: { bindingMode: 'lockToTarget' } });
    klipp.update(1 / 60);
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    const shift = viewHeight(10);

    vec3.set(target.position, 5, 0, 0);
    quat.copy(target.rotation, yaw(90));
    klipp.update(1 / 60);
    const offset = vec3.transformQuat(vec3.create(), [-shift, 0, 0], yaw(90));
    expectVec3(controls.state.target, vec3.add(offset, offset, target.position));
  });

  it('eases the pan with its damping, then starts the axes over from zero', () => {
    const { klipp, controls } = setup({ pan: { damping: 0.2 } });
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    expect(controls.pan[0]).toBeLessThan(0);
    expect(controls.pan[0]).toBeGreaterThan(-viewHeight(10));
    for (let i = 0; i < 600; i++) klipp.update(1 / 60);
    expect(controls.pan[0]).toBeCloseTo(-viewHeight(10), 6);
    expect([controls.panX.value, controls.panX.rawValue]).toEqual([0, 0]);
  });

  it('moves back onto the target once the pan is cleared', () => {
    const { klipp, controls } = setup();
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    vec3.set(controls.pan, 0, 0, 0);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 10]);
  });

  it('leaves the camera in place while a target it has cannot be read', () => {
    class Unresolved extends KlippControls<string> {
      protected override readTarget(): TargetPose | null {
        return null;
      }
    }
    const klipp = new Klipp();
    const controls = new Unresolved('orbit', { target: 'missing', initialState: { position: [1, 2, 3] } });
    klipp.add(controls);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [1, 2, 3]);
  });
});
