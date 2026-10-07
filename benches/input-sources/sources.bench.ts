import { bench, group } from '@pmndrs/labs';

import { makeFakeDom } from '../fakeDom';
import { warm } from '../warm';

import * as mouse from '../../src/input-sources/mouse';
import * as safariGesture from '../../src/input-sources/safariGesture';
import * as touch from '../../src/input-sources/touch';
import * as wheel from '../../src/input-sources/wheel';

// Each measured call is one frame with one event: the handler, then the source's update.
group('Input sources @input', () => {
  bench('mouse: drag', function* () {
    const { element } = makeFakeDom();
    const state = mouse.create();
    mouse.connect(state, element);
    const event = { pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0, buttons: mouse.MouseButton.left };
    element.dispatch('pointerdown', event);
    yield warm(() => {
      event.clientX++;
      element.dispatch('pointermove', event);
      mouse.update(state);
      return state.drag.left[0];
    });
  });

  bench('mouse: pointer lock, no button', function* () {
    const { element, document } = makeFakeDom();
    const state = mouse.create();
    (document as unknown as { pointerLockElement: unknown }).pointerLockElement = element;
    mouse.connect(state, element);
    const event = { pointerType: 'mouse', pointerId: 1, buttons: 0, movementX: 1, movementY: 0 };
    yield warm(() => {
      element.dispatch('pointermove', event);
      mouse.update(state);
      return state.lockedMovement[0];
    });
  });

  bench('touch: two-finger pinch', function* () {
    const { element } = makeFakeDom();
    const state = touch.create();
    touch.connect(state, element);
    element.dispatch('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 0, clientY: 0 });
    element.dispatch('pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 100, clientY: 0 });
    const event = { pointerType: 'touch', pointerId: 2, clientX: 100, clientY: 0 };
    let t = 0;
    yield warm(() => {
      t += 0.01;
      event.clientX = 100 + Math.sin(t) * 20;
      element.dispatch('pointermove', event);
      touch.update(state);
      return state.pinchDelta;
    });
  });

  bench('wheel', function* () {
    const { element } = makeFakeDom();
    const state = wheel.create();
    wheel.connect(state, element);
    const event = {
      clientX: 0,
      clientY: 0,
      deltaX: 0,
      deltaY: 100,
      deltaMode: 0,
      ctrlKey: false,
      shiftKey: false,
      preventDefault: () => {},
    };
    yield warm(() => {
      element.dispatch('wheel', event);
      wheel.update(state);
      return state.deltaY;
    });
  });

  bench('safariGesture: pinch', function* () {
    const { element } = makeFakeDom();
    const state = safariGesture.create();
    safariGesture.connect(state, element);
    const event = { scale: 1, rotation: 0, clientX: 0, clientY: 0, cancelable: true, preventDefault: () => {} };
    element.dispatch('gesturestart', event);
    let t = 0;
    yield warm(() => {
      t += 0.01;
      event.scale = 1 + Math.sin(t) * 0.5;
      element.dispatch('gesturechange', event);
      safariGesture.update(state);
      return state.logScaleDelta;
    });
  });
});
