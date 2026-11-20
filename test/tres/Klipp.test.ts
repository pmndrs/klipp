import { useLoop } from '@tresjs/core';
import { mount } from '@vue/test-utils';
import { Object3D, PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { Aim, Body, Klipp, VirtualCamera } from '../../src/tres';

type LoopCallback = (context: { delta: number }) => void;

// Tres needs WebGL, so the test hands Klipp a context and a loop of its own.
const tres = vi.hoisted(() => ({
  camera: null as unknown,
  loop: [] as Array<{ callback: LoopCallback; priority: number }>,
  invalidate: vi.fn(),
}));

vi.mock('@tresjs/core', async () => {
  const { computed, getCurrentScope, onScopeDispose, ref } = await import('vue');
  return {
    useTres: () => ({
      camera: computed(() => tres.camera),
      sizes: { width: ref(800), height: ref(600) },
      invalidate: tres.invalidate,
    }),
    useLoop: () => ({
      onBeforeRender: (callback: LoopCallback, priority = 0) => {
        const entry = { callback, priority };
        tres.loop.push(entry);
        const off = () => {
          const index = tres.loop.indexOf(entry);
          if (index >= 0) tres.loop.splice(index, 1);
        };
        if (getCurrentScope()) onScopeDispose(off);
        return { off };
      },
    }),
  };
});

function scene(target: Object3D | [number, number, number] = [0, 0, 0], after?: () => void) {
  const camera = new PerspectiveCamera();
  tres.camera = camera;
  tres.loop.length = 0;
  tres.invalidate.mockClear();
  const SceneLogic = defineComponent(() => {
    useLoop().onBeforeRender(() => after?.());
    return () => null;
  });
  const wrapper = mount(
    defineComponent(() => () => [
      h(Klipp, null, () =>
        h(VirtualCamera, { name: 'follow', priority: 10 }, () => [
          h(Body.Follow, { target, offset: [0, 3, 8], damping: 0 }),
          h(Aim.HardLookAt, { target }),
        ]),
      ),
      h(SceneLogic),
    ]),
  );
  const frame = () => {
    const ordered = [...tres.loop].sort((a, b) => a.priority - b.priority);
    for (const { callback } of ordered) callback({ delta: 1 / 60 });
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

  it('updates after scene logic that mounts later, so the camera sees where the target is this frame', () => {
    const target = new Object3D();
    const { camera, frame } = scene(target, () => target.position.setX(5));
    frame();
    expect(camera.position.x).toBeCloseTo(5, 6);
  });

  it('invalidates when Klipp asks for a frame, and stops listening once unmounted', () => {
    const { wrapper } = scene();
    expect(tres.invalidate).toHaveBeenCalled();

    wrapper.unmount();
    expect(tres.loop).toHaveLength(0);
  });
});
