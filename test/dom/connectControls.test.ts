import { describe, expect, it, vi } from 'vitest';

import { BlendCurves } from '../../src/core/blend/BlendCurves';
import { KlippControls } from '../../src/core/controls/KlippControls';
import { Klipp } from '../../src/core/Klipp';
import { VirtualCamera } from '../../src/core/VirtualCamera';

import { connectControls, type ConnectControlsOptions } from '../../src/dom/connectControls';

function setup(options?: ConnectControlsOptions) {
  const klipp = new Klipp();
  const controls = new KlippControls('controls', { priority: 10 });
  klipp.add(controls);
  const element = document.createElement('div');
  const connection = connectControls(klipp, controls, element, options);
  klipp.update(1 / 60);
  return { klipp, controls, element, connection };
}

function scroll(element: HTMLElement, deltaY: number): void {
  element.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
}

describe('connectControls', () => {
  it('drives the axes of the controls with input from the element', () => {
    const { klipp, controls, element } = setup();
    scroll(element, -100);
    klipp.update(1 / 60);
    expect(controls.zoom.value).toBeCloseTo(0.1, 9);
  });

  it('replaces a default source, or turns it off with null', () => {
    const { controller } = setup({ wheel: null, mouseButtons: { right: null } }).connection;
    expect(controller.config.wheel).toBeNull();
    expect(controller.config.mouseButtons?.right).toBeNull();
    expect(controller.config.mouseButtons?.left).not.toBeNull();
    expect(controller.config.pinch).not.toBeNull();
  });

  it('keeps the right-click menu off unless told otherwise, and passes the other options on', () => {
    const area = { x: 0, y: 0, width: 0.5, height: 1 };
    expect(setup().connection.controller.inputSystem.suppressContextMenu).toBe(true);
    const { controller } = setup({ suppressContextMenu: false, interactiveArea: area, lockTouchAxis: true }).connection;
    expect(controller.inputSystem).toMatchObject({
      suppressContextMenu: false,
      interactiveArea: area,
      lockTouchAxis: true,
    });
  });

  it('takes input only while the controls are on screen', () => {
    const { klipp, controls, element } = setup();
    klipp.defaultBlend = { curve: BlendCurves.cut, time: 0 };
    const other = new VirtualCamera('other', { priority: 20 });
    klipp.add(other);
    klipp.update(1 / 60);
    scroll(element, -100);
    klipp.update(1 / 60);
    expect(controls.zoom.value).toBe(0);

    other.active = false;
    klipp.update(1 / 60);
    scroll(element, -100);
    klipp.update(1 / 60);
    expect(controls.zoom.value).toBeCloseTo(0.1, 9);
  });

  it('stops taking input once stopped', () => {
    const { klipp, controls, element, connection } = setup();
    connection.stop();
    scroll(element, -100);
    klipp.update(1 / 60);
    expect(controls.zoom.value).toBe(0);
  });

  it('asks the Klipp for a frame on every event that changes the input', () => {
    const { klipp, element } = setup();
    const requested = vi.fn();
    klipp.subscribeFrameRequest(requested);
    scroll(element, -100);
    expect(requested).toHaveBeenCalledTimes(1);
  });
});
