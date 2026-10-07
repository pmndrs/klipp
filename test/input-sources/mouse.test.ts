import { afterEach, describe, expect, it, vi } from 'vitest';

import * as mouse from '../../src/input-sources/mouse';

const LEFT = 1;
const RIGHT = 2;

type Move = { x?: number; y?: number; buttons?: number; id?: number; movementX?: number; movementY?: number };

const connections: (() => void)[] = [];

function setup() {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0 }) as DOMRect;
  element.setPointerCapture = () => {};
  document.body.appendChild(element);
  const state = mouse.create();
  const onInput = vi.fn();
  let disconnect = mouse.connect(state, element, onInput);
  const send = (type: string, { x = 0, y = 0, buttons = 0, id = 1, movementX = 0, movementY = 0 }: Move = {}) =>
    element.dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        clientX: x,
        clientY: y,
        buttons,
        movementX,
        movementY,
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
      }),
    );
  const lock = (locked: boolean) => {
    Object.defineProperty(document, 'pointerLockElement', { value: locked ? element : null, configurable: true });
    document.dispatchEvent(new Event('pointerlockchange'));
  };
  const reconnect = () => {
    disconnect();
    disconnect = mouse.connect(state, element, onInput);
  };
  connections.push(() => disconnect());
  return { element, state, onInput, send, lock, reconnect, disconnect: () => disconnect() };
}

afterEach(() => {
  for (const disconnect of connections.splice(0)) disconnect();
  document.body.innerHTML = '';
  Object.defineProperty(document, 'pointerLockElement', { value: null, configurable: true });
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

describe('mouse', () => {
  it('sums a frame of dragging on update, and reading it does not clear it', () => {
    const { state, send } = setup();
    send('pointerdown', { buttons: LEFT });
    send('pointermove', { x: 10, y: 4, buttons: LEFT });
    send('pointermove', { x: 25, y: 10, buttons: LEFT });
    expect(state.drag.left).toEqual([0, 0]);

    mouse.update(state);
    expect(state.drag.left).toEqual([25, 10]);
    expect(state.drag.left).toEqual([25, 10]);

    mouse.update(state);
    expect(state.drag.left).toEqual([0, 0]);
  });

  it('gives each move to the buttons held at that moment', () => {
    const { state, send } = setup();
    send('pointerdown', { buttons: LEFT | RIGHT });
    send('pointermove', { x: 10, buttons: LEFT | RIGHT });
    send('pointerup');
    send('pointerdown', { buttons: RIGHT });
    send('pointermove', { x: 5, y: 5, buttons: RIGHT });
    mouse.update(state);

    expect(state.drag.left).toEqual([10, 0]);
    expect(state.drag.right).toEqual([15, 5]);
  });

  it('reports held buttons across frames, and a click inside one frame as pressed and released', () => {
    const { state, send } = setup();
    send('pointerdown', { buttons: LEFT });
    mouse.update(state);
    expect(state.buttons.justPressed.has('left')).toBe(true);
    mouse.update(state);
    expect(state.buttons.pressed.has('left')).toBe(true);
    expect(state.buttons.justPressed.has('left')).toBe(false);

    send('pointerup');
    mouse.update(state);
    expect(state.buttons.justReleased.has('left')).toBe(true);
    expect(state.buttons.pressed.size).toBe(0);

    send('pointerdown', { buttons: RIGHT });
    send('pointerup');
    mouse.update(state);
    expect(state.buttons.justPressed.has('right')).toBe(true);
    expect(state.buttons.justReleased.has('right')).toBe(true);
    expect(state.buttons.pressed.has('right')).toBe(false);
  });

  it('a repeated pointerdown re-anchors, and a second mouse is ignored until the first lifts', () => {
    const { state, send } = setup();
    send('pointerdown', { buttons: LEFT });
    send('pointerdown', { x: 20, y: 20, buttons: LEFT });
    send('pointerdown', { x: 100, y: 100, buttons: LEFT, id: 2 });
    send('pointermove', { x: 25, y: 20, buttons: LEFT });
    send('pointermove', { x: 999, y: 999, buttons: LEFT, id: 2 });
    mouse.update(state);
    expect(state.drag.left).toEqual([5, 0]);

    send('pointerup');
    send('pointerdown', { x: 50, y: 50, buttons: LEFT, id: 2 });
    send('pointermove', { x: 60, y: 55, buttons: LEFT, id: 2 });
    mouse.update(state);
    expect(state.drag.left).toEqual([10, 5]);
  });

  it('releases on a hidden tab, lost focus or lost capture, where the pointerup may never come', () => {
    const { state, send } = setup();
    const releasedBy = (lose: () => void) => {
      send('pointerdown', { buttons: LEFT });
      mouse.update(state);
      lose();
      mouse.update(state);
      const released = state.buttons.justReleased.has('left') && !state.buttons.pressed.has('left');
      send('pointerdown', { x: 200, y: 200, buttons: LEFT });
      send('pointermove', { x: 210, y: 205, buttons: LEFT });
      send('pointerup');
      mouse.update(state);
      return released && state.drag.left[0] === 10 && state.drag.left[1] === 5;
    };

    expect(
      releasedBy(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      }),
    ).toBe(true);
    expect(releasedBy(() => window.dispatchEvent(new Event('blur')))).toBe(true);
    expect(releasedBy(() => send('lostpointercapture'))).toBe(true);
  });

  it('only starts drags inside interactiveArea, and keeps a started drag going outside it', () => {
    const { state, send } = setup();
    state.interactiveArea = { x: 0.5, y: 0, width: 0.5, height: 1 };
    const drag = (fromX: number, toX: number) => {
      send('pointerdown', { x: fromX, y: 10, buttons: LEFT });
      send('pointermove', { x: toX, y: 10, buttons: LEFT });
      send('pointerup', { x: toX, y: 10 });
      mouse.update(state);
      return state.drag.left[0];
    };

    expect(drag(10, 20)).toBe(0);
    expect(drag(60, 70)).toBe(10);
    expect(drag(60, 0)).toBe(-60);
  });

  it('only calls onInput for input it keeps, not for hovering', () => {
    const { send, onInput } = setup();
    send('pointermove', { x: 10 });
    expect(onInput).not.toHaveBeenCalled();
    send('pointerdown', { buttons: LEFT });
    send('pointermove', { x: 20, buttons: LEFT });
    expect(onInput).toHaveBeenCalledTimes(2);
  });

  it('suppresses the context menu only when asked', () => {
    const { element, state } = setup();
    const menu = () => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(menu()).toBe(false);
    state.suppressContextMenu = true;
    expect(menu()).toBe(true);
  });

  it('disconnecting stops listening, releases held buttons and restores the element styles', () => {
    const { element, state, send, disconnect } = setup();
    element.style.touchAction = '';
    send('pointerdown', { buttons: LEFT });
    disconnect();
    send('pointermove', { x: 50, buttons: LEFT });
    mouse.update(state);

    expect(state.drag.left).toEqual([0, 0]);
    expect(state.buttons.pressed.size).toBe(0);
    expect(element.style.userSelect).toBe('');
  });

  describe('pointer lock', () => {
    it('measures drags with movementX/Y, since the position freezes', () => {
      const { state, send, lock } = setup();
      send('pointerdown', { buttons: LEFT });
      lock(true);
      send('pointermove', { buttons: LEFT, movementX: 7, movementY: -3 });
      mouse.update(state);
      expect(state.drag.left).toEqual([7, -3]);
      expect(state.lockedMovement).toEqual([0, 0]);
    });

    it('takes movement with no button held only while locked', () => {
      const { state, send, lock } = setup();
      send('pointermove', { movementX: 12, movementY: 4 });
      mouse.update(state);
      expect(state.lockedMovement).toEqual([0, 0]);

      lock(true);
      expect(state.locked).toBe(true);
      send('pointermove', { movementX: 12, movementY: 4 });
      mouse.update(state);
      expect(state.lockedMovement).toEqual([12, 4]);
    });

    it('a lock lost mid-drag makes the next move re-anchor instead of jumping', () => {
      const { state, send, lock } = setup();
      send('pointerdown', { buttons: LEFT });
      lock(true);
      send('pointermove', { buttons: LEFT, movementX: 5, movementY: 5 });
      lock(false);
      send('pointermove', { x: 500, y: 500, buttons: LEFT });
      mouse.update(state);
      expect(state.drag.left).toEqual([5, 5]);
    });

    it('a lock that outlives a reconnect is picked up again, and leaving it still re-anchors', () => {
      const { state, send, lock, reconnect } = setup();
      lock(true);
      reconnect();
      expect(state.locked).toBe(true);
      send('pointermove', { movementX: 8, movementY: 3 });

      send('pointerdown', { buttons: LEFT });
      lock(false);
      send('pointermove', { x: 500, y: 500, buttons: LEFT });
      mouse.update(state);
      expect(state.lockedMovement).toEqual([8, 3]);
      expect(state.drag.left).toEqual([0, 0]);
    });

    it('warns when the browser rejects the lock', () => {
      setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      document.dispatchEvent(new Event('pointerlockerror'));
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });
  });
});
