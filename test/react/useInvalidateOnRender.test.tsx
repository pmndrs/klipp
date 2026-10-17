import { useThree } from '@react-three/fiber';
import { create } from '@react-three/test-renderer';
import { describe, expect, it, vi, type MockInstance } from 'vitest';

import { Follow } from '../../src/react/body/Follow';
import { Klipp } from '../../src/react/Klipp';
import { VirtualCamera } from '../../src/react/VirtualCamera';

describe('useInvalidateOnRender', () => {
  it('requests a frame when a piece prop changes and when the piece unmounts', async () => {
    let invalidate: MockInstance | undefined;

    function Scene({ distance, mounted = true }: { distance: number; mounted?: boolean }) {
      const state = useThree();
      invalidate ??= vi.spyOn(state, 'invalidate');
      return (
        <Klipp>
          <VirtualCamera name="a">{mounted && <Follow target={[0, 0, 0]} offset={[0, 0, distance]} />}</VirtualCamera>
        </Klipp>
      );
    }

    const renderer = await create(<Scene distance={5} />);

    invalidate!.mockClear();
    await renderer.update(<Scene distance={8} />);
    expect(invalidate).toHaveBeenCalled();

    invalidate!.mockClear();
    await renderer.update(<Scene distance={8} mounted={false} />);
    expect(invalidate).toHaveBeenCalled();
  });
});
