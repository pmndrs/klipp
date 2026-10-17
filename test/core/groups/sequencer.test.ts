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

  it('blends into an instruction with its own blend, or the defaultBlend', () => {
    const p = params();
    expect(sequencer.blendInto(p, p.instructions[1])).toBe(p.instructions[1].blend);
    expect(sequencer.blendInto(p, p.instructions[0])).toBe(p.defaultBlend);
  });
});
