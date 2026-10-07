import { describe, expect, it } from 'vitest';

import { InputAxis } from '../../../src/core/input/InputAxis';
import { InputController } from '../../../src/core/input/InputController';

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
});

describe('InputController — single-axis sources', () => {
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
