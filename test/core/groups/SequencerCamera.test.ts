import { describe, expect, it } from 'vitest';

import { BlendCurves } from '../../../src/core/blend/BlendCurves';
import { SequencerCamera } from '../../../src/core/groups/SequencerCamera';
import { Klipp } from '../../../src/core/Klipp';
import { VirtualCamera } from '../../../src/core/VirtualCamera';

function fixedAt(name: string, x: number): VirtualCamera {
  const camera = new VirtualCamera(name);
  camera.setBody({ update: (out) => void (out.position[0] = x) });
  return camera;
}

function setup() {
  const klipp = new Klipp({ defaultBlend: { curve: BlendCurves.cut, time: 0 } });
  const sequence = new SequencerCamera('cutscene', {
    instructions: [
      { camera: 'a', hold: 1 },
      { camera: 'b', hold: 1, blend: { curve: BlendCurves.linear, time: 1 } },
    ],
  });
  sequence.children.add(fixedAt('a', 1));
  sequence.children.add(fixedAt('b', 2));
  return { klipp, sequence };
}

describe('SequencerCamera', () => {
  it('cuts to the first child, holds it, then blends into the next with its blend', () => {
    const { klipp, sequence } = setup();
    klipp.add(sequence);

    klipp.update(0);
    expect(klipp.shot.position[0]).toBe(1);

    klipp.update(0.5);
    klipp.update(0.5);
    expect(klipp.shot.position[0]).toBeCloseTo(1.5, 10);

    klipp.update(0.5);
    expect(klipp.shot.position[0]).toBe(2);
    expect(sequence.children.liveCameraName).toBe('b');
    expect(sequence.isFinished).toBe(false);

    klipp.update(1);
    expect(sequence.isFinished).toBe(true);
  });

  it('waits while another camera is active, and cuts back to the start each time it becomes active', () => {
    const { klipp, sequence } = setup();
    const other = fixedAt('other', 9);
    other.priority = 10;
    sequence.standbyUpdate = 'always';
    klipp.add(other);
    klipp.add(sequence);

    klipp.update(5);
    expect(sequence.sequence.index).toBe(-1);

    other.priority = -10;
    klipp.update(0);
    klipp.update(1);
    klipp.update(1);
    expect(sequence.children.activeCameraName).toBe('b');

    other.priority = 10;
    other.priority = -10;
    klipp.update(0);
    expect(sequence.children.activeCameraName).toBe('a');
    expect(sequence.children.isBlending).toBe(false);
  });

  it('is not finished while it is not the active camera, so a finished run does not end the next one', () => {
    const { klipp, sequence } = setup();
    klipp.add(sequence);
    klipp.update(0);
    klipp.update(1);
    klipp.update(1);
    klipp.update(1);
    expect(sequence.isFinished).toBe(true);

    sequence.active = false;
    expect(sequence.isFinished).toBe(false);
  });

  it('jumps to a step with the blend into it, and holds it from the start', () => {
    const { klipp, sequence } = setup();
    klipp.add(sequence);
    klipp.update(0);

    sequence.next();
    klipp.update(0.5);
    expect(sequence.children.activeCameraName).toBe('b');
    expect(klipp.shot.position[0]).toBeCloseTo(1.5, 10);

    klipp.update(0.5);
    sequence.previous();
    klipp.update(0);
    expect(sequence.children.activeCameraName).toBe('a');
    expect(sequence.sequence).toEqual({ index: 0, held: 0 });

    sequence.goTo(1);
    expect(sequence.sequence.index).toBe(1);
  });

  it('cuts back to the first step on restart, and does not start before it runs', () => {
    const { klipp, sequence } = setup();
    sequence.restart();
    expect(sequence.sequence.index).toBe(-1);

    klipp.add(sequence);
    klipp.update(0);
    klipp.update(1);
    klipp.update(1);
    expect(sequence.children.liveCameraName).toBe('b');

    sequence.restart();
    klipp.update(0);
    expect(sequence.children.liveCameraName).toBe('a');
    expect(sequence.children.isBlending).toBe(false);
    expect(klipp.shot.position[0]).toBe(1);
  });

  it('finishes the blend into a step with a hold of 0 before moving on', () => {
    const { klipp, sequence } = setup();
    sequence.instructions = [
      { camera: 'a', hold: 1 },
      { camera: 'b', hold: 0, blend: { curve: BlendCurves.linear, time: 1 } },
      { camera: 'c', hold: 1, blend: { curve: BlendCurves.cut, time: 0 } },
    ];
    sequence.children.add(fixedAt('c', 3));
    klipp.add(sequence);

    klipp.update(0);
    klipp.update(0.5);
    klipp.update(0.5);
    klipp.update(0.25);
    expect(sequence.children.activeCameraName).toBe('b');
    expect(klipp.shot.position[0]).toBeCloseTo(1.75, 10);

    klipp.update(0.25);
    klipp.update(0);
    expect(sequence.children.activeCameraName).toBe('c');
    expect(klipp.shot.position[0]).toBe(3);
  });

  it('stays on its step while paused', () => {
    const { klipp, sequence } = setup();
    sequence.paused = true;
    klipp.add(sequence);
    klipp.update(0);
    klipp.update(10);
    expect(sequence.children.activeCameraName).toBe('a');

    sequence.paused = false;
    klipp.update(1);
    expect(sequence.children.activeCameraName).toBe('b');
  });

  it('shows its first step on the frame a parent group switches to it', () => {
    const klipp = new Klipp({ defaultBlend: { curve: BlendCurves.cut, time: 0 } });
    const outer = new SequencerCamera('outer', {
      defaultBlend: { curve: BlendCurves.cut, time: 0 },
      instructions: [
        { camera: 'intro', hold: 1 },
        { camera: 'inner', hold: 1 },
      ],
    });
    const inner = new SequencerCamera('inner', { instructions: [{ camera: 'a', hold: 1 }] });
    inner.children.add(fixedAt('a', 1));
    outer.children.add(fixedAt('intro', 9));
    outer.children.add(inner);
    klipp.add(outer);

    klipp.update(0);
    klipp.update(1);
    expect(outer.children.activeCameraName).toBe('inner');
    expect(klipp.shot.position[0]).toBe(1);
  });
});
