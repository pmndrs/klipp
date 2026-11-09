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

  it('pans by the view on screen, with the lens and rotation Extensions leave', () => {
    const { klipp, controls } = setup();
    controls.addExtension({
      update: (out) => {
        out.fov = 90;
        quat.multiply(out.quaternion, out.quaternion, yaw(90));
      },
    });
    klipp.update(1 / 60);
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    expectVec3(controls.pan, [0, 0, 20]);
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

  it('pans the center of the orbit up to the edge of panBounds, and back from it right away', () => {
    const { klipp, controls } = setup({ panBounds: [-1, -10, -10, 1, 10, 10] });
    controls.panX.applyDelta(400);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [-1, 0, 10]);
    expectVec3(controls.pan, [-1, 0, 0]);

    controls.panX.applyDelta(-40);
    klipp.update(1 / 60);
    expect(controls.state.position[0]).toBeCloseTo(-1 + viewHeight(10) / 10, 9);
  });

  it('slows panning toward the edge within panSlowingDistance, and not panning back', () => {
    const { klipp, controls } = setup({ panBounds: [-1, -10, -10, 1, 10, 10], panSlowingDistance: 0.5 });
    const pixels = (world: number) => world / (viewHeight(10) / 400);
    controls.panX.applyDelta(pixels(0.75));
    klipp.update(1 / 60);
    const slowed = -1 + 0.5 * Math.exp(-0.5);
    expect(controls.state.target[0]).toBeCloseTo(slowed, 9);

    controls.panX.applyDelta(pixels(-0.25));
    klipp.update(1 / 60);
    expect(controls.state.target[0]).toBeCloseTo(slowed + 0.25, 9);
  });

  it('reaches the edge with a long enough drag, and never moves the center without one', () => {
    const { klipp, controls } = setup({
      target: pointAt(0, 1.5, 0),
      panBounds: [-4, 0.5, -4, 4, 4, 4],
      panSlowingDistance: 3,
    });
    for (let i = 0; i < 60; i++) {
      controls.panX.applyDelta(-20);
      klipp.update(1 / 60);
    }
    expect(controls.state.target[0]).toBeGreaterThan(3.99);
    expect(controls.state.target[1]).toBe(1.5);
  });

  it('keeps the center of the orbit inside panBounds when the target leaves them, and inside a sphere', () => {
    const target = pointAt(5, 0, 0);
    const box = setup({ target, panBounds: [-1, -1, -1, 1, 1, 1] });
    box.klipp.update(1 / 60);
    expectVec3(box.controls.state.target, [1, 0, 0]);

    const sphere = setup({ target, panBounds: { center: [0, 0, 0], radius: 2 } });
    sphere.klipp.update(1 / 60);
    expectVec3(sphere.controls.state.target, [2, 0, 0]);
  });

  it('measures panBounds on the center of the orbit, with orbit.targetOffset', () => {
    const { klipp, controls } = setup({ panBounds: [-10, -10, -10, 10, 1, 10], orbit: { targetOffset: [0, 2, 0] } });
    klipp.update(1 / 60);
    expectVec3(controls.state.target, [0, 1, 0]);
    expectVec3(controls.state.position, [0, 1, 10]);
  });

  it('resets to the center of each axis and onto the target, right away', () => {
    const { klipp, controls } = setup();
    controls.horizontal.setValue(60);
    controls.zoom.setValue(0.5);
    controls.panX.applyDelta(100);
    klipp.update(1 / 60);
    controls.reset();
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [0, 0, 10]);
    expectVec3(controls.pan, [0, 0, 0]);
  });

  it('eases a move with its damping, reports it is still moving, and ends right on the values', () => {
    const { klipp, controls } = setup();
    controls.reset();
    controls.setLookAt([10, 0, 0], [0, 0, 0], { damping: 0.3 });
    klipp.update(1 / 60);
    expect(controls.horizontal.value).toBeLessThan(0);
    expect(controls.horizontal.value).toBeGreaterThan(-90);
    expect(controls.update(controls.state, 1 / 60, false)).toBe(true);
    for (let i = 0; i < 600; i++) klipp.update(1 / 60);
    expect(controls.horizontal.value).toBe(-90);
    expectVec3(controls.state.position, [10, 0, 0]);
  });

  it('moves the center of the orbit to a point, keeping the direction and the distance', () => {
    const { klipp, controls } = setup({ target: pointAt(1, 0, 0) });
    controls.vertical.setValue(30);
    klipp.update(1 / 60);
    const offset = vec3.subtract(vec3.create(), controls.state.position, controls.state.target);
    controls.moveTo([4, 2, -1]);
    klipp.update(1 / 60);
    expectVec3(controls.state.target, [4, 2, -1]);
    expectVec3(vec3.subtract(vec3.create(), controls.state.position, controls.state.target), offset);
  });

  it('puts the camera where setLookAt says, looking at the center it is given or the current one', () => {
    const { klipp, controls } = setup();
    controls.setLookAt([5, 5, 5], [1, 0, 0]);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [5, 5, 5]);
    expectVec3(controls.state.target, [1, 0, 0]);
    expect(forwardDot(controls.state.quaternion, controls.state.position, [1, 0, 0])).toBeCloseTo(1, 9);

    controls.setLookAt([1, 0, -3]);
    klipp.update(1 / 60);
    expectVec3(controls.state.position, [1, 0, -3]);
    expectVec3(controls.state.target, [1, 0, 0]);
  });

  it('stops a move where it is once input comes in', () => {
    const { klipp, controls } = setup();
    controls.moveTo([10, 0, 0], { damping: 0.5 });
    klipp.update(1 / 60);
    const reached = controls.pan[0];
    controls.horizontal.applyDelta(1);
    klipp.update(1 / 60);
    klipp.update(1 / 60);
    expect(controls.pan[0]).toBe(reached);
    expect(controls.pan[0]).toBeLessThan(10);
  });

  it('turns the short way around to a new horizontal angle', () => {
    const { klipp, controls } = setup({ horizontal: { center: 170 } });
    klipp.update(1 / 60);
    controls.setLookAt(vec3.transformQuat(vec3.create(), [0, 0, 10], yaw(170)), [0, 0, 0], { damping: 0.3 });
    klipp.update(1 / 60);
    expect(controls.horizontal.value).toBeGreaterThan(170);
    for (let i = 0; i < 600; i++) klipp.update(1 / 60);
    expect(controls.horizontal.value).toBeCloseTo(190, 9);
  });

  it('moves in the frame of lockToTarget, so the center lands on the point whatever the target faces', () => {
    const target = pointAt(0, 0, 0);
    target.hasRotation = true;
    quat.copy(target.rotation, yaw(90));
    const { klipp, controls } = setup({ target, orbit: { bindingMode: 'lockToTarget' } });
    klipp.update(1 / 60);
    controls.moveTo([3, 0, 0]);
    klipp.update(1 / 60);
    expectVec3(controls.state.target, [3, 0, 0]);
  });

  it('fits a sphere: the center on it, the distance where the narrower view just holds it', () => {
    const { klipp, controls } = setup();
    controls.fit({ center: [2, 0, 0], radius: 1 });
    klipp.update(1 / 60);
    expectVec3(controls.state.target, [2, 0, 0]);
    expect(vec3.distance(controls.state.position, controls.state.target)).toBeCloseTo(
      1 / Math.sin((25 * Math.PI) / 180),
      9,
    );
  });

  it('fits a box by its corners, with padding, and by the horizontal view when it is the narrower one', () => {
    const { klipp, controls } = setup();
    klipp.setSize(400, 800);
    controls.fit([-1, -1, -1, 1, 1, 1], { padding: 0.5 });
    klipp.update(1 / 60);
    const distance = 1.5 + 1.5 / (Math.tan((25 * Math.PI) / 180) * 0.5);
    expect(vec3.distance(controls.state.position, controls.state.target)).toBeCloseTo(distance, 9);
  });

  it('fits by the orthographic size, keeping the distance', () => {
    const { klipp, controls } = setup({ initialState: { orthographicSize: 4 } });
    klipp.orthographic = true;
    klipp.update(1 / 60);
    controls.fit({ center: [0, 0, 0], radius: 1 });
    klipp.update(1 / 60);
    expect(controls.state.orthographicSize).toBeCloseTo(1, 9);
    expectVec3(controls.state.position, [0, 0, 10]);

    controls.fit([-1, -0.5, -1, 1, 0.5, 1]);
    klipp.update(1 / 60);
    expect(controls.state.orthographicSize).toBeCloseTo(0.5, 9);
  });

  it('fits the first count points: the center on the middle of their box, the camera as close as it gets', () => {
    const { klipp, controls } = setup();
    controls.fitPoints([1, -1, 0, 3, 1, 0, 50, 50, 50], 2);
    klipp.update(1 / 60);
    expectVec3(controls.state.target, [2, 0, 0]);
    expect(controls.state.position[2]).toBeCloseTo(1 / Math.tan((25 * Math.PI) / 180), 9);

    controls.fitPoints([1, 2, 3], 0);
    controls.fitPoints([1, 2], 5);
    klipp.update(1 / 60);
    expectVec3(controls.state.target, [2, 0, 0]);
  });

  it('eases a fit with its damping, and leaves an empty box alone', () => {
    const { klipp, controls } = setup();
    controls.fit({ center: [5, 0, 0], radius: 1 }, { damping: 0.3 });
    klipp.update(1 / 60);
    expect(controls.state.target[0]).toBeGreaterThan(0);
    expect(controls.state.target[0]).toBeLessThan(5);

    const empty = setup();
    empty.controls.fit([1, 1, 1, -1, -1, -1]);
    empty.klipp.update(1 / 60);
    expectVec3(empty.controls.state.position, [0, 0, 10]);
  });

  it('holds a move against recentering, which waits again from it', () => {
    const recentering = { enabled: true, wait: 1, time: 0.2 };
    const { klipp, controls } = setup({ horizontal: { recentering } });
    for (let i = 0; i < 120; i++) klipp.update(1 / 60);
    controls.setLookAt([10, 0, 0], [0, 0, 0]);
    klipp.update(1 / 60);
    expect(controls.horizontal.value).toBe(-90);
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

  it('asks for a frame from every method, and not for a fit with nothing to frame', () => {
    const { klipp, controls } = setup();
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);

    controls.reset();
    controls.moveTo([1, 0, 0]);
    controls.setLookAt([0, 5, 10]);
    controls.fit({ center: [0, 0, 0], radius: 1 });
    controls.fitPoints([0, 0, 0], 1);
    expect(requested).toHaveBeenCalledTimes(5);

    controls.fit([1, 1, 1, -1, -1, -1]);
    controls.fitPoints([], 0);
    expect(requested).toHaveBeenCalledTimes(5);
  });

  it('does not ask for a frame outside a Klipp', () => {
    const klipp = new Klipp();
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);
    new KlippControls('alone').reset();
    expect(requested).not.toHaveBeenCalled();
  });

  it('does not ask for a frame from its own frames, which reset the pan axes every frame', () => {
    const { klipp } = setup();
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);
    for (let i = 0; i < 5; i++) klipp.update(1 / 60);
    expect(requested).not.toHaveBeenCalled();
  });
});
