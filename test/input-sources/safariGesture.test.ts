import { afterEach, describe, expect, it, vi } from 'vitest';

import * as safariGesture from '../../src/input-sources/safariGesture';

const connections: (() => void)[] = [];

function setup() {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0 }) as DOMRect;
  document.body.appendChild(element);
  const state = safariGesture.create();
  const onInput = vi.fn();
  const disconnect = safariGesture.connect(state, element, onInput);
  connections.push(disconnect);
  const send = (type: string, scale: number, rotation: number, x = 0, y = 0) => {
    const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      scale,
      rotation,
      clientX: x,
      clientY: y,
    });
    element.dispatchEvent(event);
    return event;
  };
  return { element, state, onInput, send, disconnect };
}

afterEach(() => {
  for (const disconnect of connections.splice(0)) disconnect();
  document.body.innerHTML = '';
});

describe('safariGesture', () => {
  it('sums pinch as ln(scale) and rotation in radians on update, and keeps the page from zooming', () => {
    const { state, send, onInput } = setup();
    expect(send('gesturestart', 1, 0).defaultPrevented).toBe(true);
    send('gesturechange', 1.1, 0);
    send('gesturechange', 1.15, 10);
    expect(onInput).toHaveBeenCalledTimes(2);

    safariGesture.update(state);
    expect(state.logScaleDelta).toBeCloseTo(Math.log(1.15), 5);
    expect(state.twistDelta).toBeCloseTo((10 * Math.PI) / 180, 5);

    safariGesture.update(state);
    expect(state.logScaleDelta).toBe(0);
  });

  it('measures each gesture from its own start, since Safari resets scale and rotation per gesture', () => {
    const { state, send } = setup();
    send('gesturestart', 1, 0);
    send('gesturechange', 2, 0);
    send('gestureend', 2, 0);
    send('gesturestart', 1, 0);
    send('gesturechange', 1.1, 0);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBeCloseTo(Math.log(2) + Math.log(1.1), 5);
  });

  it('ignores a gesture that starts outside interactiveArea', () => {
    const { state, send } = setup();
    state.interactiveArea = { x: 0.5, y: 0, width: 0.5, height: 1 };
    send('gesturestart', 1, 0, 10, 10);
    send('gesturechange', 1.1, 0, 10, 10);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBe(0);
  });

  it('lockTouchAxis keeps the stronger of scale and rotation, decided once per gesture', () => {
    const { state, send } = setup();
    state.lockTouchAxis = true;
    send('gesturestart', 1, 0);
    send('gesturechange', 1.01, 20);
    send('gesturechange', 1.5, 20);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBe(0);
    expect(state.twistDelta).toBeCloseTo((20 * Math.PI) / 180, 5);

    send('gestureend', 1.5, 20);
    send('gesturestart', 1, 0);
    send('gesturechange', 1.5, 5);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBeCloseTo(Math.log(1.5), 5);
    expect(state.twistDelta).toBe(0);
  });

  it('ends the gesture on lost focus or disconnect, so a late change does nothing', () => {
    const { state, send, disconnect } = setup();
    send('gesturestart', 1, 0);
    window.dispatchEvent(new Event('blur'));
    send('gesturechange', 1.5, 0);

    send('gesturestart', 1, 0);
    disconnect();
    send('gesturechange', 1.5, 0);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBe(0);
  });

  it('leaves a pinch made with fingers on a touch screen to the touch source (real bug: iOS counted it twice)', () => {
    const { state, send, element } = setup();
    const finger = (type: string, id: number) =>
      element.dispatchEvent(new PointerEvent(type, { pointerId: id, bubbles: true, pointerType: 'touch' }));

    finger('pointerdown', 1);
    finger('pointerdown', 2);
    send('gesturestart', 1, 0);
    send('gesturechange', 1.5, 10);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBe(0);
    expect(state.twistDelta).toBe(0);

    finger('pointerup', 1);
    finger('pointerup', 2);
    send('gesturestart', 1, 0);
    send('gesturechange', 1.2, 0);
    finger('pointerdown', 3);
    send('gesturechange', 1.5, 0);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBeCloseTo(Math.log(1.2), 5);
  });

  it('can leave pinch zoom to the page, while still reading it', () => {
    const { state, send } = setup();
    state.preventPageZoom = false;
    expect(send('gesturestart', 1, 0).defaultPrevented).toBe(false);
    expect(send('gesturechange', 1.5, 0).defaultPrevented).toBe(false);
    safariGesture.update(state);
    expect(state.logScaleDelta).toBeCloseTo(Math.log(1.5), 5);
  });
});
