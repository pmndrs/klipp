import { mount } from '@vue/test-utils';
import { PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { Aim, Body, Klipp, VirtualCamera } from '../../src/tres';

// Tres needs WebGL, so the test hands Klipp a context and a loop of its own.
const tres = vi.hoisted(() => ({
  camera: null as unknown,
  loop: [] as Array<(context: { delta: number }) => void>,
  invalidate: vi.fn(),
}));

vi.mock('@tresjs/core', async () => {
  const { computed, ref } = await import('vue');
  return {
    useTres: () => ({
      camera: computed(() => tres.camera),
      sizes: { width: ref(800), height: ref(600) },
      invalidate: tres.invalidate,
    }),
    useLoop: () => ({
      onBeforeRender: (callback: (context: { delta: number }) => void) => {
        tres.loop.push(callback);
        return { off: () => tres.loop.splice(tres.loop.indexOf(callback), 1) };
      },
    }),
  };
});

function scene() {
  const camera = new PerspectiveCamera();
  tres.camera = camera;
  tres.loop.length = 0;
  tres.invalidate.mockClear();
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(Klipp, null, () =>
          h(VirtualCamera, { name: 'follow', priority: 10 }, () => [
            h(Body.Follow, { target: [0, 0, 0], offset: [0, 3, 8] }),
            h(Aim.HardLookAt, { target: [0, 0, 0] }),
          ]),
        ),
    ),
  );
  const frame = () => {
    for (const callback of [...tres.loop]) callback({ delta: 1 / 60 });
  };
  return { camera, wrapper, frame };
}

describe('Klipp for Tres', () => {
  it('drives the Tres camera from the virtual camera on screen, with its Body and Aim', () => {
    const { camera, frame } = scene();
    frame();
    expect(camera.position.x).toBeCloseTo(0, 6);
    expect(camera.position.y).toBeCloseTo(3, 6);
    expect(camera.position.z).toBeCloseTo(8, 6);
    expect(camera.getWorldDirection(camera.position.clone()).z).toBeLessThan(0);
  });

  it('invalidates when Klipp asks for a frame, and stops listening once unmounted', () => {
    const { wrapper } = scene();
    expect(tres.invalidate).toHaveBeenCalled();

    wrapper.unmount();
    expect(tres.loop).toHaveLength(0);
  });
});
