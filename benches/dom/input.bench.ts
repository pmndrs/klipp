import { bench, group } from '@pmndrs/labs';

import { InputAxis } from '../../src/core/input/InputAxis';

import { InputControllerDom } from '../../src/dom/InputControllerDom';
import { MouseButton } from '../../src/dom/InputSystem';

import { makeFakeDom } from '../fakeDom';
import { warm } from '../warm';

function setup({ mapZoom = false } = {}) {
  const { element } = makeFakeDom();
  const pan = new InputAxis({ range: [-180, 180], wrap: true });
  const tilt = new InputAxis({ range: [-90, 90] });
  const zoom = new InputAxis({ range: [-1, 1] });
  const look = { axes: { x: pan, y: tilt }, gain: 0.15 };
  const controller = new InputControllerDom({
    mouseButtons: { left: look, right: null, middle: null },
    touches: { one: look, two: null, three: null },
    wheel: mapZoom ? { axis: zoom, gain: 0.001 } : null,
    trackpadPinch: mapZoom ? { axis: zoom } : null,
  });
  controller.connect(element);
  const frame = () => {
    controller.update();
    pan.update(0.016);
    tilt.update(0.016);
    zoom.update(0.016);
    return pan.value + zoom.value;
  };
  return { element, frame };
}

// One measured call is a whole frame: the events since the last frame, then every source, the mapping and the axes.
group('InputControllerDom frame @input', () => {
  bench('idle', function* () {
    const { frame } = setup();
    yield warm(frame);
  });

  bench('one drag event', function* () {
    const { element, frame } = setup();
    const drag = { pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0, buttons: MouseButton.left };
    element.dispatch('pointerdown', drag);
    yield warm(() => {
      drag.clientX++;
      element.dispatch('pointermove', drag);
      return frame();
    });
  });

  bench('drag, wheel and trackpad pinch mapped', function* () {
    const { element, frame } = setup({ mapZoom: true });
    const drag = { pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0, buttons: MouseButton.left };
    const scroll = { clientX: 0, clientY: 0, deltaX: 0, deltaY: 10, deltaMode: 0, ctrlKey: false, shiftKey: false };
    const event = Object.assign(scroll, { preventDefault: () => {} });
    element.dispatch('pointerdown', drag);
    yield warm(() => {
      drag.clientX++;
      event.ctrlKey = !event.ctrlKey;
      element.dispatch('pointermove', drag);
      element.dispatch('wheel', event);
      return frame();
    });
  });
});
