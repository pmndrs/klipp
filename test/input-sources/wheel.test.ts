import { afterEach, describe, expect, it, vi } from 'vitest';

import * as wheel from '../../src/input-sources/wheel';

function setup() {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0 }) as DOMRect;
  document.body.appendChild(element);
  const state = wheel.create();
  const onInput = vi.fn();
  const disconnect = wheel.connect(state, element, onInput);
  const scroll = (init: WheelEventInit) => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
    element.dispatchEvent(event);
    return event;
  };
  return { element, state, onInput, disconnect, scroll };
}

afterEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'pointerLockElement', { value: null, configurable: true });
});

describe('wheel', () => {
  it('sums a frame of scrolling on update, and reading it does not clear it', () => {
    const { state, scroll } = setup();
    scroll({ deltaX: 5, deltaY: 30 });
    scroll({ deltaY: 70 });
    expect(state.deltaY).toBe(0);

    wheel.update(state);
    expect([state.deltaX, state.deltaY]).toEqual([5, 100]);
    expect([state.deltaX, state.deltaY]).toEqual([5, 100]);

    wheel.update(state);
    expect([state.deltaX, state.deltaY]).toEqual([0, 0]);
  });

  it('converts lines and pages to pixels (real bug: line-based wheels moved a fraction as far)', () => {
    const { state, scroll } = setup();
    scroll({ deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE });
    wheel.update(state);
    expect(state.deltaY).toBe(3 * state.pixelsPerLine);

    scroll({ deltaY: 1, deltaMode: WheelEvent.DOM_DELTA_PAGE });
    wheel.update(state);
    expect(state.deltaY).toBe(state.pixelsPerPage);
  });

  it('routes a ctrlKey wheel (trackpad pinch) to pinchDelta, as ln(scale)', () => {
    const { state, scroll } = setup();
    scroll({ deltaX: 5, deltaY: 50, ctrlKey: true });
    wheel.update(state);
    expect(state.pinchDelta).toBeCloseTo(-0.5, 10);
    expect([state.deltaX, state.deltaY]).toEqual([0, 0]);
  });

  it('turns a shifted single-axis wheel sideways, but keeps the deltaX a trackpad sends', () => {
    const { state, scroll } = setup();
    scroll({ deltaY: 40, shiftKey: true });
    wheel.update(state);
    expect([state.deltaX, state.deltaY]).toEqual([40, 0]);

    scroll({ deltaX: 15, deltaY: 40, shiftKey: true });
    wheel.update(state);
    expect([state.deltaX, state.deltaY]).toEqual([15, 40]);
  });

  it('only takes scrolls inside interactiveArea, and keeps the page scrolling outside it', () => {
    const { state, scroll, onInput } = setup();
    state.interactiveArea = { x: 0.5, y: 0, width: 0.5, height: 1 };

    const outside = scroll({ deltaY: 100, clientX: 10, clientY: 10 });
    expect(outside.defaultPrevented).toBe(false);
    expect(onInput).not.toHaveBeenCalled();

    const inside = scroll({ deltaY: 100, clientX: 60, clientY: 10 });
    expect(inside.defaultPrevented).toBe(true);
    expect(onInput).toHaveBeenCalledOnce();
    wheel.update(state);
    expect(state.deltaY).toBe(100);
  });

  it('counts a locked pointer as inside interactiveArea, since its position is frozen', () => {
    const { element, state, scroll } = setup();
    state.interactiveArea = { x: 0.5, y: 0, width: 0.5, height: 1 };
    Object.defineProperty(document, 'pointerLockElement', { value: element, configurable: true });
    scroll({ deltaY: 100, clientX: 0, clientY: 0 });
    wheel.update(state);
    expect(state.deltaY).toBe(100);
  });

  it('stops listening and leaves the page scroll alone once disconnected', () => {
    const { state, scroll, disconnect } = setup();
    disconnect();
    const event = scroll({ deltaY: 100 });
    wheel.update(state);
    expect(state.deltaY).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it('can leave scrolling and pinch zoom to the page, while still reading them', () => {
    const { state, scroll } = setup();
    state.preventPageScroll = false;
    expect(scroll({ deltaY: 100 }).defaultPrevented).toBe(false);
    expect(scroll({ deltaY: 5, ctrlKey: true }).defaultPrevented).toBe(true);

    state.preventPageZoom = false;
    expect(scroll({ deltaY: 5, ctrlKey: true }).defaultPrevented).toBe(false);
    wheel.update(state);
    expect(state.deltaY).toBe(100);
    expect(state.pinchDelta).toBeCloseTo(-0.1, 10);
  });
});
