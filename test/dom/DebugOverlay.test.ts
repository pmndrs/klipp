import { afterEach, describe, expect, it } from 'vitest';

import { DebugOverlay } from '../../src/dom/DebugOverlay';

afterEach(() => {
  document.body.replaceChildren();
});

function setup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const overlay = new DebugOverlay();
  overlay.connect(container);
  const root = () => container.firstElementChild as HTMLDivElement | null;
  return { container, overlay, root };
}

describe('DebugOverlay', () => {
  it('adds one non-interactive root to the container on connect', () => {
    const { container, root } = setup();
    expect(container.children).toHaveLength(1);
    expect(root()!.style.pointerEvents).toBe('none');
  });

  it('injects its default stylesheet once', () => {
    setup();
    new DebugOverlay().connect(document.body);
    expect(document.querySelectorAll('#klipp-debug-zone-overlay-styles')).toHaveLength(1);
  });

  it('replaces what is drawn on every render', () => {
    const { overlay, root } = setup();
    overlay.render([{ screenPosition: [0, 0], size: [0.4, 0.4], kind: 'deadZone' }], [0, 0]);
    expect(root()!.children).toHaveLength(3);

    overlay.render([{ screenPosition: [0, 0], size: [0.4, 0.4], kind: 'hardLimit' }]);
    expect(root()!.children).toHaveLength(1);
    expect(root()!.children[0].className).toBe('klipp-debug-hardlimit');

    overlay.render([]);
    expect(root()!.children).toHaveLength(0);
  });

  it('removes its root on disconnect and ignores renders until reconnected', () => {
    const { container, overlay } = setup();
    overlay.disconnect();
    expect(container.children).toHaveLength(0);

    overlay.render([{ screenPosition: [0, 0], size: [0.4, 0.4], kind: 'deadZone' }]);
    expect(container.children).toHaveLength(0);
  });

  it('draws in the part of the container the insets leave free, also after connecting again', () => {
    const { container, overlay, root } = setup();
    expect(root()!.style).toMatchObject({ top: '0px', right: '0px', bottom: '0px', left: '0px' });

    overlay.setInsets({ left: 200, bottom: 300 });
    expect(root()!.style).toMatchObject({ top: '0px', right: '0px', bottom: '300px', left: '200px' });

    overlay.connect(container);
    expect(root()!.style).toMatchObject({ bottom: '300px', left: '200px' });
  });

  it('moves to a new container when connected again', () => {
    const { container, overlay } = setup();
    const other = document.createElement('div');
    overlay.connect(other);
    expect(container.children).toHaveLength(0);
    expect(other.children).toHaveLength(1);
  });
});
