import { describe, expect, it } from 'vitest';

import { InputAxis } from '../../../src/core/input/InputAxis';
import { InputController } from '../../../src/core/input/InputController';
import { ModifierKeys } from '../../../src/core/input/ModifierKeys';

function setup() {
  const x = new InputAxis();
  const y = new InputAxis();
  const controller = new InputController({
    mouseButtons: { left: { axes: { x, y }, gain: 2 }, right: null, middle: null },
    touches: { one: null, two: null, three: null },
  });
  return { x, y, controller };
}

describe('InputController', () => {
  it('feeds input written by the caller into the mapped axes, without any device', () => {
    const { x, y, controller } = setup();
    controller.input.leftDx = 3;
    controller.input.leftDy = -1;
    controller.input.leftHeld = true;
    controller.update();
    x.update(0.016);
    y.update(0.016);

    expect(x.value).toBe(6);
    expect(y.value).toBe(-2);
    expect(x.held).toBe(true);
  });

  it('applies nothing while disabled, and releases held axes', () => {
    const { x, controller } = setup();
    controller.enabled = false;
    controller.input.leftDx = 3;
    controller.input.leftHeld = true;
    controller.update();
    x.update(0.016);

    expect(x.value).toBe(0);
    expect(x.held).toBe(false);
  });

  it('drives only the axes a source names', () => {
    const x = new InputAxis();
    const controller = new InputController({ mouseButtons: { left: { axes: { x } } } });
    controller.input.leftDx = 3;
    controller.input.leftDy = 5;
    controller.input.leftHeld = true;
    controller.update();
    x.update(0.016);

    expect(x.value).toBe(3);
    expect(x.held).toBe(true);
  });
});

describe('InputController - modifier keys', () => {
  function keyed() {
    const orbit = new InputAxis();
    const pan = new InputAxis();
    const zoom = new InputAxis();
    const controller = new InputController({
      mouseButtons: { left: { axes: { x: orbit } } },
      modifiers: { ctrl: { left: null }, shift: { left: { axes: { x: pan } } }, alt: { left: { axes: { x: zoom } } } },
    });
    const drag = (keys: number) => {
      controller.input.leftDx = 1;
      controller.input.leftHeld = true;
      controller.input.leftModifiers = keys;
      controller.update();
      for (const axis of [orbit, pan, zoom]) axis.update(0.016);
    };
    return { orbit, pan, zoom, drag };
  }

  it('drives what a key held as the button went down maps it to, and lets go of it after', () => {
    const { orbit, pan, drag } = keyed();
    drag(ModifierKeys.shift);
    expect([orbit.value, pan.value]).toEqual([0, 1]);
    expect([orbit.held, pan.held]).toEqual([false, true]);
    drag(0);
    expect([orbit.value, pan.value]).toEqual([1, 1]);
    expect([orbit.held, pan.held]).toEqual([true, false]);
  });

  it('takes the first of ctrl, meta, shift and alt that maps the button, where null drives nothing', () => {
    const { orbit, pan, zoom, drag } = keyed();
    drag(ModifierKeys.alt | ModifierKeys.shift);
    expect([pan.value, zoom.value]).toEqual([1, 0]);
    drag(ModifierKeys.shift | ModifierKeys.ctrl);
    expect([orbit.value, pan.value]).toEqual([0, 1]);
  });

  it('keeps the usual mapping of a button the key leaves out', () => {
    const { orbit, drag } = keyed();
    drag(ModifierKeys.meta);
    expect(orbit.value).toBe(1);
  });
});

describe('InputController - single-axis sources', () => {
  function single() {
    const axis = new InputAxis();
    const controller = new InputController({
      mouseButtons: { left: null, right: null, middle: null },
      touches: { one: null, two: null, three: null },
    });
    const step = () => {
      controller.update();
      axis.update(0.016);
    };
    return { axis, controller, step };
  }

  it('feeds wheel scrolling with up as positive, scaled and optionally inverted', () => {
    const { axis, controller, step } = single();
    controller.config.wheel = { axis, gain: 0.01 };
    controller.input.wheelDeltaY = -100;
    step();
    expect(axis.value).toBeCloseTo(1, 10);

    controller.config.wheel.invert = true;
    step();
    expect(axis.value).toBeCloseTo(0, 10);
  });

  it('feeds a pinch and holds its axis while two fingers are down', () => {
    const { axis, controller, step } = single();
    controller.config.pinch = { axis, gain: 2 };
    controller.input.pinchDelta = Math.log(1.5);
    controller.input.touchTwoHeld = true;
    step();
    expect(axis.value).toBeCloseTo(2 * Math.log(1.5), 10);
    expect(axis.held).toBe(true);

    controller.input.pinchDelta = 0;
    controller.input.touchTwoHeld = false;
    step();
    expect(axis.held).toBe(false);
  });
});
