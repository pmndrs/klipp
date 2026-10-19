import { describe, expect, it } from 'vitest';

import { BlendHints } from '../../../src/core/blend/BlendHints';

describe('BlendHints', () => {
  it('each flag is a distinct bit (no accidental overlap)', () => {
    const flags = [BlendHints.cylindricalPosition, BlendHints.sphericalPosition, BlendHints.ignoreTarget];
    const seen = new Set(flags);
    expect(seen.size).toBe(flags.length);
  });

  it('none has no flags set', () => {
    expect((BlendHints.none & BlendHints.cylindricalPosition) !== 0).toBe(false);
    expect((BlendHints.none & BlendHints.ignoreTarget) !== 0).toBe(false);
  });

  it('combining flags with | preserves each one independently', () => {
    const combined = BlendHints.cylindricalPosition | BlendHints.ignoreTarget;

    expect((combined & BlendHints.cylindricalPosition) !== 0).toBe(true);
    expect((combined & BlendHints.ignoreTarget) !== 0).toBe(true);
    expect((combined & BlendHints.sphericalPosition) !== 0).toBe(false);
  });
});
