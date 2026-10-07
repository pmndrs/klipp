import { afterEach, describe, expect, it, vi } from 'vitest';

import * as touch from '../../../src/dom/sources/touch';

const connections: (() => void)[] = [];

function setup() {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0 }) as DOMRect;
  element.setPointerCapture = () => {};
  document.body.appendChild(element);
  const state = touch.create();
  const onInput = vi.fn();
  const disconnect = touch.connect(state, element, onInput);
  connections.push(disconnect);
  const send = (type: string, x: number, y: number, id: number, pointerType = 'touch') =>
    element.dispatchEvent(
      new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType }),
    );
  return { element, state, onInput, send, disconnect };
}

afterEach(() => {
  for (const disconnect of connections.splice(0)) disconnect();
  document.body.innerHTML = '';
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

describe('touch', () => {
  it('sums a frame of one-finger dragging on update, and reading it does not clear it', () => {
    const { state, send } = setup();
    send('pointerdown', 0, 0, 1);
    send('pointermove', 10, 4, 1);
    send('pointermove', 25, 10, 1);
    touch.update(state);
    expect(state.fingers).toBe(1);
    expect(state.drag.one).toEqual([25, 10]);
    expect(state.drag.one).toEqual([25, 10]);

    touch.update(state);
    expect(state.drag.one).toEqual([0, 0]);
  });

  it('gives each move to the finger count at that moment, even within one frame', () => {
    const { state, send } = setup();
    send('pointerdown', 0, 0, 1);
    send('pointermove', 10, 0, 1);
    send('pointerdown', 100, 0, 2);
    send('pointermove', 20, 0, 1);
    send('pointerdown', 50, 50, 3);
    send('pointermove', 60, 50, 3);
    touch.update(state);

    expect(state.fingers).toBe(3);
    expect(state.drag.one).toEqual([10, 0]);
    expect(state.drag.two[0]).toBeCloseTo(5, 5);
    expect(state.pinchDelta).toBeCloseTo(-10, 5);
    expect(state.drag.three[0]).toBeCloseTo(10 / 3, 5);
  });

  it('measures pinch and twist from the same two-finger move, crossing the ±180° seam the short way', () => {
    const { state, send } = setup();
    send('pointerdown', -50, 0, 1);
    send('pointerdown', 50, 0, 2);
    send('pointermove', 0, 50, 2);
    touch.update(state);
    expect(state.pinchDelta).toBeCloseTo(Math.hypot(50, 50) - 100, 5);
    expect(state.twistDelta).toBeCloseTo(Math.PI / 4, 5);

    send('pointerup', 0, 50, 2);
    send('pointerdown', -100, 1, 3);
    send('pointermove', -100, -1, 3);
    touch.update(state);
    expect(state.twistDelta).toBeGreaterThan(0);
    expect(state.twistDelta).toBeLessThan(0.1);
  });

  it('lockTouchAxis keeps the stronger of pinch and twist, decided once per gesture', () => {
    const { state, send } = setup();
    state.lockTouchAxis = true;
    send('pointerdown', 0, 0, 1);
    send('pointerdown', 100, 0, 2);
    send('pointermove', 95, 34, 2);
    send('pointermove', 190, 68, 2);
    touch.update(state);
    expect(state.pinchDelta).toBe(0);
    expect(state.twistDelta).toBeCloseTo(Math.atan2(34, 95), 5);

    send('pointerup', 190, 68, 2);
    send('pointerdown', 100, 0, 2);
    send('pointermove', 150, 5, 2);
    touch.update(state);
    expect(state.pinchDelta).toBeCloseTo(Math.hypot(150, 5) - 100, 5);
    expect(state.twistDelta).toBe(0);
  });

  it('ignores a fourth finger and mouse or pen pointers', () => {
    const { state, send } = setup();
    send('pointerdown', 0, 0, 1);
    send('pointerdown', 100, 0, 2);
    send('pointerdown', 50, 50, 3);
    send('pointerdown', 999, 999, 4);
    send('pointermove', 0, 0, 4);
    send('pointerdown', 0, 0, 5, 'mouse');
    send('pointerdown', 0, 0, 6, 'pen');
    touch.update(state);
    expect(state.fingers).toBe(3);
    expect(state.drag.three).toEqual([0, 0]);
  });

  it('lifting a finger moves the rest down a slot with a fresh pinch baseline, so nothing jumps', () => {
    const { state, send } = setup();
    send('pointerdown', 0, 0, 1);
    send('pointerdown', 100, 0, 2);
    send('pointerdown', 250, 0, 3);
    send('pointerup', 0, 0, 1);
    send('pointermove', 300, 0, 3);
    touch.update(state);
    expect(state.fingers).toBe(2);
    expect(state.pinchDelta).toBeCloseTo(50, 5);

    send('pointerup', 300, 0, 3);
    send('pointermove', 110, 0, 2);
    touch.update(state);
    expect(state.fingers).toBe(1);
    expect(state.drag.one).toEqual([10, 0]);
    expect(state.drag.two).toEqual([0, 0]);
  });

  it('lifts every finger on a hidden tab, lost focus or lost capture, where the pointerup may never come', () => {
    const { state, send } = setup();
    const liftedBy = (lose: () => void) => {
      send('pointerdown', 0, 0, 1);
      touch.update(state);
      lose();
      touch.update(state);
      return state.fingers === 0;
    };

    expect(
      liftedBy(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      }),
    ).toBe(true);
    expect(liftedBy(() => window.dispatchEvent(new Event('blur')))).toBe(true);
    expect(liftedBy(() => send('lostpointercapture', 0, 0, 1))).toBe(true);
  });

  it('only starts touches inside interactiveArea', () => {
    const { state, send } = setup();
    state.interactiveArea = { x: 0.5, y: 0, width: 0.5, height: 1 };
    send('pointerdown', 10, 10, 1);
    send('pointerdown', 60, 10, 2);
    send('pointermove', 70, 10, 2);
    touch.update(state);
    expect(state.fingers).toBe(1);
    expect(state.drag.one).toEqual([10, 0]);
  });

  it('disconnecting lifts every finger, stops listening, restores the styles and reports input until then', () => {
    const { element, state, send, onInput, disconnect } = setup();
    send('pointerdown', 0, 0, 1);
    expect(onInput).toHaveBeenCalledOnce();
    expect(element.style.touchAction).toBe('none');

    disconnect();
    send('pointermove', 50, 0, 1);
    touch.update(state);
    expect(state.fingers).toBe(0);
    expect(state.drag.one).toEqual([0, 0]);
    expect(element.style.touchAction).toBe('');
  });
});
