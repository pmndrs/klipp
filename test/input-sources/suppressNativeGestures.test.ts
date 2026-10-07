import { describe, expect, it } from 'vitest';

import { suppressNativeGestures } from '../../src/input-sources/suppressNativeGestures';

function element(touchAction = '', userSelect = ''): HTMLElement {
  const el = document.createElement('div');
  el.style.touchAction = touchAction;
  el.style.userSelect = userSelect;
  return el;
}

describe('suppressNativeGestures', () => {
  it('turns off touch scrolling and selection, then restores the inline styles it found (real bug: they were cleared)', () => {
    const el = element('pan-y', 'text');
    const restore = suppressNativeGestures(el);
    expect(el.style.touchAction).toBe('none');
    expect(el.style.userSelect).toBe('none');

    restore();
    expect(el.style.touchAction).toBe('pan-y');
    expect(el.style.userSelect).toBe('text');
  });

  it('keeps them off until the last of overlapping calls restores', () => {
    const el = element('pan-y');
    const first = suppressNativeGestures(el);
    const second = suppressNativeGestures(el);

    first();
    expect(el.style.touchAction).toBe('none');
    second();
    expect(el.style.touchAction).toBe('pan-y');
  });

  it('restoring twice counts once', () => {
    const el = element('pan-y');
    const first = suppressNativeGestures(el);
    const second = suppressNativeGestures(el);

    first();
    first();
    expect(el.style.touchAction).toBe('none');
    second();
    expect(el.style.touchAction).toBe('pan-y');
  });
});
