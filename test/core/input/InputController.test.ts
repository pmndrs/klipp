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
