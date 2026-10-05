import { bench, group } from '@pmndrs/labs';
import type { Vec3 } from 'math';

import * as cameraState from '../../src/core/CameraState';
import { ImpulseField } from '../../src/core/impulse/ImpulseField';
import { ImpulseListenerNoise } from '../../src/core/impulse/ImpulseListenerNoise';
import { BasicMultiChannelPerlinNoise } from '../../src/core/noise/BasicMultiChannelPerlinNoise';

const always = () => 1;

group('ImpulseField.sampleAt @impulse', () => {
  function makeFieldWithEvents(count: number): ImpulseField {
    const field = new ImpulseField();
    for (let i = 0; i < count; i++) {
      field.generate({ position: [i, 0, 0], direction: [1, 0, 0], shape: always, duration: 1000 }, 0);
    }
    return field;
  }

  bench('1 concurrent event', function* () {
    const field = makeFieldWithEvents(1);
    const out: Vec3 = [0, 0, 0];
    const samplePosition: Vec3 = [0, 0, 0];
    let now = 0;
    yield () => {
      now += 0.016;
      field.sampleAt(out, samplePosition, 1, 1, now);
      return out[0];
    };
  });

  bench('10 concurrent events', function* () {
    const field = makeFieldWithEvents(10);
    const out: Vec3 = [0, 0, 0];
    const samplePosition: Vec3 = [0, 0, 0];
    let now = 0;
    yield () => {
      now += 0.016;
      field.sampleAt(out, samplePosition, 1, 1, now);
      return out[0];
    };
  });

  bench('50 concurrent events', function* () {
    const field = makeFieldWithEvents(50);
    const out: Vec3 = [0, 0, 0];
    const samplePosition: Vec3 = [0, 0, 0];
    let now = 0;
    yield () => {
      now += 0.016;
      field.sampleAt(out, samplePosition, 1, 1, now);
      return out[0];
    };
  });
});

group('ImpulseListenerNoise.update @impulse', () => {
  bench('kick only', function* () {
    const field = new ImpulseField();
    field.generate({ position: [0, 0, 0], direction: [1, 0, 0], shape: always, duration: 1000 }, 0);
    const listener = new ImpulseListenerNoise({ field });
    const out = cameraState.create();
    let now = 0;
    yield () => {
      now += 0.016;
      listener.update(out, 0.016, false, now);
      return out.position[0];
    };
  });

  bench('kick + shake', function* () {
    const field = new ImpulseField();
    field.generate({ position: [0, 0, 0], direction: [1, 0, 0], shape: always, duration: 1000 }, 0);
    const shake = new BasicMultiChannelPerlinNoise({
      positionAmplitude: [0.1, 0.1, 0.1],
      rotationAmplitude: [3, 3, 3],
    });
    const listener = new ImpulseListenerNoise({ field, channelMask: 1, gain: 1, shake });
    const out = cameraState.create();
    let now = 0;
    yield () => {
      now += 0.016;
      listener.update(out, 0.016, false, now);
      return out.position[0];
    };
  });

  bench('kick + cameraSpace', function* () {
    const field = new ImpulseField();
    field.generate({ position: [0, 0, 0], direction: [1, 0, 0], shape: always, duration: 1000 }, 0);
    const listener = new ImpulseListenerNoise({ field, channelMask: 1, gain: 1, cameraSpace: true });
    const out = cameraState.create();
    let now = 0;
    yield () => {
      now += 0.016;
      listener.update(out, 0.016, false, now);
      return out.position[0];
    };
  });
});
