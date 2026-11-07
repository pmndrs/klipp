import { bench, group } from '@pmndrs/labs';
import { Box3, Object3D, PerspectiveCamera, Vector3 } from 'three';

import { BlendCurves } from '../../src/core/blend/BlendCurves';
import type { StandbyUpdate } from '../../src/core/VirtualCameraBase';

import { KlippControlsThree } from '../../src/three/controls/KlippControlsThree';
import { CameraOffsetExtensionThree } from '../../src/three/extension/CameraOffsetExtensionThree';
import { ConfinerExtensionThree } from '../../src/three/extension/ConfinerExtensionThree';
import { KlippThree } from '../../src/three/KlippThree';
import { BasicMultiChannelPerlinNoiseThree } from '../../src/three/noise/BasicMultiChannelPerlinNoiseThree';

import { InputControllerDom } from '../../src/dom/InputControllerDom';
import { MouseButtons } from '../../src/dom/InputSystem';

import { makeFakeDom } from '../fakeDom';

function makeKlipp(options?: ConstructorParameters<typeof KlippThree>[1]): KlippThree {
  const klipp = new KlippThree(new PerspectiveCamera(), options);
  klipp.setSize(1920, 1080);
  return klipp;
}

function addControls(
  klipp: KlippThree,
  name: string,
  target: Object3D,
  priority: number,
  standbyUpdate?: StandbyUpdate,
) {
  const controls = new KlippControlsThree(name, { target, priority, standbyUpdate, minDistance: 2, maxDistance: 40 });
  klipp.add(controls);
  return controls;
}

/** Orbit, zoom and pan input on `controls`, as a drag, a scroll and a right drag would give every frame. */
function feed(controls: KlippControlsThree, t: number): void {
  controls.horizontal.applyDelta(0.5);
  controls.vertical.applyDelta(Math.sin(t) * 0.5);
  controls.zoom.applyDelta(Math.sin(t * 0.7) * 0.01);
  controls.panX.applyDelta(Math.cos(t) * 3);
  controls.panY.applyDelta(Math.sin(t) * 3);
}

/** Every KlippControls on its own moving target, with input on the one on screen. */
function scene(cameras: number, standbyUpdate?: StandbyUpdate) {
  const klipp = makeKlipp();
  const targets = Array.from({ length: cameras }, () => new Object3D());
  const all = targets.map((target, i) => addControls(klipp, `controls-${i}`, target, i === 0 ? 10 : 0, standbyUpdate));
  let time = 0;
  return () => {
    time += 0.016;
    for (let i = 0; i < targets.length; i++) {
      targets[i].position.set(Math.sin(time + i) * 10, 2, Math.cos(time + i) * 10);
      targets[i].updateMatrixWorld();
    }
    feed(all[0], time);
    klipp.update(0.016);
    return klipp.shot.position[0];
  };
}

group('KlippThree.update with KlippControls, whole frames @scene', () => {
  bench('1 KlippControls, orbit, zoom and pan input', function* () {
    yield scene(1);
  });

  bench('1 KlippControls with Confiner, CameraOffset and Perlin', function* () {
    const klipp = makeKlipp();
    const target = new Object3D();
    const controls = addControls(klipp, 'controls', target, 10);
    controls.addExtension(new ConfinerExtensionThree(new Box3(new Vector3(-9, 0.5, -9), new Vector3(9, 7, 9))));
    controls.addExtension(new CameraOffsetExtensionThree({ offset: [1, 0.5, 0] }));
    controls.addNoise(new BasicMultiChannelPerlinNoiseThree({ positionAmplitude: [0.1, 0.1, 0.1] }));
    let time = 0;
    yield () => {
      time += 0.016;
      target.position.set(Math.sin(time) * 10, 2, Math.cos(time) * 10);
      target.updateMatrixWorld();
      feed(controls, time);
      klipp.update(0.016);
      return klipp.shot.position[0];
    };
  });

  bench('50 KlippControls, roundRobin', function* () {
    yield scene(50);
  });

  bench('50 KlippControls, always', function* () {
    yield scene(50, 'always');
  });

  // A blend that never ends, so every frame interpolates between two KlippControls taking input.
  bench('2 KlippControls, blending', function* () {
    const klipp = makeKlipp({ defaultBlend: { curve: BlendCurves.easeInOut, time: Number.MAX_VALUE } });
    const target = new Object3D();
    const from = addControls(klipp, 'from', target, 1);
    klipp.update(0.016);
    const to = addControls(klipp, 'to', target, 2);
    to.horizontal.setValue(120);
    let time = 0;
    yield () => {
      time += 0.016;
      target.position.set(Math.sin(time) * 10, 2, Math.cos(time) * 10);
      target.updateMatrixWorld();
      feed(from, time);
      feed(to, time);
      klipp.update(0.016);
      return klipp.shot.position[0];
    };
  });

  // From DOM events to the camera: a drag with the left and right buttons held, and a scroll, every frame.
  bench('1 KlippControls driven by InputControllerDom', function* () {
    const { element } = makeFakeDom();
    const klipp = makeKlipp();
    const target = new Object3D();
    const controls = addControls(klipp, 'controls', target, 10);
    const controller = new InputControllerDom(controls.inputConfig());
    controller.connect(element);
    klipp.registerUpdate(controller.update);
    const buttons = MouseButtons.left | MouseButtons.right;
    const drag = { pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0, buttons };
    const scroll = { clientX: 0, clientY: 0, deltaX: 0, deltaY: 10, deltaMode: 0, ctrlKey: false, shiftKey: false };
    const wheel = Object.assign(scroll, { preventDefault: () => {} });
    element.dispatch('pointerdown', drag);
    let time = 0;
    yield () => {
      time += 0.016;
      target.position.set(Math.sin(time) * 10, 2, Math.cos(time) * 10);
      target.updateMatrixWorld();
      drag.clientX++;
      wheel.deltaY = -wheel.deltaY;
      element.dispatch('pointermove', drag);
      element.dispatch('wheel', wheel);
      klipp.update(0.016);
      return klipp.shot.position[0];
    };
  });
});
