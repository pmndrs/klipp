import { describe, expect, it } from 'vitest';

import * as sequencer from '../../../src/core/groups/sequencer';
import { BlendCurves } from '../../../src/core/blend/BlendCurves';

const params = (loop = false) =>
  sequencer.createParams({
    instructions: [
      { camera: 'a', hold: 1 },
      { camera: 'b', hold: 1, blend: { curve: BlendCurves.linear, time: 0.5 } },
    ],
    loop,
  });

describe('sequencer', () => {
  it('waits for restart, then starts on the first instruction', () => {
    const state = sequencer.createState();
    expect(sequencer.update(state, params(), 1, false)).toBeNull();

    sequencer.restart(state);
    expect(sequencer.update(state, params(), 0, false)?.camera).toBe('a');
  });

  it('holds an instruction only while not blending into it, then moves on', () => {
    const state = sequencer.createState();
    sequencer.restart(state);

    expect(sequencer.update(state, params(), 5, true)?.camera).toBe('a');
    expect(sequencer.update(state, params(), 0.6, false)?.camera).toBe('a');
    expect(sequencer.update(state, params(), 0.6, false)?.camera).toBe('b');
    expect(state.held).toBe(0);
  });

  it('stays on the last instruction, or starts over with loop', () => {
    const state = sequencer.createState();
    sequencer.restart(state);
    sequencer.update(state, params(), 1, false);
    expect(sequencer.update(state, params(), 100, false)?.camera).toBe('b');

    expect(sequencer.update(state, params(true), 1, false)?.camera).toBe('a');
  });

  it('is finished once the last instruction has been held, unless it loops', () => {
    const state = sequencer.createState();
    sequencer.restart(state);
    sequencer.update(state, params(), 1, false);
    expect(sequencer.isFinished(state, params())).toBe(false);

    sequencer.update(state, params(), 1, false);
    expect(sequencer.isFinished(state, params())).toBe(true);
    expect(sequencer.isFinished(state, params(true))).toBe(false);
  });

  it('stays in range when instructions are removed', () => {
    const state = sequencer.createState();
    sequencer.restart(state);
    sequencer.update(state, params(), 1, false);
    const shorter = sequencer.createParams({ instructions: [{ camera: 'a', hold: 1 }] });
    expect(sequencer.update(state, shorter, 0, false)?.camera).toBe('a');
  });

  it('moves on from a hold of 0 only once the blend into it has finished, and never while paused', () => {
    const state = sequencer.createState();
    const zeroHolds = sequencer.createParams({
      instructions: [
        { camera: 'a', hold: 0 },
        { camera: 'b', hold: 0 },
      ],
      loop: true,
    });
    sequencer.restart(state);

    expect(sequencer.update(state, zeroHolds, 0.1, true)?.camera).toBe('a');
    expect(sequencer.update(state, { ...zeroHolds, paused: true }, 0.1, false)?.camera).toBe('a');
    expect(sequencer.update(state, zeroHolds, 0.1, false)?.camera).toBe('b');
  });

  it('keeps holding the current instruction while paused', () => {
    const state = sequencer.createState();
    sequencer.restart(state);
    const paused = { ...params(), paused: true };
    expect(sequencer.update(state, paused, 5, false)?.camera).toBe('a');
    expect(state.held).toBe(0);

    expect(sequencer.update(state, params(), 1, false)?.camera).toBe('b');
  });

  const threeSteps = (loop = false) =>
    sequencer.createParams({
      instructions: [
        { camera: 'a', hold: 1 },
        { camera: 'b', hold: 1 },
        { camera: 'c', hold: 1 },
      ],
      loop,
    });

  it('jumps to an instruction, holds it from the start and stays in range', () => {
    const state = sequencer.createState();
    sequencer.restart(state);
    sequencer.update(state, threeSteps(), 0.5, false);

    sequencer.goTo(state, threeSteps(), 2);
    expect(state).toEqual({ index: 2, held: 0 });
    sequencer.goTo(state, threeSteps(), 7);
    expect(state.index).toBe(2);
    sequencer.goTo(state, threeSteps(), -3);
    expect(state.index).toBe(0);
  });

  it('does not jump until the sequence starts', () => {
    const state = sequencer.createState();
    sequencer.goTo(state, threeSteps(), 1);
    sequencer.next(state, threeSteps(true));
    sequencer.previous(state, threeSteps(true));
    expect(state.index).toBe(-1);
  });

  it('steps forward and back, and wraps around only with loop', () => {
    const state = sequencer.createState();
    sequencer.restart(state);

    sequencer.previous(state, threeSteps());
    expect(state.index).toBe(0);
    sequencer.previous(state, threeSteps(true));
    expect(state.index).toBe(2);

    sequencer.update(state, threeSteps(), 0.5, false);
    sequencer.next(state, threeSteps());
    expect(state).toEqual({ index: 2, held: 0.5 });
    sequencer.next(state, threeSteps(true));
    expect(state).toEqual({ index: 0, held: 0 });

    sequencer.next(state, threeSteps());
    expect(state.index).toBe(1);
    sequencer.previous(state, threeSteps());
    expect(state.index).toBe(0);
  });

  it('blends into an instruction with its own blend, or the defaultBlend', () => {
    const p = params();
    expect(sequencer.blendInto(p, p.instructions[1])).toBe(p.instructions[1].blend);
    expect(sequencer.blendInto(p, p.instructions[0])).toBe(p.defaultBlend);
  });
});
