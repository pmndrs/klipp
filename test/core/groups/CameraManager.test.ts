import { describe, expect, it } from 'vitest';

import * as cameraState from '../../../src/core/cameraState';
import { BlendCurves } from '../../../src/core/blend/BlendCurves';
import { CameraManager } from '../../../src/core/groups/CameraManager';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

class PickedCamera extends CameraManager {
  pick: string | null = null;

  protected chooseCamera(): string | null {
    return this.pick;
  }
}

function fixedAt(name: string, x: number): VirtualCamera {
  const camera = new VirtualCamera(name);
  camera.setBody({ update: (out) => void (out.position[0] = x) });
  return camera;
}

describe('CameraManager', () => {
  it('is one camera to its Klipp, and puts the chosen child on screen', () => {
    const klipp = new Klipp();
    const group = new PickedCamera('group', { defaultBlend: { curve: BlendCurves.linear, time: 0 } });
    group.children.add(fixedAt('a', 1));
    group.children.add(fixedAt('b', 2));
    klipp.add(group);

    group.pick = 'b';
    klipp.update(0.1);

    expect([...klipp.state.cameras.keys()]).toEqual(['group']);
    expect(klipp.shot.position[0]).toBe(2);
    expect(group.children.liveCameraName).toBe('b');
  });

  it('blends between its children with its own blend', () => {
    const klipp = new Klipp({ defaultBlend: { curve: BlendCurves.cut, time: 0 } });
    const group = new PickedCamera('group', { defaultBlend: { curve: BlendCurves.linear, time: 1 } });
    group.children.add(fixedAt('a', 1));
    group.children.add(fixedAt('b', 2));
    klipp.add(group);
    group.pick = 'a';
    klipp.update(0.1);

    group.pick = 'b';
    klipp.update(0.5);
    expect(group.children.isBlending).toBe(true);
    expect(klipp.shot.position[0]).toBeGreaterThan(1);
    expect(klipp.shot.position[0]).toBeLessThan(2);

    klipp.update(0.6);
    expect(klipp.shot.position[0]).toBe(2);
    expect(group.children.liveCameraName).toBe('b');
  });

  it('gives its children the Klipp on top and its initial state, also when they join the group first', () => {
    const initialCameraState = cameraState.create();
    initialCameraState.fov = 33;
    const klipp = new Klipp({ initialCameraState });
    const group = new PickedCamera('group');
    const child = new VirtualCamera('a');

    group.children.add(child);
    expect(child.klipp).toBeNull();

    klipp.add(group);
    expect(child.klipp).toBe(klipp);
    expect(child.state.fov).toBe(33);

    klipp.remove(group);
    expect(child.klipp).toBeNull();
  });

  it('reports child transitions on its children and its own on itself', () => {
    const klipp = new Klipp();
    const group = new PickedCamera('group');
    const a = fixedAt('a', 1);
    group.children.add(a);
    const childEvents: string[] = [];
    const ownEvents: string[] = [];
    const cameraEvents: string[] = [];
    group.children.addEventListener('activated', (event) => childEvents.push(event.incoming));
    group.addEventListener('activated', (event) => ownEvents.push(event.incoming));
    a.addEventListener('activated', (event) => cameraEvents.push(event.incoming));

    klipp.add(group);
    group.pick = 'a';
    klipp.update(0.1);

    expect(ownEvents).toEqual(['group']);
    expect(childEvents).toEqual(['a']);
    expect(cameraEvents).toEqual(['a']);
  });

  it('runs the chosen child every frame and the others as their standbyUpdate says', () => {
    const klipp = new Klipp();
    const group = new PickedCamera('group');
    const runs = { a: 0, b: 0 };
    for (const name of ['a', 'b'] as const) {
      const camera = new VirtualCamera(name, { standbyUpdate: 'never' });
      camera.setBody({ update: () => void runs[name]++ });
      group.children.add(camera);
    }
    klipp.add(group);

    group.pick = 'a';
    klipp.update(0.1);
    klipp.update(0.1);

    expect(runs).toEqual({ a: 2, b: 0 });
  });

  it('starts its children fresh when turned back on', () => {
    const klipp = new Klipp();
    const group = new PickedCamera('group');
    const justActivated: boolean[] = [];
    const child = new VirtualCamera('a');
    child.setBody({ update: (_out, _dt, fresh) => void justActivated.push(fresh) });
    group.children.add(child);
    klipp.add(group);
    group.pick = 'a';

    klipp.update(0.1);
    klipp.update(0.1);
    group.active = false;
    klipp.update(0.1);
    group.active = true;
    klipp.update(0.1);

    expect(justActivated).toEqual([true, false, true]);
  });

  it('puts a child on screen for whileOnScreen only while the group is on screen too', () => {
    const klipp = new Klipp({ defaultBlend: { curve: BlendCurves.cut, time: 0 } });
    const group = new PickedCamera('group');
    const child = fixedAt('a', 1);
    group.children.add(child);
    const other = fixedAt('other', 9);
    klipp.add(other);
    klipp.add(group);
    const calls: string[] = [];
    klipp.whileOnScreen(child, () => {
      calls.push('start');
      return () => calls.push('stop');
    });

    group.pick = 'a';
    other.priority = 10;
    klipp.update(0.1);
    expect(calls).toEqual([]);

    other.priority = -10;
    klipp.update(0.1);
    expect(calls).toEqual(['start']);

    group.pick = null;
    klipp.update(0.1);
    expect(calls).toEqual(['start', 'stop']);
  });
});
