import { bench, group } from '@pmndrs/labs';

import * as consumedInput from '../../src/core/input/consumedInput';
import type { ConsumedInput } from '../../src/core/input/consumedInput';

import { InputSystem, MouseButton } from '../../src/dom/InputSystem';

// Node has no DOM, so these call the handlers directly instead of dispatching events.
group('InputSystem event handlers @input', () => {
  type Handlers = Pick<InputSystem, 'connect' | 'consume'> & {
    onPointerDown: (event: unknown) => void;
    onPointerMove: (event: unknown) => void;
    onWheel: (event: unknown) => void;
  };

  function makeConnectedInputSystem(): { system: Handlers; element: object } {
    const fakeDocument = {
      pointerLockElement: null as object | null,
      addEventListener: () => {},
      removeEventListener: () => {},
      exitPointerLock: () => {},
    };
    (globalThis as unknown as { document: unknown }).document = fakeDocument;
    const element = {
      style: {} as Record<string, string>,
      addEventListener: () => {},
      removeEventListener: () => {},
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
    };
    const system = new InputSystem() as unknown as Handlers;
    system.connect(element as unknown as HTMLElement);
    return { system, element };
  }

  function emptyInput(): ConsumedInput {
    return consumedInput.create();
  }

  bench('onPointerMove (button held, unlocked drag)', function* () {
    const { system, element } = makeConnectedInputSystem();
    system.onPointerDown({ pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0, target: element });
    const moveEvent = { pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0, buttons: MouseButton.left };
    const out = emptyInput();
    let x = 0;
    yield () => {
      x += 1;
      moveEvent.clientX = x;
      system.onPointerMove(moveEvent);
      system.consume(out);
      return out.leftDx;
    };
  });

  bench('onPointerMove (buttonless, Pointer Lock active)', function* () {
    const { system, element } = makeConnectedInputSystem();
    // Pretend the browser granted Pointer Lock.
    (globalThis as unknown as { document: { pointerLockElement: unknown } }).document.pointerLockElement = element;
    const moveEvent = {
      pointerType: 'mouse',
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      buttons: 0,
      movementX: 1,
      movementY: 0,
    };
    const out = emptyInput();
    yield () => {
      system.onPointerMove(moveEvent);
      system.consume(out);
      return out.lockedDx;
    };
  });

  bench('onWheel', function* () {
    const { system } = makeConnectedInputSystem();
    const wheelEvent = {
      clientX: 0,
      clientY: 0,
      deltaX: 0,
      deltaY: 1,
      ctrlKey: false,
      shiftKey: false,
      preventDefault: () => {},
    };
    const out = emptyInput();
    yield () => {
      system.onWheel(wheelEvent);
      system.consume(out);
      return out.wheelDeltaY;
    };
  });
});
