import { describe, expect, it } from 'vitest';

import * as buttonInput from '../../../src/dom/sources/buttonInput';

const sorted = <T>(set: Set<T>): T[] => [...set].sort();

describe('buttonInput', () => {
  it('a press is held until released, and "just" only in the frame it happened', () => {
    const buttons = buttonInput.create<string>();
    buttonInput.press(buttons, 'a');
    expect(buttons.pressed.has('a')).toBe(true);
    expect(buttons.justPressed.has('a')).toBe(true);

    buttonInput.clear(buttons);
    expect(buttons.pressed.has('a')).toBe(true);
    expect(buttons.justPressed.has('a')).toBe(false);

    buttonInput.release(buttons, 'a');
    expect(buttons.pressed.has('a')).toBe(false);
    expect(buttons.justReleased.has('a')).toBe(true);

    buttonInput.clear(buttons);
    expect(buttons.justReleased.has('a')).toBe(false);
  });

  it('pressing a held button again is not a new press, so key repeat needs no filtering', () => {
    const buttons = buttonInput.create<string>();
    buttonInput.press(buttons, 'a');
    buttonInput.clear(buttons);
    buttonInput.press(buttons, 'a');
    expect(buttons.justPressed.has('a')).toBe(false);
  });

  it('releasing a button that is not held does nothing', () => {
    const buttons = buttonInput.create<string>();
    buttonInput.release(buttons, 'a');
    expect(buttons.justReleased.size).toBe(0);
  });

  it('a press and release within one frame reports both, with nothing left held', () => {
    const buttons = buttonInput.create<string>();
    buttonInput.press(buttons, 'a');
    buttonInput.release(buttons, 'a');
    expect(buttons.pressed.has('a')).toBe(false);
    expect(buttons.justPressed.has('a')).toBe(true);
    expect(buttons.justReleased.has('a')).toBe(true);
  });

  it('releaseAll releases every held button and only those', () => {
    const buttons = buttonInput.create<string>();
    buttonInput.press(buttons, 'a');
    buttonInput.press(buttons, 'b');
    buttonInput.clear(buttons);
    buttonInput.releaseAll(buttons);
    expect(buttons.pressed.size).toBe(0);
    expect(sorted(buttons.justReleased)).toEqual(['a', 'b']);
  });
});
