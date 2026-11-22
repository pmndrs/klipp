import { describe, expect, it } from 'vitest';

import * as inputAxis from '../../../src/core/input/axis';
import { InputAxis } from '../../../src/core/input/InputAxis';

/** A few updates, enough for an undamped axis to land exactly on its target. */
function settle(axis: InputAxis, frames = 3, dt = 0.016): void {
  for (let i = 0; i < frames; i++) axis.update(dt);
}

const recentering = (wait: number, time: number) => ({ enabled: true, wait, time });

describe('InputAxis', () => {
  it('adds deltas to its value, unbounded without a range', () => {
    const axis = new InputAxis({ value: 3 });
    axis.applyDelta(1e6);
    axis.applyDelta(-2);
    settle(axis);
    expect(axis.value).toBe(1e6 + 1);
  });

  it('clamps to its range, even while damping', () => {
    const axis = new InputAxis({ value: 0, center: 0, range: [-10, 10] });
    axis.damping = 1;
    axis.applyDelta(50);
    settle(axis, 2000);
    expect(axis.value).toBe(10);

    axis.applyDelta(-100);
    settle(axis, 2000);
    expect(axis.value).toBe(-10);
  });

  describe('damping', () => {
    it('eases toward the target, keeps going after input stops, and converges', () => {
      const axis = new InputAxis({ value: 0 });
      axis.damping = 0.3;
      axis.applyDelta(50);

      axis.update(0.016);
      const partway = axis.value;
      expect(partway).toBeGreaterThan(0);
      expect(partway).toBeLessThan(50);

      axis.update(0.016);
      expect(axis.value).toBeGreaterThan(partway);

      settle(axis, 500);
      expect(axis.value).toBe(50);
    });

    it('maxSpeed caps the approach and still converges', () => {
      const run = (maxSpeed: number) => {
        const axis = new InputAxis({ value: 0 });
        axis.damping = 1;
        axis.maxSpeed = maxSpeed;
        axis.applyDelta(100);
        axis.update(0.1);
        return axis;
      };

      const capped = run(10);
      expect(capped.value).toBeGreaterThan(0);
      expect(capped.value).toBeLessThan(run(Infinity).value);
      settle(capped, 2000);
      expect(capped.value).toBe(100);
    });

    it('reset() makes the next update snap to the target', () => {
      const axis = new InputAxis({ value: 0 });
      axis.damping = 0.5;
      axis.applyDelta(100);
      axis.update(0.016);
      expect(axis.value).toBeLessThan(100);

      axis.reset();
      axis.update(0.016);

      expect(axis.value).toBe(100);
    });
  });

  describe('setValue', () => {
    it('jumps mid-ease and stays there, where assigning value would ease back', () => {
      const axis = new InputAxis({ value: 0 });
      axis.damping = 0.3;
      axis.applyDelta(50);
      settle(axis, 5);

      axis.setValue(-20);
      expect(axis.value).toBe(-20);
      settle(axis, 100);
      expect(axis.value).toBe(-20);
    });

    it('eases the next delta from rest, like a fresh axis', () => {
      const moved = new InputAxis({ value: 0 });
      moved.damping = 0.3;
      moved.applyDelta(50);
      settle(moved, 5);
      moved.setValue(10);

      const fresh = new InputAxis({ value: 10 });
      fresh.damping = 0.3;
      settle(fresh);

      moved.applyDelta(5);
      fresh.applyDelta(5);
      moved.update(0.016);
      fresh.update(0.016);
      expect(moved.value).toBe(fresh.value);
    });

    it('clamps to the range unless the axis wraps', () => {
      const clamped = new InputAxis({ range: [-10, 10] });
      clamped.setValue(50);
      expect(clamped.value).toBe(10);

      const wrapped = new InputAxis({ range: [-180, 180], wrap: true });
      wrapped.setValue(190);
      expect(wrapped.value).toBe(190);
    });

    it('does not count as input, so a running recentering carries on', () => {
      const axis = new InputAxis({ value: 10, center: 0, recentering: recentering(0, 0.5) });
      axis.update(0.1);
      axis.setValue(20);
      axis.update(0.1);
      expect(axis.value).toBeLessThan(20);
    });
  });

  describe('wrap', () => {
    it('lets a drag run past the seam, and normalize() folds it back to the same angle', () => {
      const axis = new InputAxis({ value: 170, center: 0, range: [-180, 180], wrap: true });
      axis.applyDelta(20);
      settle(axis);
      expect(axis.value).toBeCloseTo(190, 5);

      axis.normalize();
      expect(axis.value).toBeCloseTo(-170, 5);
    });

    it('normalize() leaves a non-wrapping or unranged axis alone', () => {
      const clamped = new InputAxis({ value: 5, center: 0, range: [-10, 10] });
      clamped.normalize();
      expect(clamped.value).toBe(5);

      const unranged = new InputAxis({ value: 400, center: 0, range: null, wrap: true });
      unranged.normalize();
      expect(unranged.value).toBe(400);
    });

    it('autoNormalize folds back once settled, but never mid-drag', () => {
      const settled = new InputAxis({ value: 170, center: 0, range: [-180, 180], wrap: true });
      settled.autoNormalize = true;
      settled.applyDelta(20);
      settle(settled);
      expect(settled.value).toBeCloseTo(-170, 5);

      for (const autoNormalize of [false, true]) {
        const dragging = new InputAxis({ value: 0, center: 0, range: [-180, 180], wrap: true });
        dragging.autoNormalize = autoNormalize;
        dragging.damping = 0.5;
        dragging.applyDelta(-270);
        dragging.update(0.016);
        const first = dragging.value;
        for (let i = 0; i < 10; i++) dragging.update(0.016);
        expect(dragging.value).toBeLessThan(first); // still heading for -270, not the +90 shortcut
      }
    });
  });

  describe('recentering', () => {
    it('recenters toward a center given to update, leaving its own as it is', () => {
      const axis = new InputAxis({ value: 10, center: 0, recentering: recentering(0, 0) });
      for (let i = 0; i < 3; i++) inputAxis.update(axis, 0.1, 30);
      expect(axis.value).toBe(30);
      expect(axis.center).toBe(0);
    });

    it('is off by default', () => {
      const axis = new InputAxis({ value: 5 });
      axis.applyDelta(3);
      for (let i = 0; i < 100; i++) axis.update(0.1);
      expect(axis.value).toBe(8);
    });

    it('eases back to center after `wait` seconds without input, gradually from the first frame', () => {
      const axis = new InputAxis({
        value: 10,
        center: 0,
        range: null,
        wrap: false,
        recentering: recentering(0.2, 0.5),
      });
      axis.update(0.1);
      expect(axis.value).toBe(10);

      axis.update(0.15);
      expect(axis.value).toBeGreaterThan(0);
      expect(axis.value).toBeLessThan(10);

      for (let i = 0; i < 50; i++) axis.update(0.05);
      expect(axis.value).toBeCloseTo(0, 1);
    });

    it('any real delta restarts the wait, but a zero delta does not', () => {
      const axis = new InputAxis({ value: 10, center: 0, range: null, wrap: false, recentering: recentering(1, 1) });
      axis.update(0.9);
      axis.applyDelta(0);
      axis.update(0.2);
      expect(axis.value).toBeLessThan(10);

      const moving = axis.value;
      axis.applyDelta(1);
      axis.update(0.05);
      expect(axis.value).toBeCloseTo(moving + 1, 5);
    });

    it('with no wait, still follows a delta from the same frame', () => {
      const axis = new InputAxis({ value: 0, center: 0, range: null, wrap: false, recentering: recentering(0, 1) });
      axis.applyDelta(5);
      axis.update(0.016);
      expect(axis.value).toBeGreaterThan(0);
    });

    it('takes the short way back across the wrap seam', () => {
      // center -170 is 20 degrees away through the seam, 340 the other way
      const axis = new InputAxis({
        value: 170,
        center: -170,
        range: [-180, 180],
        wrap: true,
        recentering: recentering(0, 1),
      });
      axis.update(0.016);
      expect(axis.value).toBeGreaterThan(170);
    });

    it('waits while held, counting the wait only from release', () => {
      const axis = new InputAxis({
        value: 10,
        center: 0,
        range: null,
        wrap: false,
        recentering: recentering(0.2, 0.5),
      });
      axis.held = true;
      for (let i = 0; i < 50; i++) axis.update(0.1);
      expect(axis.value).toBe(10);

      axis.held = false;
      axis.update(0.1);
      expect(axis.value).toBe(10);

      for (let i = 0; i < 50; i++) axis.update(0.1);
      expect(axis.value).toBeCloseTo(0, 1);
    });

    it('update returns true through the wait and the recentering (real bug: an idle demand loop never started it)', () => {
      const axis = new InputAxis({ value: 10, center: 0, range: null, wrap: false, recentering: recentering(1, 0.5) });
      expect(axis.update(0.1)).toBe(true);
      expect(axis.value).toBe(10);

      let frames = 0;
      while (axis.update(0.1) && frames < 1000) frames++;
      expect(frames).toBeLessThan(1000);
      expect(axis.value).toBeCloseTo(0, 6);

      axis.held = true;
      axis.applyDelta(5);
      settle(axis);
      expect(axis.update(0.1)).toBe(false);
    });

    it('waits through an update marked as holding, keeping a move from easeTo', () => {
      const axis = new InputAxis({ value: 10, recentering: recentering(0, 0.2) });
      axis.holding = true;
      axis.update(0.1);
      expect(axis.value).toBe(10);
      axis.update(0.1);
      expect(axis.value).toBeLessThan(10);

      axis.easeTo(5, 0.2);
      axis.holding = true;
      axis.update(0.1);
      expect(axis.easing).toBe(true);
    });

    it('fills in the fields left out of the settings', () => {
      const axis = new InputAxis({ recentering: { time: 0.5 } });
      expect(axis.recentering).toEqual({ enabled: false, wait: 1, time: 0.5 });
    });
  });

  describe('easeTo', () => {
    it('jumps there without damping, and eases there with it, reporting motion until it arrives', () => {
      const axis = new InputAxis({ range: [-10, 10] });
      axis.easeTo(5);
      expect(axis.value).toBe(5);
      expect(axis.update(0.1)).toBe(false);

      axis.easeTo(-5, 0.3);
      expect(axis.update(0.1)).toBe(true);
      expect(axis.value).toBeLessThan(5);
      expect(axis.value).toBeGreaterThan(-5);
      settle(axis, 200);
      expect(axis.value).toBe(-5);
      expect(axis.update(0.1)).toBe(false);
    });

    it('goes the short way around a wrapped axis, and stays within the range of one that does not wrap', () => {
      const around = new InputAxis({ value: 170, range: [-180, 180], wrap: true });
      around.easeTo(-170, 0.2);
      around.update(0.016);
      expect(around.value).toBeGreaterThan(170);

      const limited = new InputAxis({ range: [0, 1] });
      limited.easeTo(5, 0.2);
      settle(limited, 200);
      expect(limited.value).toBe(1);
      expect(limited.update(0.1)).toBe(false);
    });

    it('stops where it is on input, and holds recentering until it ends', () => {
      const axis = new InputAxis({ range: [-10, 10], recentering: recentering(0.5, 0.2) });
      axis.easeTo(8, 0.5);
      axis.update(0.1);
      axis.applyDelta(0);
      axis.held = true;
      axis.update(0.1);
      const stopped = axis.value;
      axis.update(0.1);
      expect(axis.value).toBe(stopped);

      axis.held = false;
      axis.easeTo(8, 0.2);
      settle(axis, 100);
      expect(axis.value).toBe(8);
      axis.update(0.2);
      expect(axis.value).toBe(8);
      settle(axis, 100);
      expect(axis.value).toBe(0);
    });
  });

  describe('triggerRecentering', () => {
    it('recenters right away, also while recentering is off, and stops on input', () => {
      const axis = new InputAxis({ value: 10, center: 0, recentering: { enabled: false, wait: 5, time: 0.2 } });
      axis.triggerRecentering();
      expect(axis.update(0.016)).toBe(true);
      expect(axis.value).toBeLessThan(10);
      settle(axis, 200);
      expect(axis.value).toBe(0);
      expect(axis.update(0.1)).toBe(false);

      axis.setValue(10);
      axis.triggerRecentering();
      axis.update(0.016);
      axis.applyDelta(1);
      axis.update(0.016);
      const stopped = axis.value;
      settle(axis, 100);
      expect(axis.value).toBe(stopped);
    });

    it('recenters toward the center given to update', () => {
      const axis = new InputAxis({
        range: [-180, 180],
        wrap: true,
        recentering: { time: 0.1 },
      });
      axis.triggerRecentering();
      for (let i = 0; i < 300; i++) axis.update(0.016);
      expect(axis.value).toBe(0);
      axis.triggerRecentering();
      for (let i = 0; i < 300; i++) inputAxis.update(axis, 0.016, 90);
      expect(axis.value).toBe(90);
    });
  });

  describe('autoMove', () => {
    const autoMove = (speed: number, wait: number, time = 0) => ({ enabled: true, speed, wait, time });
    const values = (axis: InputAxis, frames: number) =>
      Array.from({ length: frames }, () => (axis.update(0.125), axis.value));

    it('is off by default', () => {
      const axis = new InputAxis();
      for (let i = 0; i < 100; i++) axis.update(0.125);
      expect(axis.value).toBe(0);
      expect(axis.update(0.125)).toBe(false);
    });

    it('fills in the fields left out of the settings', () => {
      const axis = new InputAxis({ autoMove: { enabled: true } });
      expect(axis.autoMove).toEqual({ enabled: true, speed: 12, wait: 1, time: 1 });
    });

    it('holds still for an update marked as holding, keeping a move from easeTo', () => {
      const axis = new InputAxis({ autoMove: autoMove(8, 0) });
      axis.holding = true;
      axis.update(0.125);
      expect(axis.value).toBe(0);
      axis.update(0.125);
      expect(axis.value).toBe(1);

      axis.easeTo(10, 0.2);
      axis.holding = true;
      axis.update(0.125);
      expect(axis.value).toBeGreaterThan(1);
      expect(axis.easing).toBe(true);
    });

    it('moves at `speed` once `wait` seconds pass without input, reporting motion through the wait', () => {
      const axis = new InputAxis({ autoMove: autoMove(8, 0.5) });
      expect(axis.update(0.375)).toBe(true);
      expect(axis.value).toBe(0);
      axis.update(0.125);
      expect(axis.value).toBe(1);
      expect(values(axis, 8).at(-1)).toBe(9);
    });

    it('stops on input and waits again from it, going the other way with a negative speed', () => {
      const axis = new InputAxis({ autoMove: autoMove(-8, 0.5) });
      expect(values(axis, 8).at(-1)).toBe(-5);
      axis.applyDelta(3);
      axis.update(0.125);
      expect(axis.value).toBe(-2);
      expect(values(axis, 3).at(-1)).toBe(-2);
      axis.update(0.125);
      expect(axis.value).toBe(-3);
    });

    it('holds still while held', () => {
      const axis = new InputAxis({ autoMove: autoMove(8, 0) });
      axis.held = true;
      expect(axis.update(0.125)).toBe(false);
      expect(values(axis, 8).at(-1)).toBe(0);
    });

    it('speeds up to `speed` over `time`, and from a stop again after input or setValue', () => {
      const axis = new InputAxis({ autoMove: autoMove(8, 0, 1) });
      expect(values(axis, 8)).toEqual([0.125, 0.375, 0.75, 1.25, 1.875, 2.625, 3.5, 4.5]);
      axis.update(0.125);
      expect(axis.value).toBe(5.5);

      axis.held = true;
      axis.update(0.125);
      axis.held = false;
      axis.update(0.125);
      expect(axis.value).toBe(5.625);

      values(axis, 8);
      axis.setValue(0);
      axis.update(0.125);
      expect(axis.value).toBe(0.125);
    });

    it('stays put at zero speed, also without a range', () => {
      const axis = new InputAxis({ autoMove: autoMove(0, 0, 1) });
      expect(values(axis, 4)).toEqual([0, 0, 0, 0]);
      expect(axis.update(0.125)).toBe(false);
    });

    it('slows to a stop at each end of a range that does not wrap, and turns back', () => {
      const axis = new InputAxis({ range: [-4, 4], autoMove: autoMove(8, 0, 0.5) });
      const path = Array.from({ length: 480 }, () => (axis.update(1 / 120), axis.value));
      const highest = Math.max(...path);
      const lowest = Math.min(...path);
      expect(highest).toBeLessThanOrEqual(4);
      expect(highest).toBeGreaterThan(3.99);
      expect(lowest).toBeGreaterThanOrEqual(-4);
      expect(lowest).toBeLessThan(-3.99);
      const top = path.indexOf(highest);
      expect((highest - path[top - 1]) * 120).toBeLessThan(1);
      expect((highest - path[top + 1]) * 120).toBeLessThan(1);
    });

    it('bounces between the ends of a range that does not wrap', () => {
      const axis = new InputAxis({ range: [-2, 2], autoMove: autoMove(8, 0) });
      expect(values(axis, 8)).toEqual([1, 2, 1, 0, -1, -2, -1, 0]);
    });

    it('keeps going across the seam of a wrapped axis', () => {
      const axis = new InputAxis({ range: [-180, 180], wrap: true, autoNormalize: true, autoMove: autoMove(720, 0) });
      expect(values(axis, 3)).toEqual([90, -180, -90]);
    });

    it('takes the place of recentering', () => {
      const axis = new InputAxis({ value: 5, recentering: recentering(0, 0.1), autoMove: autoMove(8, 0) });
      expect(values(axis, 8).at(-1)).toBe(13);
    });

    it('waits for a move from easeTo or triggerRecentering to end, then waits again', () => {
      const axis = new InputAxis({ autoMove: autoMove(8, 0.5), recentering: { time: 0.2 } });
      axis.easeTo(4, 0.2);
      for (let i = 0; i < 200 && axis.value !== 4; i++) axis.update(0.125);
      expect(values(axis, 3).at(-1)).toBe(4);
      axis.update(0.125);
      expect(axis.value).toBe(5);

      axis.triggerRecentering();
      for (let i = 0; i < 200 && axis.value !== 0; i++) axis.update(0.125);
      expect(values(axis, 3).at(-1)).toBe(0);
      axis.update(0.125);
      expect(axis.value).toBe(1);
    });

    it('eases in with the damping of the axis', () => {
      const axis = new InputAxis({ damping: 0.5, autoMove: autoMove(8, 0) });
      axis.update(0.125);
      expect(axis.value).toBeGreaterThan(0);
      expect(axis.value).toBeLessThan(1);
    });
  });

  it('eases across the edge of a wrapped, auto-normalized axis and stops there', () => {
    const axis = new InputAxis({ value: 170, range: [-180, 180], wrap: true, autoNormalize: true });
    axis.easeTo(-170, 0.3);
    for (let i = 0; i < 300; i++) axis.update(0.016);
    expect(axis.value).toBeCloseTo(-170, 6);
    expect(axis.update(0.016)).toBe(false);
  });
});
